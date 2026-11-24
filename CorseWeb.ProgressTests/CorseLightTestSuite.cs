using System.Text;
using CorseWeb.Server.CorseLight;
using CorseWeb.Server.Helpers;

public static class CorseLightTestSuite
{
    public static void Run(Action<bool, string> assert)
    {
        const string lessonModules = """
        [
          {
            "id": "module-1",
            "lessons": [
              {
                "id": "lesson-1",
                "isPublished": true,
                "nodes": [
                  { "id": "heading-1", "type": "heading", "props": { "content": "Original" } },
                  { "id": "paragraph-1", "type": "paragraph", "props": { "content": "Texto" } },
                  { "id": "quiz-1", "type": "quiz", "props": { "question": "Pergunta" } },
                  { "id": "container-1", "type": "container", "props": {} },
                  { "id": "certificate-1", "type": "certificate", "props": {} }
                ]
              },
              {
                "id": "lesson-2",
                "isPublished": true,
                "nodes": [
                  { "id": "heading-2", "type": "heading", "props": { "content": "Outra aula" } }
                ]
              }
            ]
          }
        ]
        """;

        var parsed = CorseLightParser.Parse("""
        // comentário de linha
        on lesson.start {
            state.set("started", true);
            if (true || false && false) {
                content.setText("heading-1", "content", "Iniciado");
            } else {
                content.hide("paragraph-1");
            }
        }
        """);
        assert(parsed.Success, "Parser must accept event blocks, comments, calls and nested boolean expressions.");
        assert(parsed.Program!.Events.Count == 1, "Parser must preserve the event block.");
        assert(parsed.Program.Events[0].EventName == "lesson.start", "Parser must read the dotted event name.");

        var empty = CorseLightParser.Parse(string.Empty);
        assert(!empty.Success && empty.Diagnostic?.Code == "CL_EMPTY_PROGRAM",
            "An empty CorseLight source must be rejected.");

        var malformed = CorseLightParser.Parse("on lesson.start { state.set(\"x\", true) }");
        assert(!malformed.Success && malformed.Diagnostic?.Code == "CL_UNEXPECTED_TOKEN",
            "A native call without a semicolon must be rejected.");

        var unsupportedOperator = CorseLightParser.Parse("on lesson.start { state.set(\"x\", 1 = 1); }");
        assert(!unsupportedOperator.Success,
            "Assignment is not part of the CorseLight expression grammar.");

        var tooLarge = CorseLightParser.Parse(new string('a', CorseLightParser.MaxSourceBytes + 1));
        assert(!tooLarge.Success && tooLarge.Diagnostic?.Code == "CL_SOURCE_TOO_LARGE",
            "The UTF-8 source size limit must be enforced before tokenization.");

        var deepSource = new StringBuilder("on lesson.start { ");
        for (var index = 0; index < CorseLightParser.MaxDepth; index++)
            deepSource.Append("if (true) { ");
        deepSource.Append("state.set(\"deep\", true); ");
        for (var index = 0; index < CorseLightParser.MaxDepth; index++)
            deepSource.Append("} ");
        deepSource.Append('}');
        var tooDeep = CorseLightParser.Parse(deepSource.ToString());
        assert(!tooDeep.Success && tooDeep.Diagnostic?.Code == "CL_DEPTH_LIMIT",
            "Nested blocks beyond the configured AST depth must be rejected.");

        var goodScripts = """
        [
          {
            "id": "feedback-script",
            "name": "Feedback de envio",
            "language": "CL",
            "languageVersion": "0.1",
            "enabled": true,
            "source": "on activity.submit { if (activity.isCorrect()) { activity.feedback(\"Correto!\", \"success\"); content.show(\"heading-1\"); content.setText(\"heading-1\", \"content\", \"Aprovado\"); } else { activity.feedback(\"Revise a resposta.\", \"warning\"); } }"
          }
        ]
        """;
        var validDiagnostics = CorseLightValidator.ValidateScriptsJson(goodScripts, lessonModules);
        assert(validDiagnostics.Count == 0, "A valid script using allowlisted functions and passive targets must pass semantic validation.");

        var enabledScripts = CorseLightValidator.ReadEnabledScripts(goodScripts);
        assert(enabledScripts.Count == 1 && enabledScripts[0].Id == "feedback-script",
            "Only valid enabled CL 0.1 scripts must be returned for execution.");

        var invalidTargetScripts = goodScripts.Replace("heading-1", "quiz-1", StringComparison.Ordinal);
        var invalidTarget = CorseLightValidator.ValidateScriptsJson(invalidTargetScripts, lessonModules);
        assert(invalidTarget.Any(item => item.Code == "CL_INVALID_NODE_TARGET"),
            "Quiz nodes must not be eligible for content visibility or text mutation.");

        var invalidContextScripts = goodScripts.Replace("activity.isCorrect()", "context.get(\"student.password\") == \"secret\"", StringComparison.Ordinal);
        var invalidContext = CorseLightValidator.ValidateScriptsJson(invalidContextScripts, lessonModules);
        assert(invalidContext.Any(item => item.Code == "CL_CONTEXT_KEY"),
            "Context reads outside the privacy allowlist must be rejected.");

        var unknownFunctionScripts = goodScripts.Replace("activity.isCorrect()", "system.exec(\"whoami\") == true", StringComparison.Ordinal);
        var unknownFunction = CorseLightValidator.ValidateScriptsJson(unknownFunctionScripts, lessonModules);
        assert(unknownFunction.Any(item => item.Code == "CL_UNKNOWN_FUNCTION"),
            "Unknown functions and arbitrary system access must be rejected.");

        var duplicateSource = """
        [
          { "id":"same", "name":"A", "language":"CL", "languageVersion":"0.1", "enabled":false, "source":"on lesson.start {}" },
          { "id":"same", "name":"B", "language":"CL", "languageVersion":"0.1", "enabled":false, "source":"on lesson.start {}" }
        ]
        """;
        assert(CorseLightValidator.ValidateScriptsJson(duplicateSource, lessonModules)
                .Any(item => item.Code == "CL_DUPLICATE_SCRIPT_ID"),
            "Script IDs must be unique within a course.");

        var disabledInvalidSource = """
        [
          { "id":"disabled", "name":"Desabilitado", "language":"CL", "languageVersion":"0.1", "enabled":false, "source":"on lesson.start { system.exec(); }" }
        ]
        """;
        assert(CorseLightValidator.ValidateScriptsJson(disabledInvalidSource, lessonModules)
                .Any(item => item.Code == "CL_UNKNOWN_FUNCTION"),
            "Disabled scripts must still pass syntax and semantic validation before publishing.");

        var tooManyEventScripts = "[" + string.Join(",", Enumerable.Range(0, 17).Select(index =>
            $$"""{"id":"script-{{index}}","name":"Script {{index}}","language":"CL","languageVersion":"0.1","enabled":true,"source":"on lesson.start {}"}""")) + "]";
        assert(CorseLightValidator.ValidateScriptsJson(tooManyEventScripts, lessonModules)
                .Any(item => item.Code == "CL_ENABLED_EVENT_SCRIPT_LIMIT"),
            "No more than sixteen enabled scripts may subscribe to one event.");

        var parsedRuntimeSource = CorseLightParser.Parse("""
        on activity.submit {
            if (activity.isCorrect() && context.get("event.name") == "activity.submit") {
                state.set("result", 1);
                activity.feedback("Muito bem.", "success");
                content.show("heading-1");
                content.setText("heading-1", "content", "Correto");
            } else {
                state.set("result", 0);
            }
        }
        """);
        assert(parsedRuntimeSource.Success, "Runtime fixture must parse.");

        var runtimeContext = new ClExecutionContext(
            new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["course.id"] = "course-1",
                ["lesson.id"] = "lesson-1",
                ["event.name"] = "activity.submit",
                ["activity.id"] = "quiz-1"
            },
            "activity.submit",
            "lesson-1",
            "quiz-1",
            0d,
            true);
        var nodeTypes = CorseLightValidator.GetLessonNodeTypes(lessonModules, "lesson-1");
        var runtime = CorseLightRuntime.Execute(
            parsedRuntimeSource.Program!.Events[0],
            new Dictionary<string, object?>(StringComparer.Ordinal),
            runtimeContext,
            nodeTypes);
        assert(runtime.Success, "The interpreter must execute valid typed calls and if blocks.");
        assert(runtime.State.TryGetValue("result", out var resultValue) && resultValue is double numeric && numeric == 1,
            "The interpreter must persist primitive state after successful execution.");
        assert(runtime.Effects.Feedback.Count == 1 && runtime.Effects.Feedback[0].Tone == "success",
            "The interpreter must emit bounded declarative feedback effects.");
        assert(runtime.Effects.NodeVisibility.Count == 1 && runtime.Effects.NodeVisibility[0].Visible,
            "The interpreter must emit passive-node visibility effects.");
        assert(runtime.Effects.NodeText.Count == 1 && runtime.Effects.NodeText[0].Value == "Correto",
            "The interpreter must emit text-only content effects.");

        var shortCircuitSource = CorseLightParser.Parse("""
        on activity.submit {
            if (false && activity.isCorrect()) {
                state.set("never", true);
            }
            state.set("after", true);
        }
        """);
        var shortCircuit = CorseLightRuntime.Execute(
            shortCircuitSource.Program!.Events[0],
            new Dictionary<string, object?>(StringComparer.Ordinal),
            runtimeContext with { ActivityIsCorrect = null },
            nodeTypes);
        assert(shortCircuit.Success && !shortCircuit.State.ContainsKey("never") && shortCircuit.State.ContainsKey("after"),
            "Boolean operators must short-circuit and never evaluate the unselected right operand.");

        var precedenceSource = CorseLightParser.Parse("""
        on lesson.start {
            if (true || false && false) {
                state.set("branch", "then");
            } else {
                state.set("branch", "else");
            }
        }
        """);
        var precedence = CorseLightRuntime.Execute(
            precedenceSource.Program!.Events[0],
            new Dictionary<string, object?>(StringComparer.Ordinal),
            new ClExecutionContext(
                new Dictionary<string, object?> { ["event.name"] = "lesson.start" },
                "lesson.start", "lesson-1"),
            nodeTypes);
        assert(precedence.Success && Equals(precedence.State["branch"], "then"),
            "AND must bind more tightly than OR in expressions.");

        var typeErrorSource = CorseLightParser.Parse("""
        on lesson.start {
            state.set("before", true);
            if (state.get("before-text")) {
                state.set("after", true);
            }
        }
        """);
        var typeError = CorseLightRuntime.Execute(
            typeErrorSource.Program!.Events[0],
            new Dictionary<string, object?> { ["before-text"] = "not a boolean" },
            new ClExecutionContext(
                new Dictionary<string, object?> { ["event.name"] = "lesson.start" },
                "lesson.start", "lesson-1"),
            nodeTypes);
        assert(!typeError.Success && typeError.Diagnostic?.Code == "CL_TYPE_MISMATCH",
            "Dynamic state values must be checked at runtime without implicit conversion.");
        assert(typeError.State.Count == 1 && Equals(typeError.State["before-text"], "not a boolean")
                && !typeError.State.ContainsKey("before"),
            "A failed script must roll back all state mutations from that invocation.");
        assert(typeError.Effects == ClEffects.Empty,
            "A failed script must not leak partial visual or feedback effects.");

        var forbiddenTargetSource = CorseLightParser.Parse("""
        on lesson.start {
            state.set("unsafe", true);
            content.hide("quiz-1");
        }
        """);
        var forbiddenTarget = CorseLightRuntime.Execute(
            forbiddenTargetSource.Program!.Events[0],
            new Dictionary<string, object?>(),
            new ClExecutionContext(
                new Dictionary<string, object?> { ["event.name"] = "lesson.start" },
                "lesson.start", "lesson-1"),
            nodeTypes);
        assert(!forbiddenTarget.Success && forbiddenTarget.Diagnostic?.Code == "CL_INVALID_NODE_TARGET",
            "Runtime node validation must independently reject quiz targets.");
        assert(forbiddenTarget.State.Count == 0 && forbiddenTarget.Effects == ClEffects.Empty,
            "Runtime target failure must roll back both state and effects.");

        var isolatedOne = CorseLightRuntime.Execute(
            precedenceSource.Program!.Events[0],
            new Dictionary<string, object?>(),
            new ClExecutionContext(new Dictionary<string, object?>(), "lesson.start", "lesson-1"),
            nodeTypes);
        var isolatedTwo = CorseLightRuntime.Execute(
            precedenceSource.Program!.Events[0],
            new Dictionary<string, object?>(),
            new ClExecutionContext(new Dictionary<string, object?>(), "lesson.start", "lesson-2"),
            CorseLightValidator.GetLessonNodeTypes(lessonModules, "lesson-2"));
        assert(isolatedOne.Success && isolatedTwo.Success
                && Equals(isolatedOne.State["branch"], isolatedTwo.State["branch"]),
            "Runtime instances must receive independent enrollment/script state snapshots.");

        var missingActivityContext = CorseLightRuntime.Execute(
            parsedRuntimeSource.Program!.Events[0],
            new Dictionary<string, object?>(),
            runtimeContext with { ActivityIsCorrect = null },
            nodeTypes);
        assert(!missingActivityContext.Success && missingActivityContext.Diagnostic?.Code == "CL_CONTEXT_MISSING",
            "Activity result access must fail safely when called without a server result.");

        var unapprovedContextSource = CorseLightParser.Parse("""
        on lesson.start {
            context.get("student.password");
        }
        """);
        var unapprovedContext = CorseLightRuntime.Execute(
            unapprovedContextSource.Program!.Events[0],
            new Dictionary<string, object?>(),
            new ClExecutionContext(new Dictionary<string, object?>(), "lesson.start", "lesson-1"),
            nodeTypes);
        assert(!unapprovedContext.Success && unapprovedContext.Diagnostic?.Code == "CL_CONTEXT_KEY",
            "The runtime must enforce the context allowlist even if semantic validation was bypassed.");

        var scriptCount = CorseLightValidator.ValidateScriptsJson("[]", lessonModules);
        assert(scriptCount.Count == 0, "Courses without scripts must remain valid.");
    }
}
