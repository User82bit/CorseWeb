import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getAllCourses, subscribeCourses, refreshCourses } from "../../store/courseStore";
import { getCurrentUser, subscribeAuth } from "../../store/authStore";
import type { Course } from "../../types/course";
import type { User } from "../../store/authStore";
import "./AppDashboard.scss";

function getPublishedCourses(): Course[] {
  return getAllCourses().filter((course) => course.status === "publicado");
}

function AppDashboard() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(() => getPublishedCourses());
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [isLoading, setIsLoading] = useState(() => getPublishedCourses().length === 0);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribeCourses = subscribeCourses(() => setCourses(getPublishedCourses()));
    const unsubscribeAuth = subscribeAuth(() => setUser(getCurrentUser()));

    refreshCourses()
      .catch(() => {
        if (isMounted) setLoadFailed(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribeCourses();
      unsubscribeAuth();
    };
  }, []);

  const suggestedCourses = useMemo(() => {
    const featured = courses.filter((course) => course.isFeatured);
    return (featured.length > 0 ? featured : courses).slice(0, 3);
  }, [courses]);

  const totalLessons = courses.reduce((total, course) => total + Math.max(0, course.totalLessons), 0);
  const topicCount = new Set(courses.map((course) => course.category.trim()).filter(Boolean)).size;
  const firstName = user?.name?.trim().split(/\s+/)[0] || t.app.defaultLearnerName;
  const greeting = t.app.greeting.replace("{name}", firstName);

  const retryCatalog = () => {
    setIsLoading(true);
    setLoadFailed(false);
    refreshCourses()
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="student-dashboard">
      <section className="student-dashboard__welcome" aria-labelledby="student-dashboard-title">
        <div className="student-dashboard__welcome-copy">
          <p className="student-dashboard__eyebrow">
            <span aria-hidden="true" className="student-dashboard__eyebrow-dot" />
            {t.app.welcomeEyebrow}
          </p>
          <h1 id="student-dashboard-title">{greeting}</h1>
          <p className="student-dashboard__welcome-description">{t.app.dashboardDescription}</p>
          <Link to="/courses" className="student-dashboard__welcome-action">
            <SvgIcon name="search" size="1.125rem" />
            <span>{t.app.exploreCatalog}</span>
            <SvgIcon name="arrow-right" size="1rem" />
          </Link>
        </div>
        <div className="student-dashboard__welcome-art" aria-hidden="true">
          <div className="student-dashboard__orbit student-dashboard__orbit--outer" />
          <div className="student-dashboard__orbit student-dashboard__orbit--inner" />
          <div className="student-dashboard__book">
            <SvgIcon name="book-open" size="3rem" />
          </div>
          <span className="student-dashboard__spark student-dashboard__spark--one" />
          <span className="student-dashboard__spark student-dashboard__spark--two" />
        </div>
      </section>

      {loadFailed && courses.length > 0 && (
        <p className="student-dashboard__sync-notice" role="status">
          <SvgIcon name="bell" size="1.125rem" />
          <span>{t.app.catalogSyncWarning}</span>
        </p>
      )}

      <section className="student-dashboard__stats" aria-label={t.app.catalogStatsTitle}>
        <article className="student-dashboard__stat">
          <span className="student-dashboard__stat-icon student-dashboard__stat-icon--blue">
            <SvgIcon name="book-open" size="1.25rem" />
          </span>
          <div>
            <strong>{courses.length}</strong>
            <span>{t.app.availableCourses}</span>
          </div>
        </article>
        <article className="student-dashboard__stat">
          <span className="student-dashboard__stat-icon student-dashboard__stat-icon--mint">
            <SvgIcon name="check" size="1.25rem" />
          </span>
          <div>
            <strong>{totalLessons}</strong>
            <span>{t.app.catalogLessons}</span>
          </div>
        </article>
        <article className="student-dashboard__stat">
          <span className="student-dashboard__stat-icon student-dashboard__stat-icon--violet">
            <SvgIcon name="monitor" size="1.25rem" />
          </span>
          <div>
            <strong>{topicCount}</strong>
            <span>{t.app.topicAreas}</span>
          </div>
        </article>
      </section>

      <section className="student-dashboard__courses" aria-labelledby="student-dashboard-courses-title">
        <header className="student-dashboard__section-heading">
          <div>
            <p className="student-dashboard__section-eyebrow">{t.app.coursesEyebrow}</p>
            <h2 id="student-dashboard-courses-title">{t.app.coursesTitle}</h2>
            <p>{t.app.coursesDescription}</p>
          </div>
          <Link to="/courses" className="student-dashboard__catalog-link">
            {t.app.viewCatalog}
            <SvgIcon name="arrow-right" size="1rem" />
          </Link>
        </header>

        {isLoading && courses.length === 0 ? (
          <div className="student-dashboard__loading" role="status" aria-live="polite">
            <p>{t.app.loadingCatalog}</p>
            <div className="student-dashboard__course-grid" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="student-course-card student-course-card--skeleton" key={index}>
                  <span />
                  <div><i /><i /><i /></div>
                </div>
              ))}
            </div>
          </div>
        ) : suggestedCourses.length > 0 ? (
          <div className="student-dashboard__course-grid">
            {suggestedCourses.map((course) => {
              const lessonLabel = course.totalLessons === 1
                ? t.app.oneLesson
                : t.app.manyLessons.replace("{count}", String(course.totalLessons));

              return (
                <article className="student-course-card" key={course.id}>
                  <Link
                    to={"/app/courses/" + course.slug}
                    className="student-course-card__media"
                    aria-label={t.app.openCourseNamed.replace("{title}", course.title)}
                  >
                    <span className="student-course-card__media-pattern" aria-hidden="true" />
                    <img
                      src={course.thumbnail.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => { event.currentTarget.hidden = true; }}
                    />
                    <span className="student-course-card__category">{course.category}</span>
                  </Link>
                  <div className="student-course-card__body">
                    <span className="student-course-card__level">{course.level}</span>
                    <h3>
                      <Link to={"/app/courses/" + course.slug}>{course.title}</Link>
                    </h3>
                    <p className="student-course-card__description">{course.shortDescription ?? course.description}</p>
                    <div className="student-course-card__meta">
                      {course.totalLessons > 0 ? (
                        <span>
                          <SvgIcon name="book-open" size="1rem" />
                          {lessonLabel}
                        </span>
                      ) : (
                        <span>{t.app.noLessonsYet}</span>
                      )}
                    </div>
                    <Link to={"/app/courses/" + course.slug} className="student-course-card__action">
                      {t.app.openCourse}
                      <SvgIcon name="arrow-right" size="1rem" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="student-dashboard__empty">
            <span className="student-dashboard__empty-icon" aria-hidden="true">
              <SvgIcon name={loadFailed ? "bell" : "book-open"} size="1.75rem" />
            </span>
            <h3>{loadFailed ? t.app.catalogErrorTitle : t.app.emptyCatalogTitle}</h3>
            <p>{loadFailed ? t.app.catalogErrorDescription : t.app.emptyCatalogDescription}</p>
            {loadFailed ? (
              <button type="button" className="student-dashboard__empty-action" onClick={retryCatalog}>
                <SvgIcon name="arrow-right" size="1rem" />
                {t.app.retryCatalog}
              </button>
            ) : (
              <Link to="/courses" className="student-dashboard__empty-action">
                {t.app.exploreCatalog}
                <SvgIcon name="arrow-right" size="1rem" />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AppDashboard;
