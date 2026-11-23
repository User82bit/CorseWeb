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

export type ExerciseAttemptResult = {
  lessonId: string;
  exerciseNodeId: string;
  isCorrect: boolean;
  passed: boolean;
  score: number;
  completedAt: string;
};

export type CourseCertificate = {
  verificationCode: string;
  studentName: string;
  courseTitle: string;
  authorName: string;
  courseVersion: number;
  courseCompletedAt: string;
  issuedAt: string;
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
  exerciseAttempts: ExerciseAttemptResult[];
  certificate: CourseCertificate | null;
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
    exerciseAttempts: Array.isArray(value.exerciseAttempts)
      ? value.exerciseAttempts.map((attempt) => {
          const item = attempt as Partial<ExerciseAttemptResult>;
          return {
            lessonId: String(item.lessonId ?? ""),
            exerciseNodeId: String(item.exerciseNodeId ?? ""),
            isCorrect: item.isCorrect === true,
            passed: item.passed === true,
            score: Math.min(100, Math.max(0, Number(item.score ?? 0))),
            completedAt: String(item.completedAt ?? ""),
          };
        }).filter((attempt) => attempt.lessonId && attempt.exerciseNodeId)
      : [],
    certificate: value.certificate && typeof value.certificate === "object"
      ? (() => {
          const item = value.certificate as Partial<CourseCertificate>;
          const certificate = {
            verificationCode: String(item.verificationCode ?? ""),
            studentName: String(item.studentName ?? ""),
            courseTitle: String(item.courseTitle ?? ""),
            authorName: String(item.authorName ?? ""),
            courseVersion: Math.max(1, Number(item.courseVersion ?? 1)),
            courseCompletedAt: String(item.courseCompletedAt ?? ""),
            issuedAt: String(item.issuedAt ?? ""),
          };
          return certificate.verificationCode && certificate.studentName && certificate.courseTitle
            ? certificate
            : null;
        })()
      : null,
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

/** Submits a code/text response; the backend compares it with the private reference answer. */
export async function submitEnrollmentExerciseAttempt(
  courseSlug: string,
  lessonId: string,
  exerciseNodeId: string,
  answer: string,
): Promise<CourseEnrollment> {
  const result = await apiJson<unknown>(
    `/api/enrollments/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}/exercises/${encodeURIComponent(exerciseNodeId)}/attempt`,
    {
      method: "POST",
      body: JSON.stringify({ answer }),
    },
  );
  return normalizeEnrollment(result);
}

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

/** Issues the immutable course-completion certificate after the server confirms eligibility. */
export async function issueEnrollmentCertificate(courseSlug: string): Promise<CourseEnrollment> {
  const result = await apiJson<unknown>(
    `/api/enrollments/${encodeURIComponent(courseSlug)}/certificate`,
    { method: "POST" },
  );
  return normalizeEnrollment(result);
}

/**
 * Records the student's completion action for one lesson.
 * The API validates publication and calculates all progress values.
 */
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
