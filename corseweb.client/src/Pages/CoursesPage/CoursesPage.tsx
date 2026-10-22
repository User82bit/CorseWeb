import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
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
import { getPublishedCourses, refreshCourses, subscribeCourses } from "../../store/courseStore";
import type { Course, CourseLevel } from "../../types/course";
import "./CoursesPage.scss";

type SortMode = "featured" | "newest" | "title";

function BrandMark() {
  return (
    <Link to="/" className="catalog-brand" aria-label="CorseWeb">
      <img src="/favicon.ico" alt="" width={42} height={42} />
      <span>CorseWeb</span>
    </Link>
  );
}

function interpolate(template: string, count: number) {
  return template.replace("{count}", new Intl.NumberFormat().format(count));
}

function CoursesPage() {
  const { t, locale } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(() => getPublishedCourses());
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<CourseLevel | "">("");
  const [sort, setSort] = useState<SortMode>("featured");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCourses(() => {
      if (active) setCourses(getPublishedCourses());
    });

    refreshCourses()
      .then(() => {
        if (active) {
          setCourses(getPublishedCourses());
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setCoursesLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuth(() => setUser(getCurrentUser()));
    refreshAuth().catch(() => {});
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const publishedCourses = useMemo(
    () => courses.filter(course => course.status === "publicado"),
    [courses],
  );

  const categories = useMemo(
    () => [...new Set(publishedCourses.map(course => course.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, locale)),
    [publishedCourses, locale],
  );

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    const result = publishedCourses.filter(course => {
      const matchesQuery = !normalizedQuery || [
        course.title,
        course.subtitle ?? "",
        course.shortDescription ?? "",
        course.description,
        course.category,
        course.level,
        course.language,
        ...(course.tags ?? []).map(tag => tag.label),
      ].some(value => value.toLocaleLowerCase(locale).includes(normalizedQuery));

      return matchesQuery
        && (!category || course.category === category)
        && (!level || course.level === level);
    });

    return result.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, locale);
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      const featuredDifference = Number(b.isFeatured) - Number(a.isFeatured);
      return featuredDifference || b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [publishedCourses, query, category, level, sort, locale]);

  const accountTarget = user ? getLoginRedirectPath(user) : "/login";
  const hasActiveFilters = Boolean(query.trim() || category || level);

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const { name, value } = event.currentTarget;
    if (name === "category") setCategory(value);
    if (name === "level") setLevel(value as CourseLevel | "");
    if (name === "sort") setSort(value as SortMode);
  }

  function clearFilters() {
    setQuery("");
    setCategory("");
    setLevel("");
    setSort("featured");
  }

  async function retryLoading() {
    setCoursesLoading(true);
    setLoadError(false);
    try {
      await refreshCourses();
      setCourses(getPublishedCourses());
    } catch {
      setLoadError(true);
    } finally {
      setCoursesLoading(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="catalog-page">
      <a className="catalog-skip-link" href="#catalog-main">{t.catalog.skipToContent}</a>

      <header className="catalog-header">
        <div className="catalog-header__inner">
          <BrandMark />
          <div className="catalog-header__tools">
            <LanguageSwitcher />
            <button
              type="button"
              className="catalog-menu-toggle"
              aria-label={menuOpen ? t.catalog.closeMenu : t.catalog.openMenu}
              aria-expanded={menuOpen}
              aria-controls="catalog-primary-navigation"
              onClick={() => setMenuOpen(open => !open)}
            >
              <SvgIcon name={menuOpen ? "close" : "menu"} size="1.25rem" />
            </button>
          </div>
          <nav
            id="catalog-primary-navigation"
            className={`catalog-nav${menuOpen ? " catalog-nav--open" : ""}`}
            aria-label={t.catalog.primaryNavigation}
          >
            <Link to="/" onClick={closeMenu}>{t.catalog.backHome}</Link>
            <Link className="catalog-nav__account" to={accountTarget} onClick={closeMenu}>
              {user ? t.catalog.accountAction : t.home.login}
              <SvgIcon name="arrow-right" size="1rem" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="catalog-main">
        <section className="catalog-hero" aria-labelledby="catalog-title">
          <div className="catalog-hero__glow catalog-hero__glow--one" />
          <div className="catalog-hero__glow catalog-hero__glow--two" />
          <div className="catalog-container catalog-hero__inner">
            <div className="catalog-hero__copy">
              <p className="catalog-eyebrow"><span />{t.catalog.eyebrow}</p>
              <h1 id="catalog-title">{t.catalog.title}</h1>
              <p className="catalog-hero__description">{t.catalog.description}</p>
              <label className="catalog-search">
                <SvgIcon name="search" size="1.3rem" />
                <span className="catalog-visually-hidden">{t.catalog.searchLabel}</span>
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={t.catalog.searchPlaceholder}
                  autoComplete="off"
                />
                {query && (
                  <button type="button" aria-label={t.catalog.clearFilters} onClick={() => setQuery("")}>
                    <SvgIcon name="close" size="1rem" />
                  </button>
                )}
              </label>
              <div className="catalog-hero__highlights" aria-label={t.catalog.filtersLabel}>
                <span><SvgIcon name="book-open" size="1rem" />{interpolate(t.catalog.availableCount, publishedCourses.length)}</span>
                <span><SvgIcon name="check" size="1rem" />{t.catalog.learnAtYourPace}</span>
              </div>
            </div>
            <div className="catalog-hero-art" aria-hidden="true">
              <div className="catalog-hero-art__orbit catalog-hero-art__orbit--outer" />
              <div className="catalog-hero-art__orbit catalog-hero-art__orbit--inner" />
              <div className="catalog-hero-art__book-card">
                <span className="catalog-hero-art__badge"><SvgIcon name="check" size="0.85rem" /></span>
                <div className="catalog-hero-art__book-spread">
                  <div><span /><span /><span /><span /></div>
                  <div><span /><span /><span /><span /></div>
                </div>
                <div className="catalog-hero-art__progress"><span /></div>
                <p>LEARN / EXPLORE / GROW</p>
              </div>
              <span className="catalog-hero-art__float catalog-hero-art__float--one"><SvgIcon name="book-open" /></span>
              <span className="catalog-hero-art__float catalog-hero-art__float--two"><SvgIcon name="check" /></span>
            </div>
          </div>
        </section>

        <section className="catalog-container catalog-content" aria-labelledby="catalog-results-title">
          <div className="catalog-content__heading">
            <div>
              <p className="catalog-section-eyebrow">{t.catalog.filtersLabel}</p>
              <h2 id="catalog-results-title">{interpolate(t.catalog.resultCount, filteredCourses.length)}</h2>
            </div>
            <label className="catalog-sort">
              <span>{t.catalog.sortLabel}</span>
              <select name="sort" value={sort} onChange={handleSelectChange}>
                <option value="featured">{t.catalog.sortFeatured}</option>
                <option value="newest">{t.catalog.sortNewest}</option>
                <option value="title">{t.catalog.sortTitle}</option>
              </select>
            </label>
          </div>

          <div className="catalog-filters" role="group" aria-label={t.catalog.filtersLabel}>
            <label className="catalog-filter">
              <span>{t.catalog.categoryLabel}</span>
              <select name="category" value={category} onChange={handleSelectChange}>
                <option value="">{t.catalog.allCategories}</option>
                {categories.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="catalog-filter">
              <span>{t.catalog.levelLabel}</span>
              <select name="level" value={level} onChange={handleSelectChange}>
                <option value="">{t.catalog.allLevels}</option>
                <option value="Iniciante">{t.catalog.levelBeginner}</option>
                <option value="Intermediário">{t.catalog.levelIntermediate}</option>
                <option value="Avançado">{t.catalog.levelAdvanced}</option>
              </select>
            </label>
            {hasActiveFilters && (
              <button type="button" className="catalog-clear-filters" onClick={clearFilters}>
                <SvgIcon name="close" size="0.9rem" />
                {t.catalog.clearFilters}
              </button>
            )}
          </div>

          {loadError && publishedCourses.length > 0 && (
            <div className="catalog-status catalog-status--warning" role="status">
              <span>{t.catalog.errorDescription}</span>
              <button type="button" className="catalog-status__retry" onClick={retryLoading} disabled={coursesLoading}>
                {coursesLoading ? t.common.loading : t.catalog.retryAction}
              </button>
            </div>
          )}

          {coursesLoading && publishedCourses.length === 0 ? (
            <div className="catalog-state" aria-live="polite" aria-busy="true">
              <span className="catalog-state__symbol"><SvgIcon name="book-open" size="1.5rem" /></span>
              <h3>{t.catalog.loadingTitle}</h3>
              <p>{t.catalog.loadingDescription}</p>
              <div className="catalog-skeleton-grid" aria-hidden="true">
                <span /><span /><span />
              </div>
            </div>
          ) : loadError && publishedCourses.length === 0 ? (
            <div className="catalog-state">
              <span className="catalog-state__symbol catalog-state__symbol--error"><SvgIcon name="search" size="1.5rem" /></span>
              <h3>{t.catalog.errorTitle}</h3>
              <p>{t.catalog.errorDescription}</p>
              <button type="button" className="catalog-button catalog-button--primary" onClick={retryLoading} disabled={coursesLoading}>
                {coursesLoading ? t.common.loading : t.catalog.retryAction}
              </button>
            </div>
          ) : publishedCourses.length === 0 ? (
            <div className="catalog-state">
              <span className="catalog-state__symbol"><SvgIcon name="book-open" size="1.5rem" /></span>
              <h3>{t.catalog.emptyTitle}</h3>
              <p>{t.catalog.emptyDescription}</p>
              <Link to={accountTarget} className="catalog-button catalog-button--primary">{t.catalog.accountAction}</Link>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="catalog-state catalog-state--compact">
              <span className="catalog-state__symbol"><SvgIcon name="search" size="1.5rem" /></span>
              <h3>{t.catalog.noResultsTitle}</h3>
              <p>{t.catalog.noResultsDescription}</p>
              <button type="button" className="catalog-button catalog-button--secondary" onClick={clearFilters}>{t.catalog.clearFilters}</button>
            </div>
          ) : (
            <div className="catalog-grid">
              {filteredCourses.map(course => (
                <article className="catalog-course" key={course.id}>
                  <Link
                    to={`/courses/${course.slug}`}
                    className="catalog-course__media"
                    aria-label={`${t.catalog.openCourse}: ${course.title}`}
                  >
                    <img
                      src={course.thumbnail?.url || "/hero.png"}
                      alt={course.thumbnail?.alt || course.title}
                      loading="lazy"
                      decoding="async"
                    />
                    {course.isFeatured && <span className="catalog-course__featured"><SvgIcon name="check" size="0.85rem" />{t.catalog.featuredLabel}</span>}
                    <span className="catalog-course__media-arrow"><SvgIcon name="arrow-right" size="1rem" /></span>
                  </Link>
                  <div className="catalog-course__body">
                    <div className="catalog-course__tags">
                      <span className="catalog-course__tag">{course.category}</span>
                      <span className="catalog-course__tag catalog-course__tag--level">
                        {course.level === "Iniciante"
                          ? t.catalog.levelBeginner
                          : course.level === "Intermediário"
                            ? t.catalog.levelIntermediate
                            : t.catalog.levelAdvanced}
                      </span>
                    </div>
                    <h3><Link to={`/courses/${course.slug}`}>{course.title}</Link></h3>
                    <p className="catalog-course__description">{course.shortDescription || course.description}</p>
                    <div className="catalog-course__bottom">
                      <div className="catalog-course__meta">
                        <span><SvgIcon name="book-open" size="0.95rem" />{interpolate(t.catalog.lessonMeta, course.totalLessons)}</span>
                        {course.totalMinutes > 0 && <span><SvgIcon name="clock" size="0.95rem" />{formatEstimatedDuration(course.totalMinutes, locale)}</span>}
                      </div>
                      <Link to={`/courses/${course.slug}`} className="catalog-course__open">
                        {t.catalog.openCourse}<SvgIcon name="arrow-right" size="0.95rem" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="catalog-bottom-cta">
          <div className="catalog-container catalog-bottom-cta__inner">
            <div>
              <p className="catalog-section-eyebrow">{t.home.ctaEyebrow}</p>
              <h2>{t.catalog.footerTitle}</h2>
              <p>{t.catalog.footerDescription}</p>
            </div>
            <Link to={accountTarget} className="catalog-button catalog-button--light">
              {t.catalog.footerAction}<SvgIcon name="arrow-right" size="1rem" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="catalog-footer">
        <div className="catalog-container">
          <Link to="/" className="catalog-footer__brand"><img src="/favicon.ico" alt="" width={26} height={26} />CorseWeb</Link>
          <span>{t.home.footerDescription}</span>
          <Link to="/">{t.catalog.backHome}</Link>
        </div>
      </footer>
    </div>
  );
}

export default CoursesPage;
