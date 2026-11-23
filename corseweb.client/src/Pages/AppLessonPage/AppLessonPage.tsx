import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getCourseBySlugStore, refreshCourses, subscribeCourses } from "../../store/courseStore";
import {
  enrollInCourse,
  getMyEnrollments,
  completeEnrollmentLesson,
  submitEnrollmentQuizAttempt,
  updateEnrollmentProgress,
  type CourseEnrollment,
  type EnrollmentProgressUpdate,
} from "../../store/enrollmentStore";
import type { Course } from "../../types/course";
import { getLessonPresentationStyle, isStudentVisibleNode } from "./lessonPresentation";
import { sortNodesByLessonFlow } from "./lessonFlow";
import { LessonContentTree } from "./LessonContentRenderer";
import "./AppLessonPage.scss";

function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
}

function AppLessonPage() {
  const { t, locale } = useTranslation();
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  const [course, setCourse] = useState<Course | undefined>(() => courseSlug ? getCourseBySlugStore(courseSlug) : undefined);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState(false);
  const [submittingQuizNodeId, setSubmittingQuizNodeId] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
  const lastTrackedLesson = useRef<string | null>(null);
  const pendingProgress = useRef<EnrollmentProgressUpdate | null>(null);
  const pendingCompletionLesson = useRef<string | null>(null);
  const progressRequestVersion = useRef(0);

  const loadLessonData = useCallback(async () => {
    if (!courseSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      await refreshCourses();
      const loadedCourse = getCourseBySlugStore(courseSlug);
      setCourse(loadedCourse);
      const myEnrollments = await getMyEnrollments();
      setEnrollment(loadedCourse
        ? myEnrollments.find(item => item.courseId === loadedCourse.id) ?? null
        : null);
    } catch {
      setCourse(getCourseBySlugStore(courseSlug));
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadLessonData();
    });
    return () => { active = false; };
  }, [loadLessonData]);

  useEffect(() => {
    if (!courseSlug) return;
    return subscribeCourses(() => setCourse(getCourseBySlugStore(courseSlug)));
  }, [courseSlug]);

  const modules = useMemo(() => course?.modules ?? [], [course?.modules]);
  const allLessons = useMemo(() =>
    modules.flatMap(module => [...module.lessons].sort((a, b) => a.order - b.order)),
  [modules]);
  const lesson = allLessons.find(item => item.slug === lessonSlug);
  const lessonIndex = lesson ? allLessons.findIndex(item => item.id === lesson.id) : -1;
  const previousLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;
  const currentModule = modules.find(module => module.lessons.some(item => item.id === lesson?.id));
  const lessonProgress = enrollment?.modulesProgress
    .flatMap(module => module.lessons ?? [])
    .find(progress => progress.lessonId === lesson?.id);
  const isLessonComplete = lessonProgress?.status === "concluido";
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const accessKey = course && lesson ? `${course.id}:${lesson.id}` : null;

  useEffect(() => {
    if (!course || course.status !== "publicado" || !lesson || !enrollment || !accessKey) return;
    if (lastTrackedLesson.current === accessKey) return;
    lastTrackedLesson.current = accessKey;

    let active = true;
    setSaveError(false);
    const progressUpdate: EnrollmentProgressUpdate = {
      currentLessonId: lesson.id,
    };
    pendingProgress.current = progressUpdate;
    const requestVersion = ++progressRequestVersion.current;
    updateEnrollmentProgress(course.slug, progressUpdate).then(updated => {
      if (pendingProgress.current === progressUpdate) pendingProgress.current = null;
      if (active && requestVersion === progressRequestVersion.current) setEnrollment(updated);
    }).catch(() => {
      if (active && requestVersion === progressRequestVersion.current) setSaveError(true);
    });
    return () => { active = false; };
  }, [accessKey, course, enrollment, lesson]);

  const handleEnroll = async () => {
    if (!course || enrolling) return;
    setEnrolling(true);
    setEnrollmentError(false);
    try {
      setEnrollment(await enrollInCourse(course.slug));
    } catch {
      setEnrollmentError(true);
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteLesson = async () => {
    const hasUnansweredQuiz = !!lesson?.nodes?.some(node =>
      node.type === "quiz"
      && !enrollment?.quizAttempts.some(attempt =>
        attempt.lessonId === lesson.id && attempt.quizNodeId === node.id));
    if (!course || !lesson || !enrollment || saving || isLessonComplete || hasUnansweredQuiz) return;
    setSaving(true);
    setSaveError(false);
    pendingCompletionLesson.current = lesson.id;
    const requestVersion = ++progressRequestVersion.current;

    try {
      const updated = await completeEnrollmentLesson(course.slug, lesson.id);
      pendingCompletionLesson.current = null;
      if (requestVersion === progressRequestVersion.current) setEnrollment(updated);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleQuizSubmit = async (quizNodeId: string, selectedOptionIndex: number) => {
    if (!course || !lesson || !enrollment || submittingQuizNodeId) return;
    setSubmittingQuizNodeId(quizNodeId);
    setQuizSubmitError(null);

    try {
      const updatedEnrollment = await submitEnrollmentQuizAttempt(
        course.slug,
        lesson.id,
        quizNodeId,
        selectedOptionIndex,
      );
      setEnrollment(updatedEnrollment);

      // Refresh the public course projection. The API now returns only the
      // branch unlocked by this server-recorded result for the current user.
      try {
        await refreshCourses();
        const refreshedCourse = getCourseBySlugStore(course.slug);
        if (refreshedCourse) setCourse(refreshedCourse);
      } catch {
        // The attempt is already persisted; the next normal load will refresh
        // the graph projection without asking the learner to answer again.
      }
    } catch {
      setQuizSubmitError(
        locale.startsWith("en")
          ? "The answer could not be evaluated. Check your connection and try again."
          : locale.startsWith("es")
            ? "No se pudo evaluar la respuesta. Comprueba tu conexión e inténtalo de nuevo."
            : "Não foi possível avaliar a resposta. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setSubmittingQuizNodeId(null);
    }
  };

  const handleRetryProgress = async () => {
    if (!course || !enrollment || saving) return;

    const completionLessonId = pendingCompletionLesson.current;
    const progressUpdate = pendingProgress.current ?? {
      currentLessonId: lesson?.id ?? enrollment.currentLessonId,
    };
    const requestVersion = ++progressRequestVersion.current;
    setSaving(true);
    setSaveError(false);

    try {
      const updated = completionLessonId
        ? await completeEnrollmentLesson(course.slug, completionLessonId)
        : await updateEnrollmentProgress(course.slug, progressUpdate);
      if (completionLessonId && pendingCompletionLesson.current === completionLessonId)
        pendingCompletionLesson.current = null;
      if (!completionLessonId) pendingProgress.current = null;
      if (requestVersion === progressRequestVersion.current) setEnrollment(updated);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="student-lesson__state" role="status" aria-live="polite">
        <span className="student-lesson__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
        <h1>{t.common.loading}</h1>
      </div>
    );
  }

  if (!course || course.status !== "publicado") {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon student-lesson__state-icon--error"><SvgIcon name="search" size="1.4rem" /></span>
        <h1>{t.learning.courseNotFoundTitle}</h1>
        <p>{t.learning.courseNotFoundDescription}</p>
        <Link to="/app/courses" className="student-lesson__button student-lesson__button--primary">{t.learning.backToMyCourses}</Link>
      </div>
    );
  }

  if (loadError && !enrollment) {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon student-lesson__state-icon--error"><SvgIcon name="bell" size="1.4rem" /></span>
        <h1>{t.learning.myCoursesErrorTitle}</h1>
        <p>{t.learning.myCoursesErrorDescription}</p>
        <button type="button" className="student-lesson__button student-lesson__button--primary" onClick={() => void loadLessonData()}>{t.learning.retry}</button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon student-lesson__state-icon--error"><SvgIcon name="search" size="1.4rem" /></span>
        <h1>{t.learning.lessonNotFoundTitle}</h1>
        <p>{t.learning.lessonNotFoundDescription}</p>
        <Link to={`/app/courses/${course.slug}`} className="student-lesson__button student-lesson__button--primary">{t.learning.backToMyCourses}</Link>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
        <p className="student-lesson__state-eyebrow">{course.title}</p>
        <h1>{t.learning.enrollmentRequiredTitle}</h1>
        <p>{t.learning.enrollmentRequiredDescription}</p>
        <button type="button" className="student-lesson__button student-lesson__button--primary" onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? t.learning.enrolling : t.learning.enrollNow}
          <SvgIcon name="arrow-right" size="1rem" />
        </button>
        <Link to={`/app/courses/${course.slug}`} className="student-lesson__text-link">{t.learning.backToMyCourses}</Link>
        {enrollmentError && <p role="alert" className="student-lesson__error">{t.learning.enrollmentError}</p>}
      </div>
    );
  }

  const completionPercent = Math.round(enrollment.overallPercent);
  const quizAttemptsForLesson = enrollment.quizAttempts.filter(attempt => attempt.lessonId === lesson.id);
  const activeQuizNodes = (lesson.nodes ?? []).filter(node => node.type === "quiz");
  const hasPendingQuiz = activeQuizNodes.some(node =>
    !quizAttemptsForLesson.some(attempt => attempt.quizNodeId === node.id));
  const quizCompletionHint = locale.startsWith("en")
    ? "Answer every Quiz in this lesson before marking it complete."
    : locale.startsWith("es")
      ? "Responde todos los cuestionarios de esta lección antes de completarla."
      : "Responda a todos os quizzes desta aula antes de concluí-la.";
  // The graph defines reading order; canvas geometry remains authoring-only.
  const studentNodes = sortNodesByLessonFlow(lesson.nodes ?? [], lesson.connections ?? [])
    .filter(isStudentVisibleNode);
  const readingTime = interpolate(t.learning.readingTime, { count: number(lesson.estimatedMinutes) });
  const lessonCountText = interpolate(t.learning.lessonNumber, { index: number(lessonIndex + 1), count: number(allLessons.length) });

  return (
    <div className="student-lesson">
      <header className="student-lesson__topbar">
        <Link to={`/app/courses/${course.slug}`} className="student-lesson__back">
          <SvgIcon name="arrow-left" size="1rem" />
          <span>{course.title}</span>
        </Link>
        <div className="student-lesson__top-progress">
          <div className="student-lesson__top-progress-row"><span>{t.learning.courseProgress}</span><strong>{completionPercent}%</strong></div>
          <div className="student-lesson__top-progress-bar" role="progressbar" aria-label={t.learning.courseProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent}>
            <span style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </header>

      {saveError && (
        <div className="student-lesson__notice" role="alert">
          <SvgIcon name="bell" size="1rem" />
          <span>{t.learning.saveProgressError}</span>
          <button type="button" onClick={() => void handleRetryProgress()} disabled={saving}>{saving ? t.learning.savingProgress : t.learning.retry}</button>
        </div>
      )}

      <main className="student-lesson__main" id="lesson-content">
        <article className="student-lesson__article" style={getLessonPresentationStyle(lesson.presentation)}>
          <nav className="student-lesson__breadcrumbs" aria-label={t.learning.lessonNavigation}>
            <Link to="/app/courses">{t.learning.myCoursesTitle}</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/app/courses/${course.slug}`}>{course.title}</Link>
            {currentModule && <><span aria-hidden="true">/</span><span>{currentModule.title}</span></>}
          </nav>

          <header className="student-lesson__lesson-header">
            <p className="student-lesson__eyebrow">{currentModule?.title ?? t.learning.modulesTitle}</p>
            <h1>{lesson.title}</h1>
            {lesson.description && <p className="student-lesson__description">{lesson.description}</p>}
            <div className="student-lesson__meta">
              <span><SvgIcon name="book-open" size="0.95rem" />{lessonCountText}</span>
              <span><SvgIcon name="clock" size="0.95rem" />{readingTime}</span>
              {isLessonComplete && <span className="student-lesson__completed-badge"><SvgIcon name="check" size="0.9rem" />{t.learning.lessonCompleted}</span>}
            </div>
          </header>

          {studentNodes.length === 0 ? (
            <div className="student-lesson__empty-content">
              <span className="student-lesson__state-icon"><SvgIcon name="book-open" size="1.35rem" /></span>
              <h2>{t.learning.noLessonContentTitle}</h2>
              <p>{t.learning.noLessonContentDescription}</p>
            </div>
          ) : (
            <LessonContentTree
              nodes={lesson.nodes ?? []}
              connections={lesson.connections ?? []}
              quizAttempts={quizAttemptsForLesson}
              onQuizSubmit={handleQuizSubmit}
              submittingQuizNodeId={submittingQuizNodeId}
              quizError={quizSubmitError}
              locale={locale}
            />
          )}

          <section className="student-lesson__completion">
            <div className="student-lesson__completion-copy">
              <span className={isLessonComplete ? "student-lesson__completion-icon student-lesson__completion-icon--done" : "student-lesson__completion-icon"}>
                <SvgIcon name="check" size="1.15rem" />
              </span>
              <div>
                <h2>{isLessonComplete ? t.learning.lessonCompleted : t.learning.completeLesson}</h2>
                <p>{isLessonComplete ? t.learning.courseProgress + ": " + completionPercent + "%" : hasPendingQuiz ? quizCompletionHint : t.learning.lessonCompletionDescription}</p>
              </div>
            </div>
            <button
              type="button"
              className={isLessonComplete ? "student-lesson__button student-lesson__button--completed" : "student-lesson__button student-lesson__button--primary"}
              onClick={handleCompleteLesson}
              disabled={saving || isLessonComplete || hasPendingQuiz}
            >
              {saving ? t.learning.savingProgress : isLessonComplete ? t.learning.lessonCompleted : hasPendingQuiz ? (locale.startsWith("en") ? "Answer the Quiz first" : locale.startsWith("es") ? "Responde el cuestionario" : "Responda ao Quiz primeiro") : t.learning.completeLesson}
              {!isLessonComplete && <SvgIcon name="check" size="1rem" />}
            </button>
          </section>

          <nav className="student-lesson__navigation" aria-label={t.learning.lessonNavigation}>
            {previousLesson ? (
              <Link to={`/app/courses/${course.slug}/lessons/${previousLesson.slug}`} className="student-lesson__nav-button student-lesson__nav-button--previous">
                <SvgIcon name="arrow-left" size="1rem" />
                <span><small>{t.learning.previousLesson}</small><strong>{previousLesson.title}</strong></span>
              </Link>
            ) : <span />}
            {nextLesson ? (
              <Link to={`/app/courses/${course.slug}/lessons/${nextLesson.slug}`} className="student-lesson__nav-button student-lesson__nav-button--next">
                <span><small>{t.learning.nextLesson}</small><strong>{nextLesson.title}</strong></span>
                <SvgIcon name="arrow-right" size="1rem" />
              </Link>
            ) : (
              <Link to={`/app/courses/${course.slug}`} className="student-lesson__nav-button student-lesson__nav-button--next">
                <span><small>{t.learning.modulesTitle}</small><strong>{t.learning.backToMyCourses}</strong></span>
                <SvgIcon name="arrow-right" size="1rem" />
              </Link>
            )}
          </nav>
        </article>
      </main>
    </div>
  );
}

export default AppLessonPage;
