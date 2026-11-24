using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Dtos;
using CorseWeb.Server.Helpers;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Controllers;

[ApiController]
[Route("api/enrollments")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EnrollmentsController(AppDbContext db)
    {
        _db = db;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> MyEnrollments()
    {
        var enrollments = await _db.Enrollments
            .Where(enrollment => enrollment.UserId == UserId)
            .OrderByDescending(enrollment => enrollment.LastAccessedAt)
            .ToListAsync();

        var enrollmentIds = enrollments.Select(enrollment => enrollment.Id).ToArray();
        var courseIds = enrollments.Select(enrollment => enrollment.CourseId).Distinct().ToArray();

        var courses = await _db.Courses
            .Where(course => courseIds.Contains(course.Id))
            .ToDictionaryAsync(course => course.Id);

        var completions = enrollmentIds.Length == 0
            ? new List<CourseLessonCompletion>()
            : await _db.CourseLessonCompletions
                .Where(completion => enrollmentIds.Contains(completion.EnrollmentId))
                .ToListAsync();
        var quizAttempts = enrollmentIds.Length == 0
            ? new List<CourseQuizAttempt>()
            : await _db.CourseQuizAttempts
                .Where(attempt => enrollmentIds.Contains(attempt.EnrollmentId))
                .ToListAsync();
        var exerciseAttempts = enrollmentIds.Length == 0
            ? new List<CourseExerciseAttempt>()
            : await _db.CourseExerciseAttempts
                .Where(attempt => enrollmentIds.Contains(attempt.EnrollmentId))
                .ToListAsync();
        var certificates = enrollmentIds.Length == 0
            ? new List<CourseCertificate>()
            : await _db.CourseCertificates
                .Where(certificate => enrollmentIds.Contains(certificate.EnrollmentId))
                .ToListAsync();
        var scriptExecutions = enrollmentIds.Length == 0
            ? new List<CourseScriptExecution>()
            : await _db.CourseScriptExecutions
                .Where(execution => enrollmentIds.Contains(execution.EnrollmentId)
                    && execution.ScriptId == CourseScriptExecution.EventMarkerScriptId)
                .ToListAsync();

        var completionsByEnrollment = completions
            .GroupBy(completion => completion.EnrollmentId)
            .ToDictionary(group => group.Key, group => (IReadOnlyCollection<CourseLessonCompletion>)group.ToArray());
        var quizAttemptsByEnrollment = quizAttempts
            .GroupBy(attempt => attempt.EnrollmentId)
            .ToDictionary(group => group.Key, group => (IReadOnlyCollection<CourseQuizAttempt>)group.ToArray());
        var exerciseAttemptsByEnrollment = exerciseAttempts
            .GroupBy(attempt => attempt.EnrollmentId)
            .ToDictionary(group => group.Key, group => (IReadOnlyCollection<CourseExerciseAttempt>)group.ToArray());
        var certificatesByEnrollment = certificates
            .GroupBy(certificate => certificate.EnrollmentId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.IssuedAt).First(), StringComparer.Ordinal);
        var scriptExecutionsByEnrollment = scriptExecutions
            .GroupBy(execution => execution.EnrollmentId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => (IReadOnlyCollection<CourseScriptExecution>)group.ToArray(), StringComparer.Ordinal);

        return Ok(enrollments.Select(enrollment =>
        {
            courses.TryGetValue(enrollment.CourseId, out var course);
            completionsByEnrollment.TryGetValue(enrollment.Id, out var enrollmentCompletions);
            quizAttemptsByEnrollment.TryGetValue(enrollment.Id, out var enrollmentQuizAttempts);
            exerciseAttemptsByEnrollment.TryGetValue(enrollment.Id, out var enrollmentExerciseAttempts);
            certificatesByEnrollment.TryGetValue(enrollment.Id, out var enrollmentCertificate);
            scriptExecutionsByEnrollment.TryGetValue(enrollment.Id, out var enrollmentScriptExecutions);
            return EnrollmentProgressProjector.ToDto(
                enrollment,
                course,
                enrollmentCompletions ?? [],
                enrollmentQuizAttempts ?? [],
                enrollmentExerciseAttempts ?? [],
                enrollmentCertificate,
                enrollmentScriptExecutions ?? []);
        }));
    }

    [HttpPost("{courseId}")]
    public async Task<IActionResult> Enroll(string courseId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null) return NotFound(new { error = "Curso não encontrado" });
        if (course.Status != "publicado") return BadRequest(new { error = "Curso não publicado" });

        var existing = await _db.Enrollments
            .FirstOrDefaultAsync(enrollment => enrollment.UserId == UserId && enrollment.CourseId == course.Id);
        if (existing != null)
            return Ok(await BuildEnrollmentDtoAsync(existing, course));

        var now = DateTime.UtcNow;
        var enrollment = new CourseEnrollment
        {
            UserId = UserId,
            CourseId = course.Id,
            EnrolledAt = now,
            LastAccessedAt = now,
            OverallPercent = 0,
            ModulesProgressJson = "[]"
        };

        _db.Enrollments.Add(enrollment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(MyEnrollments),
            new { courseId = course.Id },
            await BuildEnrollmentDtoAsync(enrollment, course));
    }

    /// <summary>
    /// Updates navigation state only. Completion, module progress and percentages
    /// are projected from server-side completion records and are never accepted here.
    /// </summary>
    [HttpPut("{courseId}/progress")]
    public async Task<IActionResult> UpdateProgress(string courseId, [FromBody] ProgressUpdateDto dto)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null || course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        if (dto.CurrentLessonId != null)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentLessonId)
                || !EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, dto.CurrentLessonId))
            {
                return BadRequest(new { error = "Aula não publicada ou não pertencente ao curso" });
            }

            enrollment.CurrentLessonId = dto.CurrentLessonId;
            _ = await CorseLightEventRunner.ExecuteAsync(
                _db, course, enrollment, dto.CurrentLessonId,
                "lesson.start", dto.CurrentLessonId);
        }

        enrollment.LastAccessedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }

    /// <summary>
    /// Records the student's explicit completion action for a published lesson.
    /// The server validates membership/publication and stores the completion timestamp.
    /// </summary>
    [HttpPost("{courseId}/lessons/{lessonId}/complete")]
    public async Task<IActionResult> CompleteLesson(string courseId, string lessonId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null || course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        if (!EnrollmentProgressProjector.IsPublishedLesson(course.ModulesJson, lessonId))
            return NotFound(new { error = "Aula publicada não encontrada neste curso" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        var lessonQuizAttempts = await _db.CourseQuizAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id && attempt.LessonId == lessonId)
            .ToListAsync();
        var lessonExerciseAttempts = await _db.CourseExerciseAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id && attempt.LessonId == lessonId)
            .ToListAsync();
        var activityResults = lessonQuizAttempts
            .GroupBy(attempt => attempt.QuizNodeId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.CompletedAt).First().Passed, StringComparer.Ordinal);
        foreach (var attempt in lessonExerciseAttempts
                     .GroupBy(item => item.ExerciseNodeId, StringComparer.Ordinal)
                     .Select(group => group.OrderByDescending(item => item.CompletedAt).First()))
        {
            activityResults[attempt.ExerciseNodeId] = attempt.Passed;
        }

        var requiredActivityIds = CourseQuizEvaluator.GetPublishedQuizNodeIds(
                course.ModulesJson, lessonId, activityResults)
            .Concat(CourseQuizEvaluator.GetPublishedExerciseNodeIds(
                course.ModulesJson, lessonId, activityResults))
            .ToHashSet(StringComparer.Ordinal);
        var answeredActivityIds = lessonQuizAttempts.Select(attempt => attempt.QuizNodeId)
            .Concat(lessonExerciseAttempts.Select(attempt => attempt.ExerciseNodeId))
            .ToHashSet(StringComparer.Ordinal);
        if (requiredActivityIds.Except(answeredActivityIds, StringComparer.Ordinal).Any())
            return Conflict(new { error = "Responda a todos os Quizzes e Exercícios disponíveis neste caminho antes de concluir a aula." });

        var completionExists = await _db.CourseLessonCompletions.AnyAsync(record =>
            record.EnrollmentId == enrollment.Id && record.LessonId == lessonId);

        if (!completionExists)
        {
            _ = await CorseLightEventRunner.ExecuteAsync(
                _db, course, enrollment, lessonId,
                "lesson.finish", lessonId);

            var completion = new CourseLessonCompletion
            {
                EnrollmentId = enrollment.Id,
                LessonId = lessonId,
                CompletedAt = DateTime.UtcNow
            };

            _db.CourseLessonCompletions.Add(completion);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // A unique index makes simultaneous duplicate requests idempotent.
                _db.Entry(completion).State = EntityState.Detached;
                var wasRecorded = await _db.CourseLessonCompletions.AnyAsync(record =>
                    record.EnrollmentId == enrollment.Id && record.LessonId == lessonId);
                if (!wasRecorded) throw;
                DetachScriptChanges();
                _ = await CorseLightEventRunner.ExecuteAsync(
                    _db, course, enrollment, lessonId,
                    "lesson.finish", lessonId);
            }
        }

        enrollment.CurrentLessonId = lessonId;
        enrollment.LastAccessedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }

    /// <summary>
    /// Evaluates one single-choice Quiz answer and permanently records the outcome
    /// for this student's enrollment, lesson and Quiz card.
    /// </summary>
    [HttpPost("{courseId}/lessons/{lessonId}/quizzes/{quizNodeId}/attempt")]
    public async Task<IActionResult> SubmitQuizAttempt(
        string courseId,
        string lessonId,
        string quizNodeId,
        [FromBody] QuizAttemptRequestDto dto)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null || course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        var priorAttempts = await _db.CourseQuizAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id && attempt.LessonId == lessonId)
            .ToListAsync();
        var priorExerciseAttempts = await _db.CourseExerciseAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id && attempt.LessonId == lessonId)
            .ToListAsync();
        var activityResults = priorAttempts
            .GroupBy(attempt => attempt.QuizNodeId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.CompletedAt).First().Passed, StringComparer.Ordinal);
        foreach (var priorExerciseAttempt in priorExerciseAttempts
                     .GroupBy(item => item.ExerciseNodeId, StringComparer.Ordinal)
                     .Select(group => group.OrderByDescending(item => item.CompletedAt).First()))
        {
            activityResults[priorExerciseAttempt.ExerciseNodeId] = priorExerciseAttempt.Passed;
        }
        var availableQuizIds = CourseQuizEvaluator.GetPublishedQuizNodeIds(
            course.ModulesJson, lessonId, activityResults);
        if (!availableQuizIds.Contains(quizNodeId, StringComparer.Ordinal))
            return NotFound(new { error = "Este Quiz ainda não está disponível no caminho atual." });

        var definition = CourseQuizEvaluator.FindPublishedQuiz(course.ModulesJson, lessonId, quizNodeId);
        if (definition == null)
            return NotFound(new { error = "Quiz publicado não encontrado nesta aula" });
        if (dto.SelectedOptionIndex < 0 || dto.SelectedOptionIndex >= definition.Options.Count)
            return BadRequest(new { error = "A opção selecionada é inválida" });

        var existing = priorAttempts.FirstOrDefault(attempt => attempt.QuizNodeId == quizNodeId);
        if (existing != null)
        {
            if (existing.SelectedOptionIndex != dto.SelectedOptionIndex)
                return Conflict(new { error = "Este Quiz já foi respondido nesta matrícula." });
            return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
        }

        var isCorrect = CourseQuizEvaluator.IsCorrect(definition, dto.SelectedOptionIndex);
        var completedAt = DateTime.UtcNow;
        var attempt = new CourseQuizAttempt
        {
            EnrollmentId = enrollment.Id,
            LessonId = lessonId,
            QuizNodeId = quizNodeId,
            SelectedOptionIndex = dto.SelectedOptionIndex,
            IsCorrect = isCorrect,
            Passed = isCorrect,
            Score = isCorrect ? 100 : 0,
            CompletedAt = completedAt
        };

        enrollment.CurrentLessonId = lessonId;
        enrollment.LastAccessedAt = completedAt;
        _db.CourseQuizAttempts.Add(attempt);
        _ = await CorseLightEventRunner.ExecuteAsync(
            _db, course, enrollment, lessonId,
            "activity.submit", quizNodeId,
            activityAnswer: (double)dto.SelectedOptionIndex,
            activityIsCorrect: isCorrect);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // The unique index arbitrates simultaneous attempts on the same Quiz.
            _db.Entry(attempt).State = EntityState.Detached;
            var persisted = await _db.CourseQuizAttempts.FirstOrDefaultAsync(item =>
                item.EnrollmentId == enrollment.Id
                && item.LessonId == lessonId
                && item.QuizNodeId == quizNodeId);
            if (persisted == null) throw;
            if (persisted.SelectedOptionIndex != dto.SelectedOptionIndex)
                return Conflict(new { error = "Este Quiz já foi respondido nesta matrícula." });
        }

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }

    /// <summary>
    /// Evaluates a text/code submission against the private reference solution.
    /// User-provided code is never compiled or executed by the API.
    /// </summary>
    [HttpPost("{courseId}/lessons/{lessonId}/exercises/{exerciseNodeId}/attempt")]
    public async Task<IActionResult> SubmitExerciseAttempt(
        string courseId,
        string lessonId,
        string exerciseNodeId,
        [FromBody] ExerciseAttemptRequestDto dto)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null || course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        if (string.IsNullOrWhiteSpace(dto.Answer))
            return BadRequest(new { error = "Envie uma resposta antes de corrigir o Exercício." });
        if (dto.Answer.Length > CourseExerciseEvaluator.MaxAnswerLength)
            return BadRequest(new { error = $"A resposta excede o limite de {CourseExerciseEvaluator.MaxAnswerLength} caracteres." });

        var priorQuizAttempts = await _db.CourseQuizAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id && attempt.LessonId == lessonId)
            .ToListAsync();
        var priorExerciseAttempts = await _db.CourseExerciseAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id && attempt.LessonId == lessonId)
            .ToListAsync();

        var activityResults = priorQuizAttempts
            .GroupBy(attempt => attempt.QuizNodeId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.CompletedAt).First().Passed, StringComparer.Ordinal);
        foreach (var priorExerciseAttempt in priorExerciseAttempts
                     .GroupBy(item => item.ExerciseNodeId, StringComparer.Ordinal)
                     .Select(group => group.OrderByDescending(item => item.CompletedAt).First()))
        {
            activityResults[priorExerciseAttempt.ExerciseNodeId] = priorExerciseAttempt.Passed;
        }

        var reachableExerciseIds = CourseQuizEvaluator.GetPublishedExerciseNodeIds(
            course.ModulesJson, lessonId, activityResults);
        if (!reachableExerciseIds.Contains(exerciseNodeId, StringComparer.Ordinal))
            return NotFound(new { error = "Este Exercício ainda não está disponível no caminho atual." });

        var definition = CourseExerciseEvaluator.FindPublishedExercise(
            course.ModulesJson, lessonId, exerciseNodeId);
        if (definition == null)
            return NotFound(new { error = "Exercício publicado não encontrado nesta aula." });

        var existing = priorExerciseAttempts.FirstOrDefault(item => item.ExerciseNodeId == exerciseNodeId);
        if (existing != null)
        {
            if (!string.Equals(
                CourseExerciseEvaluator.NormalizeAnswer(existing.SubmittedAnswer),
                CourseExerciseEvaluator.NormalizeAnswer(dto.Answer),
                StringComparison.Ordinal))
            {
                return Conflict(new { error = "Este Exercício já foi respondido nesta matrícula." });
            }
            return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
        }

        var isCorrect = CourseExerciseEvaluator.IsCorrect(definition, dto.Answer);
        var completedAt = DateTime.UtcNow;
        var attempt = new CourseExerciseAttempt
        {
            EnrollmentId = enrollment.Id,
            LessonId = lessonId,
            ExerciseNodeId = exerciseNodeId,
            SubmittedAnswer = dto.Answer,
            IsCorrect = isCorrect,
            Passed = isCorrect,
            Score = isCorrect ? 100 : 0,
            CompletedAt = completedAt
        };

        enrollment.CurrentLessonId = lessonId;
        enrollment.LastAccessedAt = completedAt;
        _db.CourseExerciseAttempts.Add(attempt);
        _ = await CorseLightEventRunner.ExecuteAsync(
            _db, course, enrollment, lessonId,
            "activity.submit", exerciseNodeId,
            activityAnswer: dto.Answer,
            activityIsCorrect: isCorrect);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // The unique index arbitrates simultaneous submissions for one Exercise.
            _db.Entry(attempt).State = EntityState.Detached;
            var persisted = await _db.CourseExerciseAttempts.FirstOrDefaultAsync(item =>
                item.EnrollmentId == enrollment.Id
                && item.LessonId == lessonId
                && item.ExerciseNodeId == exerciseNodeId);
            if (persisted == null) throw;
            if (!string.Equals(
                CourseExerciseEvaluator.NormalizeAnswer(persisted.SubmittedAnswer),
                CourseExerciseEvaluator.NormalizeAnswer(dto.Answer),
                StringComparison.Ordinal))
            {
                return Conflict(new { error = "Este Exercício já foi respondido nesta matrícula." });
            }
        }

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }


    /// <summary>
    /// Issues one immutable course-completion certificate after every currently
    /// published lesson has a server-recorded completion event.
    /// </summary>
    [HttpPost("{courseId}/certificate")]
    public async Task<IActionResult> IssueCertificate(string courseId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null) return NotFound(new { error = "Curso não encontrado" });

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound(new { error = "Matrícula não encontrada" });

        // An issued certificate remains available even if the course is archived later.
        var existing = await _db.CourseCertificates
            .FirstOrDefaultAsync(item => item.EnrollmentId == enrollment.Id);
        if (existing != null)
            return Ok(await BuildEnrollmentDtoAsync(enrollment, course));

        if (course.Status != "publicado")
            return NotFound(new { error = "Curso publicado não encontrado" });

        var completions = await _db.CourseLessonCompletions
            .Where(record => record.EnrollmentId == enrollment.Id)
            .ToListAsync();
        var progress = EnrollmentProgressProjector.ToDto(enrollment, course, completions);
        if (progress.CompletedAt is not DateTime courseCompletedAt)
            return Conflict(new { error = "Conclua todas as aulas publicadas antes de emitir o certificado." });

        var student = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == UserId);
        if (student == null) return Unauthorized();

        var certificate = new CourseCertificate
        {
            EnrollmentId = enrollment.Id,
            CourseId = course.Id,
            VerificationCode = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)),
            StudentName = string.IsNullOrWhiteSpace(student.Name) ? student.Email : student.Name.Trim(),
            CourseTitle = course.Title,
            AuthorName = course.AuthorName,
            CourseVersion = course.Version,
            CourseCompletedAt = courseCompletedAt,
            IssuedAt = DateTime.UtcNow
        };

        _db.CourseCertificates.Add(certificate);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Concurrent requests for the same enrollment converge on one certificate.
            _db.Entry(certificate).State = EntityState.Detached;
            var wasIssued = await _db.CourseCertificates.AnyAsync(item =>
                item.EnrollmentId == enrollment.Id);
            if (!wasIssued) throw;
        }

        return Ok(await BuildEnrollmentDtoAsync(enrollment, course));
    }

    [HttpDelete("{courseId}")]
    public async Task<IActionResult> Unenroll(string courseId)
    {
        var course = await FindCourseAsync(courseId);
        if (course == null) return NotFound();

        var enrollment = await _db.Enrollments
            .FirstOrDefaultAsync(item => item.UserId == UserId && item.CourseId == course.Id);
        if (enrollment == null) return NotFound();

        _db.Enrollments.Remove(enrollment);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private void DetachScriptChanges()
    {
        foreach (var entry in _db.ChangeTracker.Entries<CourseScriptState>().ToArray())
            _db.Entry(entry.Entity).State = EntityState.Detached;
        foreach (var entry in _db.ChangeTracker.Entries<CourseScriptExecution>().ToArray())
            _db.Entry(entry.Entity).State = EntityState.Detached;
    }

    private Task<Course?> FindCourseAsync(string courseId)
    {
        return _db.Courses.FirstOrDefaultAsync(course =>
            course.Id == courseId || course.Slug == courseId);
    }

    private async Task<EnrollmentDto> BuildEnrollmentDtoAsync(CourseEnrollment enrollment, Course course)
    {
        var completions = await _db.CourseLessonCompletions
            .Where(record => record.EnrollmentId == enrollment.Id)
            .ToListAsync();

        var quizAttempts = await _db.CourseQuizAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id)
            .ToListAsync();
        var exerciseAttempts = await _db.CourseExerciseAttempts
            .Where(attempt => attempt.EnrollmentId == enrollment.Id)
            .ToListAsync();
        var certificate = await _db.CourseCertificates
            .FirstOrDefaultAsync(item => item.EnrollmentId == enrollment.Id);
        var scriptExecutions = await _db.CourseScriptExecutions
            .Where(execution => execution.EnrollmentId == enrollment.Id
                && execution.ScriptId == CourseScriptExecution.EventMarkerScriptId)
            .ToListAsync();

        return EnrollmentProgressProjector.ToDto(
            enrollment, course, completions, quizAttempts, exerciseAttempts, certificate, scriptExecutions);
    }
}
