export const DEFAULT_COURSE_COVER_URL = "/course-cover-placeholder.svg";

/**
 * Accepts uploaded root-relative paths and absolute HTTP(S) URLs.
 * Empty values resolve to the local placeholder so a course never has a blank cover.
 * Invalid values return null and must not replace the last valid preview.
 */
export function resolveCourseCoverUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return DEFAULT_COURSE_COVER_URL;

  // Uploaded files use root-relative paths, while external covers use HTTP(S).
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return candidate;
  } catch {
    // An invalid URL should not replace a currently visible cover.
  }

  return null;
}
