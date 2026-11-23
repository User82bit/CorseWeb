using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
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
            assert(nodeIds.Contains("quiz-one") && !nodeIds.Contains("passed-node") && !nodeIds.Contains("failed-node"),
                "Neither Quiz branch may be returned before a result exists.");
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

        var quizBeforeLessonCompletion = await studentClient.PostAsync(
            $"/api/enrollments/{courseId}/lessons/lesson-one/quizzes/quiz-one/attempt", null);
        assert(quizBeforeLessonCompletion.StatusCode == HttpStatusCode.BadRequest,
            "Submitting a Quiz without a selected option must be rejected.");

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
            var connectionIds = studentLesson.GetProperty("connections").EnumerateArray()
                .Select(edge => edge.GetProperty("id").GetString()).ToArray();
            assert(connectionIds.Contains("quiz-passed") && !connectionIds.Contains("quiz-failed"),
                "Only the selected Quiz output connection may be returned to the student.");
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

        var failedStudentCourse = await quizFailureClient.GetAsync($"/api/courses/{courseSlug}");
        using (var unlockedFailure = JsonDocument.Parse(await failedStudentCourse.Content.ReadAsStringAsync()))
        {
            var studentLesson = unlockedFailure.RootElement.GetProperty("modules")[0]
                .GetProperty("lessons")[0];
            var nodeIds = studentLesson.GetProperty("nodes").EnumerateArray()
                .Select(node => node.GetProperty("id").GetString()).ToArray();
            assert(nodeIds.Contains("failed-node") && !nodeIds.Contains("passed-node"),
                "A failed result must unlock only the failed branch for that student's enrollment.");
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
