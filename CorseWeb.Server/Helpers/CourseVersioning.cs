using System.Text.Json;
using CorseWeb.Server.Models;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Applies publication-state changes to a course and creates the matching
/// immutable history snapshot. A draft request on an existing Course maps to
/// archived because editable drafts are stored separately in CourseDraft.
/// </summary>
public static class CourseVersioning
{
    public static bool ApplyStatusTransition(
        Course course,
        string requestedStatus,
        string actorId,
        DateTime? changedAtUtc = null)
    {
        ArgumentNullException.ThrowIfNull(course);
        ArgumentException.ThrowIfNullOrWhiteSpace(requestedStatus);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorId);

        var nextStatus = requestedStatus == "rascunho" ? "arquivado" : requestedStatus;
        if (nextStatus != "publicado" && nextStatus != "arquivado")
            throw new ArgumentOutOfRangeException(nameof(requestedStatus), "Status de curso inválido.");

        if (string.Equals(course.Status, nextStatus, StringComparison.Ordinal))
            return false;

        var previousStatus = course.Status;
        course.Status = nextStatus;
        course.Version += 1;
        course.Changelog = $"Status alterado de '{previousStatus}' para '{nextStatus}'.";
        course.UpdatedAt = changedAtUtc ?? DateTime.UtcNow;
        course.UpdatedBy = actorId;
        return true;
    }

    public static CourseVersion CreateSnapshot(Course course, string actorId)
    {
        ArgumentNullException.ThrowIfNull(course);
        ArgumentException.ThrowIfNullOrWhiteSpace(actorId);

        return new CourseVersion
        {
            CourseId = course.Id,
            Version = course.Version,
            SnapshotJson = JsonSerializer.Serialize(CourseMapper.ToDto(course)),
            Changelog = course.Changelog,
            CreatedBy = actorId,
            CreatedAt = course.UpdatedAt
        };
    }
}
