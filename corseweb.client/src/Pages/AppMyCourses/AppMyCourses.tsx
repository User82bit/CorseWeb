import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getPublishedCourses, refreshCourses, subscribeCourses } from "../../store/courseStore";
import {
  getMyEnrollments,
  type CourseEnrollment,
} from "../../store/enrollmentStore";
import type { Course } from "../../types/course";
import "./AppMyCourses.scss";

type CourseFilter = "all" | "progress" | "completed";
type EnrolledCourse = { course: Course; enrollment: CourseEnrollment };

function formatDate(value: string, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function AppMyCourses() {
  const { t, locale } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(() => getPublishedCourses());
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      await refreshCourses();
      setCourses(getPublishedCourses());
      setEnrollments(await getMyEnrollments());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCourses(() => {
      if (active) setCourses(getPublishedCourses());
    });

    async function initialLoad() {
      setLoading(true);
      try {
        await refreshCourses();
        if (!active) return;
        setCourses(getPublishedCourses());
        const result = await getMyEnrollments();
        if (active) setEnrollments(result);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialLoad();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const enrolledCourses = useMemo<EnrolledCourse[]>(() => {
    const byId = new Map(courses.map(course => [course.id, course]));
    return enrollments
      .map(enrollment => {
        const course = byId.get(enrollment.courseId);
        return course?.status === "publicado" ? { course, enrollment } : null;
      })
      .filter((item): item is EnrolledCourse => item !== null)
      .sort((a, b) => b.enrollment.lastAccessedAt.localeCompare(a.enrollment.lastAccessedAt));
  }, [courses, enrollments]);

  const completedCount = enrolledCourses.filter(item => item.enrollment.overallPercent >= 100).length;
  const inProgressCount = enrolledCourses.length - completedCount;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return enrolledCourses.filter(({ course, enrollment }) => {
      if (filter === "completed" && enrollment.overallPercent < 100) return false;
      if (filter === "progress" && enrollment.overallPercent >= 100) return false;
      if (!normalized) return true;
      return [
        course.title,
        course.description,
        course.category,
        course.authorName,
      ].some(value => value.toLocaleLowerCase(locale).includes(normalized));
    });
  }, [enrolledCourses, filter, locale, query]);

  function getContinuePath(course: Course, enrollment: CourseEnrollment) {
    const allLessons = course.modules.flatMap(module => module.lessons);
    const current = allLessons.find(lesson => lesson.id === enrollment.currentLessonId);
    const next = current ?? allLessons[0];
    return next
      ? `/app/courses/${course.slug}/lessons/${next.slug}`
      : `/app/courses/${course.slug}`;
  }

  return (
    <div className="student-courses">
      <section className="student-courses__hero" aria-labelledby="student-courses-title">
        <div className="student-courses__hero-copy">
          <p className="student-courses__eyebrow">
            <span aria-hidden="true" />
            {t.learning.myCoursesEyebrow}
          </p>
          <h1 id="student-courses-title">{t.learning.myCoursesTitle}</h1>
          <p>{t.learning.myCoursesDescription}</p>
          <Link to="/courses" className="student-courses__hero-action">
            <SvgIcon name="search" size="1.1rem" />
            {t.learning.browseCatalog}
            <SvgIcon name="arrow-right" size="1rem" />
          </Link>
        </div>
        <div className="student-courses__hero-art" aria-hidden="true">
          <span className="student-courses__hero-orbit student-courses__hero-orbit--one" />
          <span className="student-courses__hero-orbit student-courses__hero-orbit--two" />
          <span className="student-courses__hero-book"><SvgIcon name="book-open" size="2.5rem" /></span>
          <span className="student-courses__hero-spark" />
        </div>
      </section>

      <section className="student-courses__summary" aria-label={t.learning.myCoursesTitle}>
        <article className="student-courses__summary-card">
          <span className="student-courses__summary-icon student-courses__summary-icon--blue"><SvgIcon name="book-open" size="1.2rem" /></span>
          <div><strong>{enrolledCourses.length}</strong><span>{t.learning.filterAll}</span></div>
        </article>
        <article className="student-courses__summary-card">
          <span className="student-courses__summary-icon student-courses__summary-icon--mint"><SvgIcon name="clock" size="1.2rem" /></span>
          <div><strong>{inProgressCount}</strong><span>{t.learning.filterInProgress}</span></div>
        </article>
        <article className="student-courses__summary-card">
          <span className="student-courses__summary-icon student-courses__summary-icon--violet"><SvgIcon name="check" size="1.2rem" /></span>
          <div><strong>{completedCount}</strong><span>{t.learning.filterCompleted}</span></div>
        </article>
      </section>

      <section className="student-courses__library" aria-labelledby="student-courses-library-title">
        <div className="student-courses__section-heading">
          <div>
            <p className="student-courses__section-eyebrow">{t.learning.myCoursesEyebrow}</p>
            <h2 id="student-courses-library-title">{t.learning.myCoursesTitle}</h2>
          </div>
          <label className="student-courses__search">
            <SvgIcon name="search" size="1.1rem" />
            <span className="student-courses__visually-hidden">{t.learning.searchMyCourses}</span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t.learning.searchMyCourses}
              autoComplete="off"
            />
            {query && <button type="button" aria-label={t.catalog.clearFilters} onClick={() => setQuery("")}><SvgIcon name="close" size="1rem" /></button>}
          </label>
        </div>

        <div className="student-courses__filters" role="group" aria-label={t.learning.myCoursesTitle}>
          {([
            ["all", t.learning.filterAll, enrolledCourses.length],
            ["progress", t.learning.filterInProgress, inProgressCount],
            ["completed", t.learning.filterCompleted, completedCount],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "student-courses__filter student-courses__filter--active" : "student-courses__filter"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              <span>{label}</span><span className="student-courses__filter-count">{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="student-courses__state" role="status" aria-live="polite" aria-busy="true">
            <span className="student-courses__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
            <h3>{t.learning.loadingMyCourses}</h3>
            <div className="student-courses__skeletons" aria-hidden="true"><span /><span /><span /></div>
          </div>
        ) : error ? (
          <div className="student-courses__state">
            <span className="student-courses__state-icon student-courses__state-icon--error"><SvgIcon name="search" size="1.4rem" /></span>
            <h3>{t.learning.myCoursesErrorTitle}</h3>
            <p>{t.learning.myCoursesErrorDescription}</p>
            <button type="button" className="student-courses__button student-courses__button--primary" onClick={loadData}>{t.learning.retry}</button>
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="student-courses__state">
            <span className="student-courses__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
            <h3>{t.learning.noCoursesTitle}</h3>
            <p>{t.learning.noCoursesDescription}</p>
            <Link to="/courses" className="student-courses__button student-courses__button--primary">{t.learning.browseCatalog}<SvgIcon name="arrow-right" size="1rem" /></Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="student-courses__state student-courses__state--compact">
            <span className="student-courses__state-icon"><SvgIcon name="search" size="1.4rem" /></span>
            <h3>{t.learning.noSearchResultsTitle}</h3>
            <p>{t.learning.noSearchResultsDescription}</p>
            <button type="button" className="student-courses__button student-courses__button--secondary" onClick={() => { setQuery(""); setFilter("all"); }}>{t.catalog.clearFilters}</button>
          </div>
        ) : (
          <div className="student-courses__grid">
            {filtered.map(({ course, enrollment }) => {
              const progress = Math.round(enrollment.overallPercent);
              const isCompleted = progress >= 100;
              const progressText = t.learning.courseProgress;
              return (
                <article className="student-course-card" key={enrollment.courseId}>
                  <Link to={`/app/courses/${course.slug}`} className="student-course-card__media">
                    <img src={course.thumbnail?.url || "/course-cover-placeholder.svg"} alt={course.thumbnail?.alt || course.title} loading="lazy" decoding="async" />
                    <span className={isCompleted ? "student-course-card__status student-course-card__status--completed" : "student-course-card__status"}>
                      {isCompleted ? t.learning.completedLabel : t.learning.enrolledLabel}
                    </span>
                  </Link>
                  <div className="student-course-card__body">
                    <div className="student-course-card__tags">
                      <span>{course.category}</span><span>{course.level}</span>
                    </div>
                    <h3><Link to={`/app/courses/${course.slug}`}>{course.title}</Link></h3>
                    <p className="student-course-card__description">{course.shortDescription || course.description}</p>
                    <div className="student-course-card__progress-heading">
                      <span>{progressText}</span><strong>{progress}%</strong>
                    </div>
                    <div className="student-course-card__progress" role="progressbar" aria-label={t.learning.courseProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <p className="student-course-card__accessed">{t.learning.lastAccessed}: {formatDate(enrollment.lastAccessedAt, locale)}</p>
                    <Link to={getContinuePath(course, enrollment)} className={isCompleted ? "student-course-card__action student-course-card__action--secondary" : "student-course-card__action"}>
                      {isCompleted ? t.learning.reviewCourse : t.learning.continueCourse}
                      <SvgIcon name="arrow-right" size="1rem" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default AppMyCourses;
