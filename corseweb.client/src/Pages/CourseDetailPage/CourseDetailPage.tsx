import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { formatEstimatedDuration } from "../../utils/formatEstimatedDuration";
import {
  getCurrentUser,
  getLoginRedirectPath,
  refreshAuth,
  subscribeAuth,
  type User,
} from "../../store/authStore";
import { getCourseBySlugStore, refreshCourses, subscribeCourses } from "../../store/courseStore";
import type { Course, Lesson, Module } from "../../types/course";
import "./CourseDetailPage.scss";

type CourseWithDraftState = Course & { isDraft?: boolean };

function formatCount(template: string, count: number, locale: string) {
  return template.replace("{count}", new Intl.NumberFormat(locale).format(count));
}

function getLessons(module: Module): Lesson[] {
  return Array.isArray(module.lessons) ? [...module.lessons].sort((a, b) => a.order - b.order) : [];
}

function CourseDetailPage() {
  const { t, locale } = useTranslation();
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const [course, setCourse] = useState<Course | undefined>(() => (
    courseSlug ? getCourseBySlugStore(courseSlug) : undefined
  ));
  const [loading, setLoading] = useState(() => !courseSlug || !getCourseBySlugStore(courseSlug));
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    let active = true;
    if (!courseSlug) {
      setCourse(undefined);
      setLoading(false);
      return;
    }

    const syncCourse = () => setCourse(getCourseBySlugStore(courseSlug));
    const unsubscribeCourses = subscribeCourses(syncCourse);
    const cachedCourse = getCourseBySlugStore(courseSlug);
    setCourse(cachedCourse);
    setLoading(!cachedCourse);
    setLoadError(false);

    refreshCourses()
      .then(() => {
        if (!active) return;
        syncCourse();
        setLoadError(false);
      })
      .catch(() => {
        if (!active) return;
        syncCourse();
        setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribeCourses();
    };
  }, [courseSlug]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAuth(() => setUser(getCurrentUser()));
    refreshAuth()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(getCurrentUser());
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const accountTarget = user ? getLoginRedirectPath(user) : "/login";
  const isDraft = Boolean((course as CourseWithDraftState | undefined)?.isDraft || course?.status === "rascunho");
  const modules = course?.modules ?? [];
  const allLessons = modules.flatMap(getLessons);
  const moduleCount = course?.totalModules || modules.length;
  const lessonCount = course?.totalLessons || allLessons.length;
  const estimatedDuration = course && course.totalMinutes > 0
    ? formatEstimatedDuration(course.totalMinutes, locale)
    : null;

  if (loading) {
    return (
      <div className="course-detail-page">
        <a className="course-detail-page__skip" href="#course-detail-main">{t.courseDetail.skipToContent}</a>
        <header className="course-detail-page__header">
          <div className="course-detail-page__header-inner">
            <Link to="/" className="course-detail-page__brand" aria-label={t.home.homeLinkLabel}>
              <img src="/favicon.ico" alt="" width={40} height={40} />
              <span>CorseWeb</span>
            </Link>
            <div className="course-detail-page__header-tools">
              <LanguageSwitcher />
              <Link to="/courses" className="course-detail-page__nav-link">{t.courseDetail.backToCatalog}</Link>
            </div>
          </div>
        </header>
        <main id="course-detail-main" className="course-detail-page__container">
          <div className="course-detail-page__state" role="status" aria-live="polite">
            <span className="course-detail-page__state-icon"><SvgIcon name="book-open" size="1.5rem" /></span>
            <h1>{t.courseDetail.loadingTitle}</h1>
            <p>{t.courseDetail.loadingDescription}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!course || (course.status !== "publicado" && !isDraft)) {
    return (
      <div className="course-detail-page">
        <a className="course-detail-page__skip" href="#course-detail-main">{t.courseDetail.skipToContent}</a>
        <header className="course-detail-page__header">
          <div className="course-detail-page__header-inner">
            <Link to="/" className="course-detail-page__brand" aria-label={t.home.homeLinkLabel}>
              <img src="/favicon.ico" alt="" width={40} height={40} />
              <span>CorseWeb</span>
            </Link>
            <div className="course-detail-page__header-tools">
              <LanguageSwitcher />
              <Link to="/courses" className="course-detail-page__nav-link">{t.courseDetail.backToCatalog}</Link>
            </div>
          </div>
        </header>
        <main id="course-detail-main" className="course-detail-page__container">
          <div className="course-detail-page__state">
            <span className="course-detail-page__state-icon course-detail-page__state-icon--error">
              <SvgIcon name="search" size="1.5rem" />
            </span>
            <h1>{t.courseDetail.notFoundTitle}</h1>
            <p>{loadError ? t.catalog.errorDescription : t.courseDetail.notFoundDescription}</p>
            <div className="course-detail-page__state-actions">
              {loadError && (
                <button type="button" className="course-detail-page__button course-detail-page__button--primary" onClick={() => {
                  setLoading(true);
                  refreshCourses()
                    .then(() => { setCourse(courseSlug ? getCourseBySlugStore(courseSlug) : undefined); setLoadError(false); })
                    .catch(() => setLoadError(true))
                    .finally(() => setLoading(false));
                }}>
                  {t.catalog.retryAction}
                </button>
              )}
              <Link to="/courses" className="course-detail-page__button course-detail-page__button--secondary">
                {t.courseDetail.backToCatalog}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const statusLabel = course.status === "publicado"
    ? t.admin.statusPublished
    : course.status === "arquivado"
      ? t.admin.statusArchived
      : t.admin.statusDraft;

  return (
    <div className="course-detail-page">
      <a className="course-detail-page__skip" href="#course-detail-main">{t.courseDetail.skipToContent}</a>

      <header className="course-detail-page__header">
        <div className="course-detail-page__header-inner">
          <Link to="/" className="course-detail-page__brand" aria-label={t.home.homeLinkLabel}>
            <img src="/favicon.ico" alt="" width={40} height={40} />
            <span>CorseWeb</span>
          </Link>
          <nav className="course-detail-page__nav" aria-label={t.courseDetail.primaryNavigation}>
            <Link to="/">{t.catalog.backHome}</Link>
            <Link to="/courses" className="course-detail-page__nav-link">{t.courseDetail.backToCatalog}</Link>
            <Link to={accountTarget} className="course-detail-page__nav-account">
              {user ? t.catalog.accountAction : t.home.login}
              <SvgIcon name="arrow-right" size="1rem" />
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <main id="course-detail-main" className="course-detail-page__container">
        <nav className="course-detail-page__breadcrumbs" aria-label={t.courseDetail.breadcrumbLabel}>
          <Link to="/courses"><SvgIcon name="arrow-left" size="1rem" />{t.courseDetail.backToCatalog}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{course.title}</span>
        </nav>

        {loadError && (
          <p className="course-detail-page__notice" role="status">
            <SvgIcon name="bell" size="1rem" />
            <span>{t.catalog.errorDescription}</span>
          </p>
        )}

        <section className="course-detail-page__hero" aria-labelledby="course-detail-title">
          <div className="course-detail-page__hero-copy">
            <p className="course-detail-page__eyebrow">
              <span aria-hidden="true" />
              {course.category} · {course.level}
            </p>
            <div className="course-detail-page__badges">
              <span className={course.status === "publicado"
                ? "course-detail-page__badge course-detail-page__badge--published"
                : "course-detail-page__badge course-detail-page__badge--draft"}>
                {statusLabel}
              </span>
              {course.isFeatured && <span className="course-detail-page__badge course-detail-page__badge--featured">{t.admin.featured}</span>}
            </div>
            <h1 id="course-detail-title">{course.title}</h1>
            {course.subtitle && <p className="course-detail-page__subtitle">{course.subtitle}</p>}
            <p className="course-detail-page__description">{course.description}</p>

            <div className="course-detail-page__meta" aria-label={t.courseDetail.aboutTitle}>
              <span><SvgIcon name="book-open" size="1rem" />{formatCount(t.learning.moduleCount, moduleCount, locale)}</span>
              <span><SvgIcon name="book-open" size="1rem" />{formatCount(t.learning.lessonCount, lessonCount, locale)}</span>
              {estimatedDuration && <span><SvgIcon name="clock" size="1rem" />{estimatedDuration}</span>}
            </div>
            <p className="course-detail-page__author">
              <SvgIcon name="user" size="1rem" />
              {t.learning.authorLabel.replace("{name}", course.authorName)}
            </p>

            {isDraft && <p className="course-detail-page__draft-note"><SvgIcon name="check" size="1rem" />{t.courseDetail.draftNotice}</p>}

            <div className="course-detail-page__hero-actions">
              {!isDraft && (
                <Link to={`/app/courses/${course.slug}`} className="course-detail-page__button course-detail-page__button--light">
                  {t.courseDetail.startLearning}
                  <SvgIcon name="arrow-right" size="1rem" />
                </Link>
              )}
              <Link to="/courses" className="course-detail-page__text-link">{t.courseDetail.backToCatalog}</Link>
            </div>
          </div>

          <div className="course-detail-page__hero-media">
            <img
              src={course.thumbnail?.url?.trim() || "/course-cover-placeholder.svg"}
              alt={course.thumbnail?.alt || course.title}
              loading="eager"
              onError={(event) => {
                if (!event.currentTarget.src.endsWith("/course-cover-placeholder.svg")) {
                  event.currentTarget.src = "/course-cover-placeholder.svg";
                }
              }}
            />
            <span className="course-detail-page__media-shine" aria-hidden="true" />
            <span className="course-detail-page__media-icon" aria-hidden="true"><SvgIcon name="book-open" size="1.5rem" /></span>
          </div>
        </section>

        <section className="course-detail-page__overview" aria-labelledby="course-detail-about-title">
          <article className="course-detail-page__about-card">
            <p className="course-detail-page__section-eyebrow">{t.courseDetail.aboutTitle}</p>
            <h2 id="course-detail-about-title">{course.title}</h2>
            <p>{course.description}</p>
            {course.subtitle && <p className="course-detail-page__about-subtitle">{course.subtitle}</p>}
            <dl className="course-detail-page__facts">
              <div><dt>{t.courseDetail.categoryLabel}</dt><dd>{course.category}</dd></div>
              <div><dt>{t.courseDetail.levelLabel}</dt><dd>{course.level}</dd></div>
              <div><dt>{t.courseDetail.languageLabel}</dt><dd>{course.language}</dd></div>
              <div><dt>{t.courseDetail.statusLabel}</dt><dd>{statusLabel}</dd></div>
            </dl>
          </article>

          <aside className="course-detail-page__summary-card">
            <span className="course-detail-page__summary-icon"><SvgIcon name="book-open" size="1.3rem" /></span>
            <h2>{t.learning.modulesTitle}</h2>
            <p>{formatCount(t.learning.moduleCount, moduleCount, locale)} · {formatCount(t.learning.lessonCount, lessonCount, locale)}</p>
            {estimatedDuration && <span className="course-detail-page__summary-time"><SvgIcon name="clock" size="1rem" />{t.learning.estimatedTime.replace("{count}", estimatedDuration)}</span>}
            {!isDraft && (
              <Link to={`/app/courses/${course.slug}`} className="course-detail-page__button course-detail-page__button--primary">
                {t.courseDetail.startLearning}
                <SvgIcon name="arrow-right" size="1rem" />
              </Link>
            )}
          </aside>
        </section>

        <section className="course-detail-page__curriculum" aria-labelledby="course-detail-curriculum-title">
          <header className="course-detail-page__curriculum-header">
            <div>
              <p className="course-detail-page__section-eyebrow">{t.courseDetail.curriculumEyebrow}</p>
              <h2 id="course-detail-curriculum-title">{t.learning.modulesTitle}</h2>
            </div>
            <span>{formatCount(t.learning.moduleCount, moduleCount, locale)}</span>
          </header>

          {modules.length === 0 ? (
            <div className="course-detail-page__empty">
              <span className="course-detail-page__empty-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
              <h3>{t.learning.emptyModulesTitle}</h3>
              <p>{t.learning.emptyModulesDescription}</p>
            </div>
          ) : (
            <ol className="course-detail-page__module-list">
              {modules.map((module, moduleIndex) => {
                const lessons = getLessons(module);
                const duration = module.totalMinutes || lessons.reduce((sum, lesson) => sum + Math.max(0, lesson.estimatedMinutes || 0), 0);
                return (
                  <li className="course-detail-page__module" key={module.id}>
                    <header className="course-detail-page__module-header">
                      <span className="course-detail-page__module-number">{String(moduleIndex + 1).padStart(2, "0")}</span>
                      <div className="course-detail-page__module-title">
                        <h3>{module.title}</h3>
                        {module.description && <p>{module.description}</p>}
                        <span className="course-detail-page__module-meta">
                          {formatCount(t.learning.lessonCount, lessons.length, locale)}
                          {duration > 0 && ` · ${formatEstimatedDuration(duration, locale)}`}
                        </span>
                      </div>
                    </header>

                    {lessons.length > 0 && (
                      <ol className="course-detail-page__lesson-list">
                        {lessons.map((lesson, lessonIndex) => (
                          <li className="course-detail-page__lesson" key={lesson.id}>
                            <span className="course-detail-page__lesson-icon"><SvgIcon name="book-open" size="1rem" /></span>
                            <div className="course-detail-page__lesson-copy">
                              <strong>{lesson.title}</strong>
                              <span>{formatCount(t.learning.lessonNumber.replace("{index}", String(lessonIndex + 1)), lessons.length, locale)}</span>
                            </div>
                            {lesson.estimatedMinutes > 0 && (
                              <span className="course-detail-page__lesson-time">{formatEstimatedDuration(lesson.estimatedMinutes, locale)}</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

export default CourseDetailPage;
