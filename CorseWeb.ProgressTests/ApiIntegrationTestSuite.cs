using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CorseWeb.Server.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;

public static class ApiIntegrationTestSuite
{
    private const string ConnectionString =
        "Data Source=CorseWebApiIntegrationTests;Mode=Memory;Cache=Shared;Foreign Keys=True";

    public static async Task RunAsync(Action<bool, string> assert)
    {
        using var factory = new ApiTestApplicationFactory();
        using var anonymous = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        var protectedResponse = await anonymous.GetAsync("/api/enrollments");
        assert(protectedResponse.StatusCode == HttpStatusCode.Unauthorized,
            "Protected enrollment routes must reject anonymous requests.");

        var owner = await RegisterAsync(anonymous, "owner@corseweb.test", "Owner account");
        assert(owner.Role == "user", "A standard registration must receive the user role.");

        var meResponse = await anonymous.GetAsync("/api/auth/me");
        assert(meResponse.StatusCode == HttpStatusCode.OK,
            "The registration response must establish an authenticated cookie session.");

        var duplicateRegistration = await anonymous.PostAsJsonAsync("/api/auth/register", new
        {
            name = "Duplicate",
            email = "owner@corseweb.test",
            password = "StrongPassword123!"
        });
        assert(duplicateRegistration.StatusCode == HttpStatusCode.Conflict,
            "The API must reject duplicate account emails.");

        using var wrongPasswordClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        var wrongPassword = await wrongPasswordClient.PostAsJsonAsync("/api/auth/local-login", new
        {
            email = "owner@corseweb.test",
            password = "WrongPassword123!"
        });
        assert(wrongPassword.StatusCode == HttpStatusCode.Unauthorized,
            "Local login must reject an incorrect password.");

        using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        var admin = await RegisterAsync(adminClient, "admin@corseweb.test", "Administrator");
        assert(admin.Role == "admin",
            "The server must derive the admin role from its configured AdminEmails list.");

        using var studentClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        await RegisterAsync(studentClient, "student@corseweb.test", "Student");

        using var outsiderClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        await RegisterAsync(outsiderClient, "outsider@corseweb.test", "Outsider");

        using var quizFailureClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        await RegisterAsync(quizFailureClient, "quiz-failure@corseweb.test", "Quiz failure student");

        using var exerciseFailureClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        await RegisterAsync(exerciseFailureClient, "exercise-failure@corseweb.test", "Exercise failure student");

        const string coursePayload = """
        {
          "title": "Curso de integração",
          "subtitle": "Curso para testes HTTP",
          "description": "Descrição suficientemente longa para passar pela validação do curso.",
          "category": "Tecnologia",
          "tags": [],
          "level": "Iniciante",
          "language": "pt-BR",
          "thumbnail": null,
          "modules": [
            {
              "id": "module-one",
              "title": "Módulo 1",
              "isPublished": true,
              "lessons": [
                {
                  "id": "lesson-one",
                  "title": "Aula 1",
                  "isPublished": true,
                  "estimatedMinutes": 5,
                  "nodes": [
                    {
                      "id": "start",
                      "type": "start",
                      "x": 0, "y": 0, "width": 120, "height": 80,
                      "props": {},
                      "inputs": [],
                      "outputs": [{ "id": "complete", "label": "Iniciar" }]
                    },
                    {
                      "id": "quiz-one",
                      "type": "quiz",
                      "x": 200, "y": 0, "width": 384, "height": 216,
                      "props": {
                        "question": "Quanto é 2 + 2?",
                        "options": ["4", "5"],
                        "correctIndex": 0,
                        "explanation": "Quatro é a soma de dois mais dois."
                      },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [
                        { "id": "success", "label": "Aprovado" },
                        { "id": "failed", "label": "Reprovado" }
                      ]
                    },
                    {
                      "id": "passed-node",
                      "type": "paragraph",
                      "x": 700, "y": 0, "width": 288, "height": 120,
                      "props": { "content": "Conteúdo liberado após aprovação." },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [{ "id": "complete", "label": "Concluído" }]
                    },
                    {
                      "id": "nested-quiz",
                      "type": "quiz",
                      "x": 1080, "y": 0, "width": 384, "height": 216,
                      "props": {
                        "question": "Qual linguagem é tipada?",
                        "options": ["Python", "JavaScript"],
                        "correctIndex": 0
                      },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [
                        { "id": "success", "label": "Aprovado" },
                        { "id": "failed", "label": "Reprovado" }
                      ]
                    },
                    {
                      "id": "nested-passed-node",
                      "type": "paragraph",
                      "x": 1550, "y": 0, "width": 288, "height": 120,
                      "props": { "content": "Segundo nível aprovado." },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [{ "id": "complete", "label": "Concluído" }]
                    },
                    {
                      "id": "exercise-one",
                      "type": "exercise",
                      "x": 1980, "y": 0, "width": 384, "height": 216,
                      "props": {
                        "instruction": "Escreva o comando que exibe a mensagem informada.",
                        "starterCode": "print('Sua mensagem')",
                        "solution": "print(\"CorseWeb funciona!\")"
                      },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [
                        { "id": "success", "label": "Aprovado" },
                        { "id": "failed", "label": "Reprovado" }
                      ]
                    },
                    {
                      "id": "exercise-passed-node",
                      "type": "paragraph",
                      "x": 2450, "y": 0, "width": 288, "height": 120,
                      "props": { "content": "Exercício resolvido corretamente." },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [{ "id": "complete", "label": "Concluído" }]
                    },
                    {
                      "id": "exercise-failed-node",
                      "type": "paragraph",
                      "x": 2450, "y": 180, "width": 288, "height": 120,
                      "props": { "content": "Exercício precisa de revisão." },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [{ "id": "complete", "label": "Concluído" }]
                    },
                    {
                      "id": "nested-failed-node",
                      "type": "paragraph",
                      "x": 1550, "y": 180, "width": 288, "height": 120,
                      "props": { "content": "Segundo nível reprovado." },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [{ "id": "complete", "label": "Concluído" }]
                    },
                    {
                      "id": "failed-node",
                      "type": "paragraph",
                      "x": 700, "y": 180, "width": 288, "height": 120,
                      "props": { "content": "Conteúdo liberado após reprovação." },
                      "inputs": [{ "id": "enter", "label": "Entrada" }],
                      "outputs": [{ "id": "complete", "label": "Concluído" }]
                    }
                  ],
                  "connections": [
                    { "id": "start-quiz", "sourceNode": "start", "sourcePort": "complete", "targetNode": "quiz-one", "targetPort": "enter" },
                    { "id": "quiz-passed", "sourceNode": "quiz-one", "sourcePort": "success", "targetNode": "passed-node", "targetPort": "enter" },
                    { "id": "passed-nested-quiz", "sourceNode": "passed-node", "sourcePort": "complete", "targetNode": "nested-quiz", "targetPort": "enter" },
                    { "id": "nested-quiz-passed", "sourceNode": "nested-quiz", "sourcePort": "success", "targetNode": "nested-passed-node", "targetPort": "enter" },
                    { "id": "nested-passed-exercise", "sourceNode": "nested-passed-node", "sourcePort": "complete", "targetNode": "exercise-one", "targetPort": "enter" },
                    { "id": "exercise-passed", "sourceNode": "exercise-one", "sourcePort": "success", "targetNode": "exercise-passed-node", "targetPort": "enter" },
                    { "id": "exercise-failed", "sourceNode": "exercise-one", "sourcePort": "failed", "targetNode": "exercise-failed-node", "targetPort": "enter" },
                    { "id": "nested-quiz-failed", "sourceNode": "nested-quiz", "sourcePort": "failed", "targetNode": "nested-failed-node", "targetPort": "enter" },
                    { "id": "quiz-failed", "sourceNode": "quiz-one", "sourcePort": "failed", "targetNode": "failed-node", "targetPort": "enter" }
                  ]
                },
                {
                  "id": "lesson-hidden",
                  "title": "Aula não publicada",
                  "isPublished": false,
                  "estimatedMinutes": 5,
                  "nodes": [],
                  "connections": []
                }
              ]
            }
          ],
          "allowComments": true,
          "allowFork": true,
          "seoTitle": null,
          "seoDescription": null,
          "ogImage": null
        }
        """;

        var createCourse = await anonymous.PostAsync(
            "/api/courses",
            new StringContent(coursePayload, Encoding.UTF8, "application/json"));
        assert(createCourse.StatusCode == HttpStatusCode.Created,
            "An authenticated owner must be able to create a valid course.");
        var courseJson = await createCourse.Content.ReadAsStringAsync();
        using var courseDocument = JsonDocument.Parse(courseJson);
        var courseId = courseDocument.RootElement.GetProperty("id").GetString()!;
        var courseSlug = courseDocument.RootElement.GetProperty("slug").GetString()!;
        assert(courseDocument.RootElement.GetProperty("version").GetInt32() == 1,
            "A newly created course must start at version one.");

        var publicCourse = await studentClient.GetAsync($"/api/courses/{courseSlug}");
        assert(publicCourse.StatusCode == HttpStatusCode.OK,
            "A published course must be readable by a public student session.");

        using (var pendingCourse = JsonDocument.Parse(await publicCourse.Content.ReadAsStringAsync()))
        {
            var lessonNodes = pendingCourse.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0].GetProperty("nodes");
            var nodeIds = lessonNodes.EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("quiz-one") && !nodeIds.Contains("passed-node") && !nodeIds.Contains("failed-node")
                && !nodeIds.Contains("exercise-one"),
                "Neither Quiz branch nor a nested Exercise may be returned before its upstream results exist.");
            var quizProps = lessonNodes.EnumerateArray()
                .Single(node => node.GetProperty("id").GetString() == "quiz-one")
                .GetProperty("props");
            assert(!quizProps.TryGetProperty("correctIndex", out _),
                "The public course response must never disclose the Quiz answer key.");
        }

        using var emptyClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });
        var anonymousCreate = await emptyClient.PostAsync(
            "/api/courses",
            new StringContent(coursePayload, Encoding.UTF8, "application/json"));
        assert(anonymousCreate.StatusCode == HttpStatusCode.Unauthorized,
            "Course creation must require authentication.");

        var unauthenticatedQuizAttempt = await emptyClient.PostAsJsonAsync(
            "/api/enrollments/course/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 0 });
        assert(unauthenticatedQuizAttempt.StatusCode == HttpStatusCode.Unauthorized,
            "Quiz attempts must require an authenticated session.");

        var unauthenticatedExerciseAttempt = await emptyClient.PostAsJsonAsync(
            "/api/enrollments/course/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "print(1)" });
        assert(unauthenticatedExerciseAttempt.StatusCode == HttpStatusCode.Unauthorized,
            "Exercise attempts must require an authenticated session.");



        const string draftPayload = """
        {
          "slug": "private-draft",
          "title": "Rascunho privado",
          "subtitle": null,
          "description": "Descrição longa o suficiente para criar o rascunho.",
          "category": "Tecnologia",
          "tags": [],
          "level": "Iniciante",
          "language": "pt-BR",
          "thumbnail": null,
          "modules": [],
          "allowComments": true,
          "allowFork": true,
          "sourceCourseId": null
        }
        """;
        var createDraft = await anonymous.PostAsync(
            "/api/drafts",
            new StringContent(draftPayload, Encoding.UTF8, "application/json"));
        assert(createDraft.StatusCode == HttpStatusCode.Created,
            "An authenticated user must be able to create a draft.");
        using var draftDocument = JsonDocument.Parse(await createDraft.Content.ReadAsStringAsync());
        var draftId = draftDocument.RootElement.GetProperty("id").GetString()!;

        var foreignDraft = await studentClient.GetAsync($"/api/drafts/{draftId}");
        assert(foreignDraft.StatusCode == HttpStatusCode.Forbidden,
            "A different standard user must not read another user's draft.");
        var adminDraft = await adminClient.GetAsync($"/api/drafts/{draftId}");
        assert(adminDraft.StatusCode == HttpStatusCode.OK,
            "An administrator must be able to inspect another user's draft.");

        using (var invalidQuizDocument = JsonDocument.Parse(
            coursePayload.Replace("\"correctIndex\": 0", "\"correctIndex\": 9", StringComparison.Ordinal)))
        {
            var invalidQuizUpdate = await anonymous.PutAsJsonAsync($"/api/courses/{courseSlug}", new
            {
                modules = invalidQuizDocument.RootElement.GetProperty("modules").Clone()
            });
            assert(invalidQuizUpdate.StatusCode == HttpStatusCode.BadRequest,
                "A published course must reject a Quiz whose answer key points outside its option list.");
        }

        var invalidExerciseCourse = JsonNode.Parse(coursePayload)!;
        var invalidExercise = invalidExerciseCourse["modules"]![0]!["lessons"]![0]!["nodes"]!
            .AsArray().Single(node => node?["id"]?.GetValue<string>() == "exercise-one");
        invalidExercise!["props"]!["solution"] = "";
        var invalidExerciseUpdate = await anonymous.PutAsJsonAsync($"/api/courses/{courseSlug}", new
        {
            modules = invalidExerciseCourse["modules"]
        });
        assert(invalidExerciseUpdate.StatusCode == HttpStatusCode.BadRequest,
            "A published course must reject an Exercise without a reference solution.");

        var updateCourse = await anonymous.PutAsJsonAsync($"/api/courses/{courseSlug}", new
        {
            title = "Curso de integração atualizado",
            changelog = "Atualização de metadados"
        });
        assert(updateCourse.StatusCode == HttpStatusCode.OK,
            "The course owner must be able to update the course.");
        using (var updatedCourse = JsonDocument.Parse(await updateCourse.Content.ReadAsStringAsync()))
        {
            assert(updatedCourse.RootElement.GetProperty("version").GetInt32() == 2,
                "An editorial update must increment the course version.");
        }

        var foreignCourseUpdate = await studentClient.PutAsJsonAsync($"/api/courses/{courseSlug}", new
        {
            title = "Tentativa de alteração"
        });
        assert(foreignCourseUpdate.StatusCode == HttpStatusCode.Forbidden,
            "A standard user must not update another author's course.");

        var versionsAfterEdit = await anonymous.GetAsync($"/api/courses/{courseSlug}/versions");
        using (var versions = JsonDocument.Parse(await versionsAfterEdit.Content.ReadAsStringAsync()))
        {
            assert(versions.RootElement.GetArrayLength() == 2,
                "An editorial update must create a second history snapshot.");
        }

        var archive = await anonymous.PostAsJsonAsync($"/api/courses/{courseSlug}/publish", new
        {
            status = "arquivado"
        });
        assert(archive.StatusCode == HttpStatusCode.OK,
            "The owner must be able to archive the course.");
        using (var archived = JsonDocument.Parse(await archive.Content.ReadAsStringAsync()))
        {
            assert(archived.RootElement.GetProperty("version").GetInt32() == 3,
                "Archiving must create a new course version.");
        }
        var hiddenCourse = await studentClient.GetAsync($"/api/courses/{courseSlug}");
        assert(hiddenCourse.StatusCode == HttpStatusCode.NotFound,
            "Archived courses must not be visible to students.");

        var republish = await anonymous.PostAsJsonAsync($"/api/courses/{courseSlug}/publish", new
        {
            status = "publicado"
        });
        assert(republish.StatusCode == HttpStatusCode.OK,
            "The owner must be able to republish the course.");
        using (var republished = JsonDocument.Parse(await republish.Content.ReadAsStringAsync()))
        {
            assert(republished.RootElement.GetProperty("version").GetInt32() == 4,
                "Republishing must create the next course version.");
        }

        var courseVersions = await anonymous.GetAsync($"/api/courses/{courseSlug}/versions");
        using (var versions = JsonDocument.Parse(await courseVersions.Content.ReadAsStringAsync()))
        {
            assert(versions.RootElement.GetArrayLength() == 4,
                "Course history must contain the initial snapshot and three subsequent changes.");
        }

        var createEnrollment = await studentClient.PostAsync($"/api/enrollments/{courseId}", null);
        assert(createEnrollment.StatusCode == HttpStatusCode.Created,
            "A student must be able to enroll in a published course.");

        var exerciseFailureEnrollment = await exerciseFailureClient.PostAsync($"/api/enrollments/{courseId}", null);
        assert(exerciseFailureEnrollment.StatusCode == HttpStatusCode.Created,
            "A second student must be able to enroll independently for the Exercise failure path.");

        var quizBeforeLessonCompletion = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = -1 });
        assert(quizBeforeLessonCompletion.StatusCode == HttpStatusCode.BadRequest,
            "The Quiz endpoint must reject an out-of-range answer index.");

        var completeBeforeQuiz = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/complete", null);
        assert(completeBeforeQuiz.StatusCode == HttpStatusCode.Conflict,
            "A lesson containing a Quiz cannot be completed before that Quiz is answered.");

        var successfulQuizAttempt = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 0 });
        assert(successfulQuizAttempt.StatusCode == HttpStatusCode.OK,
            "A student must be able to submit a valid Quiz answer.");
        using (var quizResult = JsonDocument.Parse(await successfulQuizAttempt.Content.ReadAsStringAsync()))
        {
            var attempt = quizResult.RootElement.GetProperty("quizAttempts")[0];
            assert(attempt.GetProperty("isCorrect").GetBoolean()
                && attempt.GetProperty("passed").GetBoolean()
                && attempt.GetProperty("score").GetInt32() == 100,
                "The server must evaluate the correct answer and persist an approved result.");
        }

        var successfulStudentCourse = await studentClient.GetAsync($"/api/courses/{courseSlug}");
        using (var unlockedSuccess = JsonDocument.Parse(await successfulStudentCourse.Content.ReadAsStringAsync()))
        {
            var studentLesson = unlockedSuccess.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0];
            var nodeIds = studentLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("passed-node") && !nodeIds.Contains("failed-node"),
                "An approved result must unlock only the success branch in the student response.");
            assert(nodeIds.Contains("nested-quiz")
                && !nodeIds.Contains("nested-passed-node")
                && !nodeIds.Contains("nested-failed-node"),
                "A Quiz inside the selected path must appear while its own output branches remain hidden.");
            var connectionIds = studentLesson.GetProperty("connections").EnumerateArray()
                .Select(edge => edge.GetProperty("id").GetString()).ToArray();
            assert(connectionIds.Contains("quiz-passed") && !connectionIds.Contains("quiz-failed"),
                "Only the selected Quiz output connection may be returned to the student.");
        }

        var completeBeforeNestedQuiz = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/complete", null);
        assert(completeBeforeNestedQuiz.StatusCode == HttpStatusCode.Conflict,
            "A lesson must remain incomplete while a newly unlocked Quiz is unanswered.");

        var nestedQuizAttempt = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/nested-quiz/attempt",
            new { selectedOptionIndex = 0 });
        assert(nestedQuizAttempt.StatusCode == HttpStatusCode.OK,
            "A Quiz must become answerable after its parent branch is selected.");
        var nestedQuizCourse = await studentClient.GetAsync($"/api/courses/{courseSlug}");
        using (var nestedResult = JsonDocument.Parse(await nestedQuizCourse.Content.ReadAsStringAsync()))
        {
            var studentLesson = nestedResult.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0];
            var nodeIds = studentLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("nested-passed-node") && !nodeIds.Contains("nested-failed-node"),
                "The nested Quiz result must unlock only its own selected output.");
            assert(nodeIds.Contains("exercise-one")
                && !nodeIds.Contains("exercise-passed-node")
                && !nodeIds.Contains("exercise-failed-node"),
                "An Exercise inside the selected Quiz path must appear before either Exercise result.");
        var refreshedCourseCatalog = await studentClient.GetAsync("/api/courses");
        using (var refreshedCatalog = JsonDocument.Parse(await refreshedCourseCatalog.Content.ReadAsStringAsync()))
        {
            var catalogCourse = refreshedCatalog.RootElement.EnumerateArray()
                .Single(item => item.GetProperty("slug").GetString() == courseSlug);
            var catalogLesson = catalogCourse.GetProperty("modules")[0].GetProperty("lessons")[0];
            var catalogNodeIds = catalogLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(catalogNodeIds.Contains("nested-passed-node") && !catalogNodeIds.Contains("failed-node"),
                "The course catalog refresh endpoint must return the student's current unlocked branch.");
        }
        }

        var completeBeforeExercise = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/complete", null);
        assert(completeBeforeExercise.StatusCode == HttpStatusCode.Conflict,
            "A lesson must remain incomplete while a reachable Exercise is unanswered.");

        var emptyExerciseAnswer = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "   " });
        assert(emptyExerciseAnswer.StatusCode == HttpStatusCode.BadRequest,
            "The Exercise endpoint must reject an empty submission.");

        var successfulExerciseAttempt = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "  print(\"CorseWeb funciona!\")  \r\n" });
        assert(successfulExerciseAttempt.StatusCode == HttpStatusCode.OK,
            "A student must be able to submit a correct Exercise response.");
        using (var exerciseResult = JsonDocument.Parse(await successfulExerciseAttempt.Content.ReadAsStringAsync()))
        {
            var attempt = exerciseResult.RootElement.GetProperty("exerciseAttempts")[0];
            assert(attempt.GetProperty("isCorrect").GetBoolean()
                && attempt.GetProperty("passed").GetBoolean()
                && attempt.GetProperty("score").GetInt32() == 100,
                "The server must compare the text submission and persist a passing Exercise result.");
        }

        var successfulExerciseCourse = await studentClient.GetAsync($"/api/courses/{courseSlug}");
        using (var unlockedExercise = JsonDocument.Parse(await successfulExerciseCourse.Content.ReadAsStringAsync()))
        {
            var studentLesson = unlockedExercise.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0];
            var nodeIds = studentLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("exercise-passed-node") && !nodeIds.Contains("exercise-failed-node"),
                "A correct Exercise response must unlock only its success branch.");
            var exerciseNode = studentLesson.GetProperty("nodes").EnumerateArray()
                .Single(node => node.GetProperty("id").GetString() == "exercise-one");
            assert(!exerciseNode.GetProperty("props").TryGetProperty("solution", out _),
                "The public course response must never disclose the Exercise reference solution.");
        }

        var repeatedSuccessfulExercise = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "print(\"CorseWeb funciona!\")\n" });
        assert(repeatedSuccessfulExercise.StatusCode == HttpStatusCode.OK,
            "Submitting the same normalized Exercise answer must be idempotent.");

        var changedSuccessfulExercise = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "print(\"Outra resposta\")" });
        assert(changedSuccessfulExercise.StatusCode == HttpStatusCode.Conflict,
            "A recorded Exercise response cannot be replaced by a different answer.");

        var exerciseFailureQuizOne = await exerciseFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 0 });
        assert(exerciseFailureQuizOne.StatusCode == HttpStatusCode.OK,
            "The Exercise failure-path student must pass the first Quiz to reach the nested path.");
        var exerciseFailureNestedQuiz = await exerciseFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/nested-quiz/attempt",
            new { selectedOptionIndex = 0 });
        assert(exerciseFailureNestedQuiz.StatusCode == HttpStatusCode.OK,
            "The Exercise failure-path student must pass the nested Quiz before the Exercise.");
        var failedExerciseAttempt = await exerciseFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "print('resposta diferente')" });
        assert(failedExerciseAttempt.StatusCode == HttpStatusCode.OK,
            "An incorrect Exercise submission must be accepted and evaluated as a result.");
        using (var failedExerciseResult = JsonDocument.Parse(await failedExerciseAttempt.Content.ReadAsStringAsync()))
        {
            var attempt = failedExerciseResult.RootElement.GetProperty("exerciseAttempts")[0];
            assert(!attempt.GetProperty("isCorrect").GetBoolean()
                && !attempt.GetProperty("passed").GetBoolean()
                && attempt.GetProperty("score").GetInt32() == 0,
                "The server must persist an incorrect Exercise response as a failed result.");
        }
        var failedExerciseCourse = await exerciseFailureClient.GetAsync($"/api/courses/{courseSlug}");
        using (var unlockedFailedExercise = JsonDocument.Parse(await failedExerciseCourse.Content.ReadAsStringAsync()))
        {
            var studentLesson = unlockedFailedExercise.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0];
            var nodeIds = studentLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("exercise-failed-node") && !nodeIds.Contains("exercise-passed-node"),
                "An incorrect Exercise response must unlock only its failed branch.");
        }

        var repeatedSuccessfulQuizAttempt = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 0 });
        assert(repeatedSuccessfulQuizAttempt.StatusCode == HttpStatusCode.OK,
            "Resubmitting the same Quiz answer must be idempotent.");

        var changedSuccessfulQuizAttempt = await studentClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 1 });
        assert(changedSuccessfulQuizAttempt.StatusCode == HttpStatusCode.Conflict,
            "A recorded Quiz result cannot be replaced by another answer.");

        var quizFailureEnroll = await quizFailureClient.PostAsync($"/api/enrollments/{courseId}", null);
        assert(quizFailureEnroll.StatusCode == HttpStatusCode.Created,
            "A second student must be able to enroll independently for the Quiz failure path.");
        var invalidQuizChoice = await quizFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 9 });
        assert(invalidQuizChoice.StatusCode == HttpStatusCode.BadRequest,
            "The Quiz endpoint must reject option indices outside the authored answer list.");

        var failedQuizAttempt = await quizFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt",
            new { selectedOptionIndex = 1 });
        assert(failedQuizAttempt.StatusCode == HttpStatusCode.OK,
            "A student must be able to submit an incorrect answer and receive a failed result.");
        using (var quizResult = JsonDocument.Parse(await failedQuizAttempt.Content.ReadAsStringAsync()))
        {
            var attempt = quizResult.RootElement.GetProperty("quizAttempts")[0];
            assert(!attempt.GetProperty("isCorrect").GetBoolean()
                && !attempt.GetProperty("passed").GetBoolean()
                && attempt.GetProperty("score").GetInt32() == 0,
                "The server must persist an incorrect answer as a failed result.");
        }

        var lockedNestedQuizAttempt = await quizFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/nested-quiz/attempt",
            new { selectedOptionIndex = 0 });
        assert(lockedNestedQuizAttempt.StatusCode == HttpStatusCode.NotFound,
            "A student must not submit an answer to a Quiz inside an unselected branch.");

        var lockedExerciseAttempt = await quizFailureClient.PostAsJsonAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/exercises/exercise-one/attempt",
            new { answer = "print(\"CorseWeb funciona!\")" });
        assert(lockedExerciseAttempt.StatusCode == HttpStatusCode.NotFound,
            "A student must not submit an Exercise inside an unselected branch.");

        var failedStudentCourse = await quizFailureClient.GetAsync($"/api/courses/{courseSlug}");
        using (var unlockedFailure = JsonDocument.Parse(await failedStudentCourse.Content.ReadAsStringAsync()))
        {
            var studentLesson = unlockedFailure.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0];
            var nodeIds = studentLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("failed-node") && !nodeIds.Contains("passed-node"),
                "A failed result must unlock only the failed branch for that student's enrollment.");
        var failurePathCompletion = await quizFailureClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/complete", null);
        assert(failurePathCompletion.StatusCode == HttpStatusCode.OK,
            "A failed outcome may complete the lesson after its selected failure path is unlocked.");
        }


        var forgedProgress = await studentClient.PutAsJsonAsync(
            $"/api/enrollments/{courseId}/progress",
            new
            {
                currentLessonId = "lesson-one",
                overallPercent = 100,
                modulesProgress = new[] { new { percent = 100, status = "concluido" } }
            });
        assert(forgedProgress.StatusCode == HttpStatusCode.OK,
            "Navigation progress must accept a valid current lesson.");
        using (var forged = JsonDocument.Parse(await forgedProgress.Content.ReadAsStringAsync()))
        {
            assert(forged.RootElement.GetProperty("overallPercent").GetInt32() == 0,
                "Client-supplied percentages must be ignored by the HTTP endpoint.");
        }

        var unpublishedProgress = await studentClient.PutAsJsonAsync(
            $"/api/enrollments/{courseId}/progress",
            new { currentLessonId = "lesson-hidden" });
        assert(unpublishedProgress.StatusCode == HttpStatusCode.BadRequest,
            "An unpublished lesson must not become the current progress lesson.");

        var invalidCompletion = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-hidden/complete", null);
        assert(invalidCompletion.StatusCode == HttpStatusCode.NotFound,
            "An unpublished lesson must not be completed through the API.");

        var completeLesson = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/complete", null);
        assert(completeLesson.StatusCode == HttpStatusCode.OK,
            "A student must be able to record completion of a published lesson.");
        using (var completed = JsonDocument.Parse(await completeLesson.Content.ReadAsStringAsync()))
        {
            assert(completed.RootElement.GetProperty("overallPercent").GetInt32() == 100,
                "The server must calculate completion percentage from its completion records.");
        }

        var duplicateCompletion = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/complete", null);
        assert(duplicateCompletion.StatusCode == HttpStatusCode.OK,
            "Repeating lesson completion must be idempotent.");
        using (var duplicate = JsonDocument.Parse(await duplicateCompletion.Content.ReadAsStringAsync()))
        {
            assert(duplicate.RootElement.GetProperty("overallPercent").GetInt32() == 100,
                "A repeated completion must not inflate the percentage.");
        }

        var outsiderEnrollments = await outsiderClient.GetAsync("/api/enrollments");
        using (var outsiderList = JsonDocument.Parse(await outsiderEnrollments.Content.ReadAsStringAsync()))
        {
            assert(outsiderList.RootElement.GetArrayLength() == 0,
                "A user must only see their own enrollments.");
        }
        var outsiderUnenroll = await outsiderClient.DeleteAsync($"/api/enrollments/{courseId}");
        assert(outsiderUnenroll.StatusCode == HttpStatusCode.NotFound,
            "A different student must not remove another user's enrollment.");

        var quizFailureUnenroll = await quizFailureClient.DeleteAsync($"/api/enrollments/{courseId}");
        assert(quizFailureUnenroll.StatusCode == HttpStatusCode.OK,
            "The second student must be able to cancel their own Quiz test enrollment.");

        var exerciseFailureUnenroll = await exerciseFailureClient.DeleteAsync($"/api/enrollments/{courseId}");
        assert(exerciseFailureUnenroll.StatusCode == HttpStatusCode.OK,
            "The third student must be able to cancel their own Exercise test enrollment.");

        var ownUnenroll = await studentClient.DeleteAsync($"/api/enrollments/{courseId}");
        assert(ownUnenroll.StatusCode == HttpStatusCode.OK,
            "A student must be able to cancel their own enrollment.");
        var enrollmentAfterDelete = await studentClient.GetAsync("/api/enrollments");
        using (var emptyEnrollments = JsonDocument.Parse(await enrollmentAfterDelete.Content.ReadAsStringAsync()))
        {
            assert(emptyEnrollments.RootElement.GetArrayLength() == 0,
                "A cancelled enrollment must no longer appear in the student's list.");
        }
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            assert(await db.CourseLessonCompletions.CountAsync() == 0,
                "Cancelling an enrollment must cascade-delete its server completion records.");
            assert(await db.CourseQuizAttempts.CountAsync() == 0,
                "Cancelling both enrollments must cascade-delete their stored Quiz results.");
            assert(await db.CourseExerciseAttempts.CountAsync() == 0,
                "Cancelling enrollments must cascade-delete their stored Exercise responses.");
        }

        using var unauthorizedMediaClient = factory.CreateClient();
        var unauthorizedUpload = await unauthorizedMediaClient.PostAsync(
            "/api/course-media/covers",
            new MultipartFormDataContent());
        assert(unauthorizedUpload.StatusCode == HttpStatusCode.Unauthorized,
            "Course cover uploads must require authentication.");

        using var invalidImageContent = new MultipartFormDataContent();
        var invalidImage = new ByteArrayContent(Encoding.UTF8.GetBytes("not an image"));
        invalidImageContent.Add(invalidImage, "file", "invalid.png");
        var invalidImageResponse = await anonymous.PostAsync("/api/course-media/covers", invalidImageContent);
        assert(invalidImageResponse.StatusCode == HttpStatusCode.BadRequest,
            "The cover endpoint must reject content without a supported image signature.");

        var ownerLogout = await anonymous.PostAsync("/api/auth/logout", null);
        assert(ownerLogout.StatusCode == HttpStatusCode.OK,
            "An authenticated user must be able to end their session.");
        var afterLogout = await anonymous.GetAsync("/api/enrollments");
        assert(afterLogout.StatusCode == HttpStatusCode.Unauthorized,
            "Protected API requests must reject the client after logout.");

        var adminDeletesDraft = await adminClient.DeleteAsync($"/api/drafts/{draftId}");
        assert(adminDeletesDraft.StatusCode == HttpStatusCode.OK,
            "An administrator must be allowed to remove an inaccessible draft.");

        var studentLogout = await studentClient.PostAsync("/api/auth/logout", null);
        assert(studentLogout.StatusCode == HttpStatusCode.OK,
            "The student session must be able to log out.");
        await quizFailureClient.PostAsync("/api/auth/logout", null);
        await exerciseFailureClient.PostAsync("/api/auth/logout", null);
    }

    private static async Task<(string Id, string Role)> RegisterAsync(
        HttpClient client,
        string email,
        string name)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            name,
            email,
            password = "StrongPassword123!"
        });
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return (
            document.RootElement.GetProperty("id").GetString()!,
            document.RootElement.GetProperty("role").GetString()!
        );
    }

    private sealed class ApiTestApplicationFactory : WebApplicationFactory<CorseWeb.Server.ServerEntryPointMarker>
    {
        private readonly SqliteConnection _keeper;

        public ApiTestApplicationFactory()
        {
            _keeper = new SqliteConnection(ConnectionString);
            _keeper.Open();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                    ["AdminEmails:0"] = "admin@corseweb.test",
                    ["Authentication:Google:ClientId"] = ""
                });
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
                _keeper.Dispose();
        }
    }
}
