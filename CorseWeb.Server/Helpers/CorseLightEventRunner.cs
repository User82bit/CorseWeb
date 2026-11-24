using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CorseWeb.Server.CorseLight;
using CorseWeb.Server.Data;
using CorseWeb.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace CorseWeb.Server.Helpers;

public static class CorseLightEventRunner
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public static async Task<ClEffects> ExecuteAsync(
        AppDbContext db,
        Course course,
        CourseEnrollment enrollment,
        string lessonId,
        string eventName,
        string sourceEventId,
        string? activityId = null,
        object? activityAnswer = null,
        bool? activityIsCorrect = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedSourceId = NormalizeSourceEventId(sourceEventId);
        var marker = await db.CourseScriptExecutions
            .AsNoTracking()
            .FirstOrDefaultAsync(item =>
                item.EnrollmentId == enrollment.Id
                && item.LessonId == lessonId
                && item.EventName == eventName
                && item.SourceEventId == normalizedSourceId
                && item.ScriptId == CourseScriptExecution.EventMarkerScriptId,
                cancellationToken);
        if (marker != null)
            return DeserializeEffects(marker.ResultJson);

        var diagnostics = CorseLightValidator.ValidateScriptsJson(course.ScriptsJson, course.ModulesJson);
        if (diagnostics.Count > 0)
        {
            var failedMarker = CreateExecution(
                enrollment, course, lessonId, eventName, normalizedSourceId,
                CourseScriptExecution.EventMarkerScriptId, ClEffects.Empty,
                failed: true, diagnosticCode: diagnostics[0].Code);
            db.CourseScriptExecutions.Add(failedMarker);
            return ClEffects.Empty;
        }

        var scripts = CorseLightValidator.ReadEnabledScripts(course.ScriptsJson);
        var matchingScripts = scripts
            .Select(script => (Script: script, Event: script.Program.Events
                .FirstOrDefault(item => string.Equals(item.EventName, eventName, StringComparison.Ordinal))))
            .Where(item => item.Event != null)
            .ToArray();

        var nodeTypes = CorseLightValidator.GetLessonNodeTypes(course.ModulesJson, lessonId);
        var values = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["course.id"] = course.Id,
            ["lesson.id"] = lessonId,
            ["event.name"] = eventName,
            ["student.locale"] = null
        };
        if (eventName == "activity.submit" && activityId != null)
            values["activity.id"] = activityId;

        var executionContext = new ClExecutionContext(
            values,
            eventName,
            lessonId,
            activityId,
            activityAnswer,
            activityIsCorrect);

        var aggregate = ClEffects.Empty;
        foreach (var item in matchingScripts)
        {
            var script = item.Script;
            var eventBlock = item.Event!;
            var stateRows = await db.CourseScriptStates
                .Where(state => state.EnrollmentId == enrollment.Id && state.ScriptId == script.Id)
                .ToListAsync(cancellationToken);
            var initialState = new Dictionary<string, object?>(StringComparer.Ordinal);
            foreach (var stateRow in stateRows)
            {
                try
                {
                    using var stateDocument = JsonDocument.Parse(stateRow.ValueJson);
                    initialState[stateRow.Key] = CorseLightRuntime.FromJson(stateDocument.RootElement);
                }
                catch (Exception exception) when (exception is JsonException or InvalidOperationException)
                {
                    // A corrupt legacy row is isolated to this script; it is not exposed to the author or student.
                    initialState[stateRow.Key] = null;
                }
            }

            var result = CorseLightRuntime.Execute(eventBlock, initialState, executionContext, nodeTypes);
            if (!result.Success)
            {
                db.CourseScriptExecutions.Add(CreateExecution(
                    enrollment, course, lessonId, eventName, normalizedSourceId,
                    script.Id, ClEffects.Empty, failed: true, diagnosticCode: result.Diagnostic?.Code));
                continue;
            }

            var combined = new ClEffects(
                aggregate.Feedback.Concat(result.Effects.Feedback).ToArray(),
                aggregate.NodeVisibility.Concat(result.Effects.NodeVisibility).ToArray(),
                aggregate.NodeText.Concat(result.Effects.NodeText).ToArray());

            if (!WithinEventEffectLimits(combined))
            {
                db.CourseScriptExecutions.Add(CreateExecution(
                    enrollment, course, lessonId, eventName, normalizedSourceId,
                    script.Id, ClEffects.Empty, failed: true, diagnosticCode: "CL_EVENT_EFFECT_LIMIT"));
                continue;
            }

            ApplyStateChanges(db, enrollment.Id, script.Id, stateRows, result.State);
            aggregate = combined;
            db.CourseScriptExecutions.Add(CreateExecution(
                enrollment, course, lessonId, eventName, normalizedSourceId,
                script.Id, result.Effects, failed: false, diagnosticCode: null));
        }

        // The marker is the durable event ledger and stores the aggregate projection.
        // It also prevents a later script edit from replaying an old student event.
        db.CourseScriptExecutions.Add(CreateExecution(
            enrollment, course, lessonId, eventName, normalizedSourceId,
            CourseScriptExecution.EventMarkerScriptId, aggregate, failed: false, diagnosticCode: null));

        return aggregate;
    }

    private static bool WithinEventEffectLimits(ClEffects effects)
    {
        var count = effects.Feedback.Count + effects.NodeVisibility.Count + effects.NodeText.Count;
        if (count > 64) return false;
        var json = JsonSerializer.Serialize(effects, JsonOptions);
        return Encoding.UTF8.GetByteCount(json) <= 16 * 1024;
    }

    private static void ApplyStateChanges(
        AppDbContext db,
        string enrollmentId,
        string scriptId,
        IReadOnlyCollection<CourseScriptState> currentRows,
        IReadOnlyDictionary<string, object?> nextState)
    {
        var current = currentRows.ToDictionary(row => row.Key, StringComparer.Ordinal);
        foreach (var row in currentRows)
        {
            if (!nextState.ContainsKey(row.Key))
                db.CourseScriptStates.Remove(row);
        }

        foreach (var pair in nextState)
        {
            var serialized = JsonSerializer.Serialize(pair.Value, JsonOptions);
            if (current.TryGetValue(pair.Key, out var existing))
            {
                if (!string.Equals(existing.ValueJson, serialized, StringComparison.Ordinal))
                {
                    existing.ValueJson = serialized;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                db.CourseScriptStates.Add(new CourseScriptState
                {
                    EnrollmentId = enrollmentId,
                    ScriptId = scriptId,
                    Key = pair.Key,
                    ValueJson = serialized,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }
    }

    private static CourseScriptExecution CreateExecution(
        CourseEnrollment enrollment,
        Course course,
        string lessonId,
        string eventName,
        string sourceEventId,
        string scriptId,
        ClEffects effects,
        bool failed,
        string? diagnosticCode)
    {
        return new CourseScriptExecution
        {
            EnrollmentId = enrollment.Id,
            CourseId = course.Id,
            LessonId = lessonId,
            EventName = eventName,
            SourceEventId = sourceEventId,
            ScriptId = scriptId,
            ResultJson = JsonSerializer.Serialize(effects, JsonOptions),
            Failed = failed,
            DiagnosticCode = diagnosticCode,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static ClEffects DeserializeEffects(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<ClEffects>(json, JsonOptions) ?? ClEffects.Empty;
        }
        catch (JsonException)
        {
            return ClEffects.Empty;
        }
    }

    private static string NormalizeSourceEventId(string sourceEventId)
    {
        if (Encoding.UTF8.GetByteCount(sourceEventId) <= 128) return sourceEventId;
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sourceEventId)));
    }
}
