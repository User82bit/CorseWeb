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

export type QuizAttemptResult = {
  lessonId: string;
  quizNodeId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  passed: boolean;
  score: number;
  completedAt: string;
};

export type CourseEnrollment = {
  courseId: string;
  enrolledAt: string;
  completedAt: string | null;
  overallPercent: number;
  currentLessonId: string | null;
  lastAccessedAt: string;
  modulesProgress: EnrollmentModuleProgress[];
  quizAttempts: QuizAttemptResult[];
};

export type EnrollmentProgressUpdate = {
  currentLessonId?: string | null;
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
    quizAttempts: Array.isArray(value.quizAttempts)
      ? value.quizAttempts.map((attempt) => {
          const item = attempt as Partial<QuizAttemptResult>;
          return {
            lessonId: String(item.lessonId ?? ""),
            quizNodeId: String(item.quizNodeId ?? ""),
            selectedOptionIndex: Number(item.selectedOptionIndex ?? -1),
            isCorrect: item.isCorrect === true,
            passed: item.passed === true,
            score: Math.min(100, Math.max(0, Number(item.score ?? 0))),
            completedAt: String(item.completedAt ?? ""),
          };
        }).filter((attempt) => attempt.lessonId && attempt.quizNodeId)
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
        currentLessonId: progress.currentLessonId,
      }),
    },
  );
  return normalizeEnrollment(result);
}

/**
 * Records the student's completion action for one lesson.
 * The API validates publication and calculates all progress values.
 */
/** Submits one answer; the backend evaluates and persists the result. */
export async function submitEnrollmentQuizAttempt(
  courseSlug: string,
  lessonId: string,
  quizNodeId: string,
  selectedOptionIndex: number,
): Promise<CourseEnrollment> {
  const result = await apiJson<unknown>(
    `/api/enrollments/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}/quizzes/${encodeURIComponent(quizNodeId)}/attempt`,
    {
      method: "POST",
      body: JSON.stringify({ selectedOptionIndex }),
    },
  );
  return normalizeEnrollment(result);
}

export async function completeEnrollmentLesson(
  courseSlug: string,
  lessonId: string,
): Promise<CourseEnrollment> {
  const result = await apiJson<unknown>(
    `/api/enrollments/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}/complete`,
    { method: "POST" },
  );
  return normalizeEnrollment(result);
}
