import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getAllCourses, refreshCourses, subscribeCourses, togglePublish } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AdminDashboard.scss";

function statusLabel(status: Course["status"], labels: { draft: string; published: string; archived: string }) {
  if (status === "publicado") return labels.published;
  if (status === "arquivado") return labels.archived;
  return labels.draft;
}

function statusClass(status: Course["status"]) {
  if (status === "publicado") return "admin-status admin-status--published";
  if (status === "arquivado") return "admin-status admin-status--archived";
  return "admin-status admin-status--draft";
}

function formatDate(value: string, locale: string) {
  const time = Date.parse(value);
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(time))
    : "—";
}

function AdminDashboard() {
  const { t, locale } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  const [loading, setLoading] = useState(() => getAllCourses().length === 0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeCourses(() => setCourses(getAllCourses()));

    refreshCourses()
      .then(() => { if (mounted) setLoadFailed(false); })
      .catch(() => { if (mounted) setLoadFailed(true); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const publishedCount = courses.filter((course) => course.status === "publicado").length;
  const draftCount = courses.filter((course) => course.status === "rascunho").length;
  const archivedCount = courses.filter((course) => course.status === "arquivado").length;
  const featuredCount = courses.filter((course) => course.isFeatured).length;
  const recentCourses = [...courses]
    .sort((first, second) => (Date.parse(second.updatedAt) || 0) - (Date.parse(first.updatedAt) || 0))
    .slice(0, 5);

  const stats = [
    { label: t.admin.statCourses, value: courses.length, icon: "book-open" as const, tone: "blue" },
    { label: t.admin.statPublished, value: publishedCount, icon: "check" as const, tone: "green" },
    { label: t.admin.statDrafts, value: draftCount, icon: "clock" as const, tone: "amber" },
    { label: t.admin.statArchived, value: archivedCount, icon: "monitor" as const, tone: "slate" },
  ];

  const retryLoad = () => {
    setLoading(true);
    setLoadFailed(false);
    refreshCourses()
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  };

  const handleTogglePublish = async (course: Course) => {
    setBusy(course.slug);
    try {
      await togglePublish(course.slug);
    } catch {
      setLoadFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard__hero" aria-labelledby="admin-dashboard-title">
        <div className="admin-dashboard__hero-copy">
          <p className="admin-dashboard__eyebrow">
            <span aria-hidden="true" />
            {t.admin.dashboardEyebrow}
          </p>
          <h1 id="admin-dashboard-title">{t.admin.dashboardTitle}</h1>
          <p className="admin-dashboard__hero-description">{t.admin.dashboardDescription}</p>
          <div className="admin-dashboard__hero-actions">
            <Link to="/admin/courses" className="admin-button admin-button--light">
              <SvgIcon name="book-open" size="1.125rem" />
              <span>{t.admin.manageCourses}</span>
              <SvgIcon name="arrow-right" size="1rem" />
            </Link>
            <Link to="/admin/courses/new" className="admin-button admin-button--outline-light">
              <SvgIcon name="plus" size="1.125rem" />
              <span>{t.admin.createCourse}</span>
            </Link>
          </div>
        </div>
        <div className="admin-dashboard__hero-art" aria-hidden="true">
          <span className="admin-dashboard__hero-orbit admin-dashboard__hero-orbit--outer" />
          <span className="admin-dashboard__hero-orbit admin-dashboard__hero-orbit--inner" />
          <span className="admin-dashboard__hero-symbol"><SvgIcon name="monitor" size="3.5rem" /></span>
          <span className="admin-dashboard__hero-spark admin-dashboard__hero-spark--one" />
          <span className="admin-dashboard__hero-spark admin-dashboard__hero-spark--two" />
        </div>
      </section>

      {loadFailed && courses.length > 0 && (
        <div className="admin-notice" role="status">
          <SvgIcon name="bell" size="1.125rem" />
          <span>{t.admin.syncWarning}</span>
          <button type="button" onClick={retryLoad}>{t.admin.retry}</button>
        </div>
      )}

      <section className="admin-dashboard__stats" aria-label={t.admin.summaryLabel}>
        {stats.map((stat) => (
          <article className="admin-stat" key={stat.label}>
            <span className={"admin-stat__icon admin-stat__icon--" + stat.tone}>
              <SvgIcon name={stat.icon} size="1.25rem" />
            </span>
            <span className="admin-stat__label">{stat.label}</span>
            <strong className="admin-stat__value">{stat.value}</strong>
          </article>
        ))}
        <article className="admin-stat admin-stat--featured">
          <span className="admin-stat__icon admin-stat__icon--violet">
            <SvgIcon name="check" size="1.25rem" />
          </span>
          <span className="admin-stat__label">{t.admin.statFeatured}</span>
          <strong className="admin-stat__value">{featuredCount}</strong>
        </article>
      </section>

      <section className="admin-dashboard__recent" aria-labelledby="admin-recent-title">
        <header className="admin-section-heading">
          <div>
            <p className="admin-section-heading__eyebrow">{t.admin.recentEyebrow}</p>
            <h2 id="admin-recent-title">{t.admin.recentTitle}</h2>
            <p>{t.admin.recentDescription}</p>
          </div>
          <Link to="/admin/courses" className="admin-inline-link">
            {t.admin.viewAllCourses}
            <SvgIcon name="arrow-right" size="1rem" />
          </Link>
        </header>

        {loading && courses.length === 0 ? (
          <div className="admin-loading-list" aria-label={t.admin.loadingCourses} aria-busy="true">
            <span /><span /><span />
          </div>
        ) : loadFailed && courses.length === 0 ? (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon"><SvgIcon name="bell" size="1.75rem" /></span>
            <h3>{t.admin.errorTitle}</h3>
            <p>{t.admin.errorDescription}</p>
            <button type="button" className="admin-button admin-button--primary" onClick={retryLoad}>{t.admin.retry}</button>
          </div>
        ) : recentCourses.length === 0 ? (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon"><SvgIcon name="book-open" size="1.75rem" /></span>
            <h3>{t.admin.emptyTitle}</h3>
            <p>{t.admin.emptyDescription}</p>
            <Link to="/admin/courses/new" className="admin-button admin-button--primary">
              <SvgIcon name="plus" size="1rem" />
              <span>{t.admin.createCourse}</span>
            </Link>
          </div>
        ) : (
          <div className="admin-recent-list">
            {recentCourses.map((course) => (
              <article className="admin-recent-course" key={course.id}>
                <div className="admin-recent-course__image">
                  <img src={course.thumbnail.url} alt={course.thumbnail.alt ?? course.title} loading="lazy" />
                </div>
                <div className="admin-recent-course__main">
                  <div className="admin-recent-course__badges">
                    <span className={statusClass(course.status)}>
                      {statusLabel(course.status, {
                        draft: t.admin.statusDraft,
                        published: t.admin.statusPublished,
                        archived: t.admin.statusArchived,
                      })}
                    </span>
                    {course.isFeatured && <span className="admin-status admin-status--featured">{t.admin.featured}</span>}
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.shortDescription ?? course.description}</p>
                  <div className="admin-recent-course__meta">
                    <span>{course.category}</span>
                    <span>{course.totalLessons} {t.admin.lessons}</span>
                    <span>{t.admin.updatedAt} {formatDate(course.updatedAt, locale)}</span>
                  </div>
                </div>
                <div className="admin-recent-course__actions">
                  <Link to={"/admin/courses/" + course.slug + "/editor"} className="admin-small-action">
                    {t.admin.editCourse}
                  </Link>
                  {course.status === "publicado" && (
                    <Link to={"/courses/" + course.slug} className="admin-small-action admin-small-action--subtle">
                      {t.admin.viewCourse}
                    </Link>
                  )}
                  {course.status !== "publicado" && (
                    <button
                      type="button"
                      className="admin-small-action admin-small-action--subtle"
                      disabled={busy !== null}
                      onClick={() => void handleTogglePublish(course)}
                    >
                      {busy === course.slug ? t.admin.updating : t.admin.publish}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
