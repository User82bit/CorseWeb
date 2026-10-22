import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_COURSE_COVER_URL, resolveCourseCoverUrl } from "./courseCoverUrl.ts";

test("blank cover URL resolves to the local placeholder", () => {
  assert.equal(resolveCourseCoverUrl(""), DEFAULT_COURSE_COVER_URL);
  assert.equal(resolveCourseCoverUrl("  "), DEFAULT_COURSE_COVER_URL);
});

test("accepts root-relative URLs returned by cover uploads", () => {
  assert.equal(
    resolveCourseCoverUrl("/uploads/course-covers/cover.webp"),
    "/uploads/course-covers/cover.webp",
  );
});

test("accepts absolute HTTP and HTTPS image URLs", () => {
  assert.equal(resolveCourseCoverUrl("https://cdn.example.com/cover.webp"), "https://cdn.example.com/cover.webp");
  assert.equal(resolveCourseCoverUrl("http://localhost:5108/uploads/cover.png"), "http://localhost:5108/uploads/cover.png");
});

test("rejects invalid values without changing the previous preview", () => {
  assert.equal(resolveCourseCoverUrl("not a URL"), null);
  assert.equal(resolveCourseCoverUrl("javascript:alert(1)"), null);
  assert.equal(resolveCourseCoverUrl("//cdn.example.com/cover.webp"), null);
});
