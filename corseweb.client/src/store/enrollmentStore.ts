import { apiJson } from "../lib/api";

export type EnrollmentLessonProgress = {
  lessonId: string;
  status: "nao-iniciado" | "em-andamento" | "concluido";
  startedAt?: string;
  completedAt?: string;
  timeSpentMinutes: number;
};

export type EnrollmentModuleProgress = {
  moduleId: string;
  completedAt?: string;
  percent: number;
  lessons: EnrollmentLessonProgress[];
};

export type CourseEnrollment = {
  courseId: string;
  enrolledAt: string;
  completedAt: string | null;
  overallPercent: number;
  currentLessonId: string | null;
  lastAccessedAt: string;
  modulesProgress: EnrollmentModuleProgress[];
};

export type EnrollmentProgressUpdate = {
  overallPercent?: number;
  currentLessonId?: string | null;
  modulesProgress?: EnrollmentModuleProgress[];
};

function normalizeEnrollment(raw: unknown): CourseEnrollment {
  const value = raw as Partial<CourseEnrollment> & Record<string, unknown>;
  return {
    courseId: String(value.courseId ?? ""),
    enrolledAt: String(value.enrolledAt ?? ""),
    completedAt: value.completedAt ? String(value.completedAt) : null,
    overallPercent: Math.min(100, Math.max(0, Number(value.overallPercent ?? 0))),
    currentLessonId: value.currentLessonId ? String(value.currentLessonId) : null,
    lastAccessedAt: String(value.lastAccessedAt ?? value.enrolledAt ?? ""),
    modulesProgress: Array.isArray(value.modulesProgress)
      ? value.modulesProgress as EnrollmentModuleProgress[]
      : [],
  };
}

export async function getMyEnrollments(): Promise<CourseEnrollment[]> {
  const result = await apiJson<unknown>("/api/enrollments");
  if (!Array.isArray(result)) return [];
  return result.map(normalizeEnrollment);
}

export async function enrollInCourse(courseSlug: string): Promise<CourseEnrollment> {
  const result = await apiJson<unknown>(`/api/enrollments/${encodeURIComponent(courseSlug)}`, {
    method: "POST",
  });
  return normalizeEnrollment(result);
}

export async function updateEnrollmentProgress(
  courseSlug: string,
  progress: EnrollmentProgressUpdate,
): Promise<CourseEnrollment> {
  const result = await apiJson<unknown>(
    `/api/enrollments/${encodeURIComponent(courseSlug)}/progress`,
    {
      method: "PUT",
      body: JSON.stringify({
        overallPercent: progress.overallPercent,
        currentLessonId: progress.currentLessonId,
        modulesProgress: progress.modulesProgress,
      }),
    },
  );
  return normalizeEnrollment(result);
}
