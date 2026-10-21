import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getCourseBySlugStore, refreshCourses, subscribeCourses } from "../../store/courseStore";
import { enrollInCourse, getMyEnrollments, type CourseEnrollment } from "../../store/enrollmentStore";
import type { Course } from "../../types/course";
import "./AppCourseDetailPage.scss";

function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
}

function AppCourseDetailPage() {
  const { t, locale } = useTranslation();
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | undefined>(() => courseSlug ? getCourseBySlugStore(courseSlug) : undefined);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!courseSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      await refreshCourses();
      setCourse(getCourseBySlugStore(courseSlug));
      const enrollments = await getMyEnrollments();
      const currentCourse = getCourseBySlugStore(courseSlug);
      setEnrollment(currentCourse
        ? enrollments.find(item => item.courseId === currentCourse.id) ?? null
        : null);
    } catch {
      setLoadError(true);
      setCourse(getCourseBySlugStore(courseSlug));
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  useEffect(() => { void loadCourse(); }, [loadCourse]);

  useEffect(() => {
    if (!courseSlug) return;
    const sync = () => setCourse(getCourseBySlugStore(courseSlug));
    return subscribeCourses(sync);
  }, [courseSlug]);

  const modules = course?.modules ?? [];
  const allLessons = useMemo(
    () => modules.flatMap(module => [...module.lessons].sort((a, b) => a.order - b.order)),
    [modules],
  );
  const firstLesson = allLessons[0];
  const currentLesson = allLessons.find(lesson => lesson.id === enrollment?.currentLessonId);
  const continuationLesson = currentLesson ?? firstLesson;
  const completedLessons = new Set(
    (enrollment?.modulesProgress ?? []).flatMap(module =>
      (module.lessons ?? []).filter(lesson => lesson.status === "concluido").map(lesson => lesson.lessonId)),
  );
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const estimatedHours = course ? Math.max(1, Math.round(course.totalMinutes / 60)) : 0;

  async function handleEnroll() {
    if (!course || enrolling) return;
    setEnrolling(true);
    setActionError(false);
    try {
      const saved = await enrollInCourse(course.slug);
      setEnrollment(saved);
      const all = course.modules.flatMap(module => module.lessons);
      const savedLesson = all.find(lesson => lesson.id === saved.currentLessonId) ?? all[0];
      if (savedLesson) navigate(`/app/courses/${course.slug}/lessons/${savedLesson.slug}`);
    } catch {
      setActionError(true);
    } finally {
      setEnrolling(false);
    }
  }

  if (loading && !course) {
    return (
      <div className="student-course-detail__state" role="status" aria-live="polite">
        <span className="student-course-detail__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
        <h1>{t.common.loading}</h1>
      </div>
    );
  }

  if (!course || course.status !== "publicado") {
    return (
      <div className="student-course-detail__state">
        <span className="student-course-detail__state-icon student-course-detail__state-icon--error"><SvgIcon name="search" size="1.4rem" /></span>
        <h1>{t.learning.courseNotFoundTitle}</h1>
        <p>{t.learning.courseNotFoundDescription}</p>
        {loadError && <p role="status">{t.app.catalogSyncWarning}</p>}
        <Link to="/app/courses" className="student-course-detail__button student-course-detail__button--primary">
          {t.learning.backToMyCourses}
        </Link>
        <Link to="/courses" className="student-course-detail__text-link">{t.learning.browseCatalog}</Link>
      </div>
    );
  }

  return (
    <div className="student-course-detail">
      <nav className="student-course-detail__breadcrumbs" aria-label={t.learning.modulesTitle}>
        <Link to="/app/courses"><SvgIcon name="arrow-left" size="1rem" />{t.learning.backToMyCourses}</Link>
        <span aria-hidden="true">/</span>
        <span>{course.title}</span>
      </nav>

      {loadError && (
        <p className="student-course-detail__notice" role="status">
          <SvgIcon name="bell" size="1rem" />{t.app.catalogSyncWarning}
          <button type="button" onClick={() => void loadCourse()}>{t.learning.retry}</button>
        </p>
      )}

      <section className="student-course-detail__hero" aria-labelledby="student-course-title">
        <div className="student-course-detail__hero-copy">
          <p className="student-course-detail__eyebrow"><span />{course.category} · {course.level}</p>
          <h1 id="student-course-title">{course.title}</h1>
          {course.subtitle && <p className="student-course-detail__subtitle">{course.subtitle}</p>}
          <p className="student-course-detail__description">{course.description}</p>
          <div className="student-course-detail__meta">
            <span><SvgIcon name="book-open" size="1rem" />{interpolate(t.learning.moduleCount, { count: number(course.totalModules || modules.length) })}</span>
            <span><SvgIcon name="check" size="1rem" />{interpolate(t.learning.lessonCount, { count: number(course.totalLessons || allLessons.length) })}</span>
            {course.totalMinutes > 0 && <span><SvgIcon name="clock" size="1rem" />{interpolate(t.learning.estimatedTime, { count: number(estimatedHours) })}</span>}
          </div>
          <p className="student-course-detail__author">{interpolate(t.learning.authorLabel, { name: course.authorName })}</p>

          {enrollment ? (
            <div className="student-course-detail__enrolled">
              <div className="student-course-detail__enrolled-copy">
                <span className="student-course-detail__enrolled-label"><SvgIcon name="check" size="0.9rem" />{t.learning.enrolledLabel}</span>
                <strong>{Math.round(enrollment.overallPercent)}%</strong>
              </div>
              <div className="student-course-detail__progress" role="progressbar" aria-label={t.learning.courseProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(enrollment.overallPercent)}>
                <span style={{ width: `${Math.round(enrollment.overallPercent)}%` }} />
              </div>
            </div>
          ) : null}

          {enrollment && continuationLesson ? (
            <Link to={`/app/courses/${course.slug}/lessons/${continuationLesson.slug}`} className="student-course-detail__button student-course-detail__button--light">
              {enrollment.overallPercent >= 100 ? t.learning.courseCompleted : t.learning.continueCourse}
              <SvgIcon name="arrow-right" size="1rem" />
            </Link>
          ) : enrollment ? (
            <span className="student-course-detail__enrolled-label"><SvgIcon name="check" size="0.9rem" />{t.learning.enrolledLabel}</span>
          ) : (
            <button type="button" className="student-course-detail__button student-course-detail__button--light" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? t.learning.enrolling : t.learning.startCourse}
              <SvgIcon name="arrow-right" size="1rem" />
            </button>
          )}

          {actionError && <p className="student-course-detail__action-error" role="alert">{t.learning.enrollmentError}</p>}
        </div>
        <div className="student-course-detail__hero-media">
          <img src={course.thumbnail?.url || "/hero.png"} alt={course.thumbnail?.alt || course.title} />
          <span className="student-course-detail__media-shine" />
          <span className="student-course-detail__media-icon"><SvgIcon name="book-open" size="1.6rem" /></span>
        </div>
      </section>

      <section className="student-course-detail__curriculum" aria-labelledby="student-course-curriculum-title">
        <header className="student-course-detail__curriculum-header">
          <div>
            <p className="student-course-detail__section-eyebrow">{t.learning.courseAvailable}</p>
            <h2 id="student-course-curriculum-title">{t.learning.modulesTitle}</h2>
          </div>
          <span>{interpolate(t.learning.lessonCount, { count: number(allLessons.length) })}</span>
        </header>

        {modules.length === 0 ? (
          <div className="student-course-detail__state student-course-detail__state--inline">
            <span className="student-course-detail__state-icon"><SvgIcon name="book-open" size="1.3rem" /></span>
            <h3>{t.learning.emptyModulesTitle}</h3>
            <p>{t.learning.emptyModulesDescription}</p>
          </div>
        ) : (
          <ol className="student-course-detail__module-list">
            {modules.map((module, moduleIndex) => {
              const moduleLessons = [...module.lessons].sort((a, b) => a.order - b.order);
              const moduleProgress = enrollment?.modulesProgress.find(item => item.moduleId === module.id);
              const moduleDone = moduleLessons.filter(lesson => completedLessons.has(lesson.id)).length;
              return (
                <li className="student-course-module" key={module.id}>
                  <header className="student-course-module__header">
                    <span className="student-course-module__number">{String(moduleIndex + 1).padStart(2, "0")}</span>
                    <div className="student-course-module__title">
                      <h3>{module.title}</h3>
                      {module.description && <p>{module.description}</p>}
                      <span>{interpolate(t.learning.lessonCount, { count: number(moduleLessons.length) })} · {number(module.totalMinutes)} min</span>
                    </div>
                    {enrollment && <span className="student-course-module__module-progress">{moduleProgress?.percent ?? (moduleLessons.length ? Math.round(moduleDone / moduleLessons.length * 100) : 0)}%</span>}
                  </header>
                  {moduleLessons.length > 0 ? (
                    <ol className="student-course-module__lessons">
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const complete = completedLessons.has(lesson.id);
                        return (
                          <li key={lesson.id}>
                            <Link to={`/app/courses/${course.slug}/lessons/${lesson.slug}`} className="student-course-module__lesson">
                              <span className={complete ? "student-course-module__lesson-icon student-course-module__lesson-icon--complete" : "student-course-module__lesson-icon"}>
                                <SvgIcon name={complete ? "check" : "book-open"} size="0.95rem" />
                              </span>
                              <span className="student-course-module__lesson-copy">
                                <strong>{lesson.title}</strong>
                                <small>{interpolate(t.learning.lessonNumber, { index: number(lessonIndex + 1), count: number(moduleLessons.length) })}</small>
                              </span>
                              <span className="student-course-module__lesson-time">{interpolate(t.learning.readingTime, { count: number(lesson.estimatedMinutes) })}</span>
                              <SvgIcon name="arrow-right" size="1rem" />
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="student-course-module__empty">{t.learning.noCourseContentDescription}</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

export default AppCourseDetailPage;
