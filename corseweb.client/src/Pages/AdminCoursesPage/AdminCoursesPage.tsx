import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { formatEstimatedDuration } from "../../utils/formatEstimatedDuration";
import { deleteCourse, getAllCourses, refreshCourses, subscribeCourses, togglePublish } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AdminCoursesPage.scss";

type CourseFilter = "all" | "rascunho" | "publicado" | "arquivado";

function getErrorMessage(error: unknown, fallback: string) {
  const value = error as { body?: { error?: string }; message?: string } | null;
  return value?.body?.error ?? value?.message ?? fallback;
}

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

function AdminCoursesPage() {
  const { t, locale } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => getAllCourses().length === 0);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeCourses(() => setCourses(getAllCourses()));

    refreshCourses()
      .then(() => { if (mounted) setLoadError(null); })
      .catch((error: unknown) => { if (mounted) setLoadError(getErrorMessage(error, t.admin.errorDescription)); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [t.admin.errorDescription]);

  const counts = {
    all: courses.length,
    rascunho: courses.filter((course) => course.status === "rascunho").length,
    publicado: courses.filter((course) => course.status === "publicado").length,
    arquivado: courses.filter((course) => course.status === "arquivado").length,
  };
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesStatus = filter === "all" || course.status === filter;
    const searchableText = [
      course.title,
      course.description,
      course.shortDescription ?? "",
      course.category,
      course.authorName,
    ].join(" ").toLocaleLowerCase();
    return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
  }), [courses, filter, normalizedSearch]);

  const filterTabs = [
    { value: "all" as const, label: t.admin.filterAll.replace("{count}", String(counts.all)) },
    { value: "rascunho" as const, label: t.admin.filterDrafts.replace("{count}", String(counts.rascunho)) },
    { value: "publicado" as const, label: t.admin.filterPublished.replace("{count}", String(counts.publicado)) },
    { value: "arquivado" as const, label: t.admin.filterArchived.replace("{count}", String(counts.arquivado)) },
  ];

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    refreshCourses()
      .catch((error: unknown) => setLoadError(getErrorMessage(error, t.admin.errorDescription)))
      .finally(() => setLoading(false));
  };

  const handleTogglePublish = async (course: Course) => {
    setBusy(course.slug);
    setActionError(null);
    try {
      await togglePublish(course.slug);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t.admin.actionError));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (course: Course) => {
    const confirmation = t.admin.confirmDeleteDescription.replace("{title}", course.title);
    if (!window.confirm(t.admin.confirmDeleteTitle + "\n\n" + confirmation)) return;

    setBusy(course.slug);
    setActionError(null);
    try {
      await deleteCourse(course.slug);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t.admin.actionError));
    } finally {
      setBusy(null);
    }
  };

  const labels = {
    draft: t.admin.statusDraft,
    published: t.admin.statusPublished,
    archived: t.admin.statusArchived,
  };

  return (
    <div className="admin-courses">
      <header className="admin-courses__heading">
        <div className="admin-courses__heading-copy">
          <p className="admin-dashboard__eyebrow admin-courses__eyebrow">
            <span aria-hidden="true" />
            {t.admin.coursesEyebrow}
          </p>
          <h1>{t.admin.coursesTitle}</h1>
          <p>{t.admin.coursesDescription}</p>
        </div>
        <div className="admin-courses__heading-actions">
          <Link to="/courses" className="admin-button admin-button--secondary">
            <SvgIcon name="home" size="1.05rem" />
            <span>{t.admin.viewPublicCatalog}</span>
          </Link>
          <Link to="/admin/courses/new" className="admin-button admin-button--primary">
            <SvgIcon name="plus" size="1.1rem" />
            <span>{t.admin.createCourse}</span>
          </Link>
        </div>
      </header>

      <section className="admin-courses__summary" aria-label={t.admin.summaryLabel}>
        <div>
          <span className="admin-courses__summary-label">{t.admin.statCourses}</span>
          <strong>{counts.all}</strong>
        </div>
        <div>
          <span className="admin-courses__summary-label">{t.admin.statPublished}</span>
          <strong>{counts.publicado}</strong>
        </div>
        <div>
          <span className="admin-courses__summary-label">{t.admin.statDrafts}</span>
          <strong>{counts.rascunho}</strong>
        </div>
        <div>
          <span className="admin-courses__summary-label">{t.admin.statArchived}</span>
          <strong>{counts.arquivado}</strong>
        </div>
      </section>

      <section className="admin-courses__manager" aria-labelledby="admin-courses-list-title">
        <div className="admin-courses__toolbar">
          <label className="admin-courses__search">
            <SvgIcon name="search" size="1.125rem" />
            <span className="admin-sr-only">{t.admin.searchCourses}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.admin.searchPlaceholder}
              aria-label={t.admin.searchCourses}
            />
            {search && (
              <button type="button" aria-label={t.admin.clearFilters} onClick={() => setSearch("")}>
                <SvgIcon name="close" size="1rem" />
              </button>
            )}
          </label>

          <div className="admin-courses__filter-wrap">
            <span className="admin-courses__filter-label">{t.admin.filterByStatus}</span>
            <div className="admin-courses__filter-tabs" role="tablist" aria-label={t.admin.filterByStatus}>
              {filterTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  key={tab.value}
                  aria-selected={filter === tab.value}
                  className={filter === tab.value ? "admin-filter-tab admin-filter-tab--active" : "admin-filter-tab"}
                  onClick={() => setFilter(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="admin-inline-error" role="alert">
            <SvgIcon name="bell" size="1.125rem" />
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} aria-label={t.admin.dismissNotice}>
              <SvgIcon name="close" size="1rem" />
            </button>
          </div>
        )}
        {loadError && courses.length > 0 && (
          <div className="admin-inline-error" role="status">
            <SvgIcon name="bell" size="1.125rem" />
            <span>{t.admin.syncWarning}</span>
            <button type="button" onClick={retryLoad}>{t.admin.retry}</button>
          </div>
        )}

        {loading && courses.length === 0 ? (
          <div className="admin-course-loading" aria-busy="true" aria-label={t.admin.loadingCourses}>
            <span /><span /><span />
          </div>
        ) : loadError && courses.length === 0 ? (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon"><SvgIcon name="bell" size="1.75rem" /></span>
            <h2>{t.admin.errorTitle}</h2>
            <p>{t.admin.errorDescription}</p>
            <button type="button" className="admin-button admin-button--primary" onClick={retryLoad}>{t.admin.retry}</button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon">
              <SvgIcon name={courses.length === 0 ? "book-open" : "search"} size="1.75rem" />
            </span>
            <h2>{courses.length === 0 ? t.admin.emptyTitle : t.admin.noResultsTitle}</h2>
            <p>{courses.length === 0 ? t.admin.emptyDescription : t.admin.noResultsDescription}</p>
            {courses.length === 0 ? (
              <Link to="/admin/courses/new" className="admin-button admin-button--primary">
                <SvgIcon name="plus" size="1rem" />
                <span>{t.admin.createCourse}</span>
              </Link>
            ) : (
              <button type="button" className="admin-button admin-button--secondary" onClick={() => { setSearch(""); setFilter("all"); }}>
                {t.admin.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="admin-courses__result-count" id="admin-courses-list-title">
              {t.admin.resultsCount.replace("{count}", String(filteredCourses.length))}
            </div>
            <div className="admin-course-list">
              {filteredCourses.map((course) => (
                <article className="admin-course-row" key={course.id}>
                  <div className="admin-course-row__thumbnail">
                    <img src={course.thumbnail?.url?.trim() || "/course-cover-placeholder.svg"} alt={course.thumbnail?.alt || course.title} loading="lazy" />
                  </div>
                  <div className="admin-course-row__main">
                    <div className="admin-course-row__badges">
                      <span className={statusClass(course.status)}>{statusLabel(course.status, labels)}</span>
                      {course.isFeatured && <span className="admin-status admin-status--featured">{t.admin.featured}</span>}
                    </div>
                    <h2>{course.title}</h2>
                    <p>{course.shortDescription ?? course.description}</p>
                    <div className="admin-course-row__metadata">
                      <span>{course.category}</span>
                      <span>{course.level}</span>
                      <span>{course.totalLessons} {t.admin.lessons}</span>
                      {course.totalModules > 0 && <span>{course.totalModules} {t.admin.modules}</span>}
                      {course.totalMinutes > 0 && <span>{t.admin.hoursEstimate.replace("{count}", formatEstimatedDuration(course.totalMinutes, locale))}</span>}
                      <span>{t.admin.byAuthor.replace("{name}", course.authorName)}</span>
                      <span>{t.admin.updatedAt} {formatDate(course.updatedAt, locale)}</span>
                    </div>
                  </div>
                  <div className="admin-course-row__actions" aria-label={course.title}>
                    <Link
                      to={"/admin/courses/" + course.slug + "/editor"}
                      className="admin-course-action admin-course-action--primary"
                      aria-label={t.admin.editCourse + ": " + course.title}
                    >
                      {t.admin.editCourse}
                    </Link>
                    {course.status === "publicado" && (
                      <Link
                        to={"/courses/" + course.slug}
                        className="admin-course-action"
                        aria-label={t.admin.viewCourse + ": " + course.title}
                      >
                        {t.admin.viewCourse}
                      </Link>
                    )}
                    <button
                      type="button"
                      className="admin-course-action"
                      disabled={busy !== null}
                      onClick={() => void handleTogglePublish(course)}
                    >
                      {busy === course.slug
                        ? t.admin.updating
                        : course.status === "publicado" ? t.admin.archive : t.admin.publish}
                    </button>
                    <button
                      type="button"
                      className="admin-course-action admin-course-action--danger"
                      disabled={busy !== null}
                      onClick={() => void handleDelete(course)}
                    >
                      {busy === course.slug ? t.admin.deleting : t.admin.deleteCourse}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default AdminCoursesPage;
