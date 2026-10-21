import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import { useTranslation } from "../../i18n/useTranslation";
import {
  getPublishedCourses,
  refreshCourses,
  subscribeCourses,
} from "../../store/courseStore";
import {
  getCurrentUser,
  isAdmin,
  logout,
  refreshAuth,
  subscribeAuth,
} from "../../store/authStore";
import type { User } from "../../store/authStore";
import type { Course } from "../../types/course";
import "./HomePage.scss";

function BrandLogo() {
  return (
    <img
      className="home-brand__logo"
      src="/favicon.ico"
      alt=""
      width={44}
      height={44}
      decoding="async"
    />
  );
}

function HeroIllustration() {
  return (
    <div className="home-hero-art" aria-hidden="true">
      <div className="home-hero-art__halo home-hero-art__halo--one" />
      <div className="home-hero-art__halo home-hero-art__halo--two" />
      <div className="home-hero-art__panel">
        <div className="home-hero-art__top">
          <span className="home-hero-art__mark">C</span>
          <span className="home-hero-art__wordmark">CORSEWEB / LEARNING</span>
          <span className="home-hero-art__dots"><i /><i /><i /></span>
        </div>
        <div className="home-hero-art__book">
          <svg viewBox="0 0 210 150" focusable="false">
            <path d="M105 40C82 23 49 20 23 29v84c27-9 57-5 82 12Z" fill="#e9efff" />
            <path d="M105 40c23-17 56-20 82-11v84c-27-9-57-5-82 12Z" fill="#cddcff" />
            <path d="M105 40v85" stroke="#9aaee0" strokeWidth="3" strokeLinecap="round" />
            <path d="M41 49c15-4 30-3 43 3M41 66c15-4 30-3 43 3M41 83c15-4 30-3 43 3" fill="none" stroke="#a9b9e0" strokeWidth="4" strokeLinecap="round" />
            <path d="M126 52c13-6 28-7 43-3M126 69c13-6 28-7 43-3M126 86c13-6 28-7 43-3" fill="none" stroke="#879dd1" strokeWidth="4" strokeLinecap="round" />
            <path d="m151 12 4.5 10 10.5 4.5-10.5 4.5-4.5 10-4.5-10-10.5-4.5 10.5-4.5Z" fill="#8cece2" />
          </svg>
        </div>
        <div className="home-hero-art__lines">
          <span />
          <span />
          <span />
        </div>
        <div className="home-hero-art__bottom">
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="home-hero-art__float home-hero-art__float--left">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="m5 12 4.2 4.2L19 6.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="home-hero-art__float home-hero-art__float--right">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 3v18M3 12h18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 9.2C12.2 6.4 7.8 6 4 7.3v17c4-1.4 8.3-.8 12 2.1ZM16 9.2C19.8 6.4 24.2 6 28 7.3v17c-4-1.4-8.3-.8-12 2.1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9.2v17.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HomePage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>(() => getPublishedCourses());
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesLoadError, setCoursesLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCourses(() => {
      if (!active) return;
      setCourses(getPublishedCourses());
      setCoursesLoading(false);
    });

    refreshCourses()
      .then(() => {
        if (active) setCourses(getPublishedCourses());
      })
      .catch(() => {
        if (active) setCoursesLoadError(true);
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

  const dashboardTo = user ? (isAdmin(user) ? "/admin" : "/app") : "/login";
  const featuredCourses = courses.slice(0, 3);

  async function handleLogout() {
    setAuthBusy(true);
    try {
      await logout();
      setUser(null);
      setMenuOpen(false);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRetryCourses() {
    setCoursesLoading(true);
    setCoursesLoadError(false);
    try {
      await refreshCourses();
      setCourses(getPublishedCourses());
    } catch {
      setCoursesLoadError(true);
    } finally {
      setCoursesLoading(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="home-page">
      <a className="home-skip-link" href="#conteudo">
        {t.home.skipToContent}
      </a>

      <header className="home-header">
        <div className="home-header__inner home-container">
          <Link to="/" className="home-brand" aria-label={t.home.homeLinkLabel} onClick={closeMenu}>
            <BrandLogo />
            <span>CorseWeb</span>
          </Link>

          <div className="home-header__actions">
            <LanguageSwitcher />
            <button
              type="button"
              className="home-menu-toggle"
              aria-label={menuOpen ? t.home.closeMenu : t.home.openMenu}
              aria-expanded={menuOpen}
              aria-controls="home-primary-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>

          <nav
            id="home-primary-navigation"
            className={`home-nav${menuOpen ? " home-nav--open" : ""}`}
            aria-label={t.home.primaryNavigation}
          >
            <Link to="/courses" onClick={closeMenu}>{t.home.discoverCourses}</Link>
            <a href="#como-funciona" onClick={closeMenu}>{t.home.aboutLink}</a>
            <Link className="home-nav__action" to={dashboardTo} onClick={closeMenu}>
              {user ? t.home.dashboard : t.home.login}
              <ArrowIcon />
            </Link>
            {user && (
              <button
                type="button"
                className="home-nav__logout"
                onClick={handleLogout}
                disabled={authBusy}
              >
                {t.home.logout}
              </button>
            )}
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <section className="home-hero" aria-labelledby="home-hero-title">
          <div className="home-container home-hero__grid">
            <div className="home-hero__copy">
              <p className="home-eyebrow home-eyebrow--hero">
                <span className="home-eyebrow__dot" />
                {t.home.heroEyebrow}
              </p>
              <h1 id="home-hero-title" className="home-hero__title">{t.home.title}</h1>
              <p className="home-hero__description">{t.home.description}</p>

              <div className="home-hero__actions">
                <Link to="/courses" className="home-button home-button--primary">
                  {t.home.exploreCta}
                  <ArrowIcon />
                </Link>
                <a href="#como-funciona" className="home-button home-button--secondary">
                  {t.home.aboutCta}
                </a>
              </div>

              <ul className="home-hero__trust" aria-label={t.home.valuePropositionLabel}>
                <li><span aria-hidden="true">✓</span>{t.home.heroTrustOne}</li>
                <li><span aria-hidden="true">✓</span>{t.home.heroTrustTwo}</li>
                <li><span aria-hidden="true">✓</span>{t.home.heroTrustThree}</li>
              </ul>
            </div>

            <HeroIllustration />
          </div>
        </section>

        <section id="como-funciona" className="home-steps" aria-labelledby="home-steps-title">
          <div className="home-container">
            <header className="home-section-heading">
              <p className="home-eyebrow">{t.home.stepsEyebrow}</p>
              <h2 id="home-steps-title">{t.home.stepsTitle}</h2>
              <p>{t.home.stepsDescription}</p>
            </header>

            <div className="home-steps__grid">
              {t.home.steps.map((step, index) => (
                <article className="home-step-card" key={step.title}>
                  <span className="home-step-card__number">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cursos" className="home-courses" aria-labelledby="home-courses-title" aria-busy={coursesLoading}>
          <div className="home-container">
            <div className="home-courses__heading">
              <div className="home-section-heading">
                <p className="home-eyebrow">{t.home.coursesEyebrow}</p>
                <h2 id="home-courses-title">{t.home.coursesTitle}</h2>
                <p>{t.home.coursesDescription}</p>
              </div>
              <Link to="/courses" className="home-text-link">
                {t.home.viewAllCourses}
                <ArrowIcon />
              </Link>
            </div>

            {coursesLoading && (
              <>
                <p className="home-visually-hidden" role="status">{t.home.loadingCourses}</p>
                <div className="home-course-grid home-course-grid--loading" aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <div className="home-course-skeleton" key={item}>
                      <span />
                      <div><i /><i /><i /></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!coursesLoading && coursesLoadError && (
              <div className="home-course-state" role="alert">
                <div className="home-course-state__icon"><BookIcon /></div>
                <h3>{t.home.coursesErrorTitle}</h3>
                <p>{t.home.coursesErrorDescription}</p>
                <button type="button" className="home-button home-button--primary" onClick={handleRetryCourses}>
                  {t.home.retryCourses}
                  <ArrowIcon />
                </button>
              </div>
            )}

            {!coursesLoading && !coursesLoadError && featuredCourses.length === 0 && (
              <div className="home-course-state">
                <div className="home-course-state__icon"><BookIcon /></div>
                <h3>{t.home.emptyCoursesTitle}</h3>
                <p>{t.home.emptyCoursesDescription}</p>
                <Link to="/courses" className="home-button home-button--primary">
                  {t.home.emptyCoursesAction}
                  <ArrowIcon />
                </Link>
              </div>
            )}

            {!coursesLoading && !coursesLoadError && featuredCourses.length > 0 && (
              <div className="home-course-grid">
                {featuredCourses.map((course) => (
                  <article className="home-course-card" key={course.id}>
                    <div className="home-course-card__media">
                      <span className="home-course-card__media-pattern" aria-hidden="true" />
                      {course.thumbnail?.url && (
                        <img
                          src={course.thumbnail.url}
                          alt={course.thumbnail.alt ?? ""}
                          width="480"
                          height="300"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => { event.currentTarget.hidden = true; }}
                        />
                      )}
                      <span className="home-course-card__category">{course.category}</span>
                    </div>
                    <div className="home-course-card__body">
                      <div className="home-course-card__level">
                        <span>{t.home.courseLevelLabel}</span>
                        <strong>{course.level}</strong>
                      </div>
                      <h3>{course.title}</h3>
                      <p>{course.shortDescription || course.description}</p>
                      <div className="home-course-card__meta">
                        <span>
                          <BookIcon />
                          {course.totalLessons} {t.home.lessonUnit}
                        </span>
                        {course.totalMinutes > 0 && (
                          <span>
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
                              <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {Math.max(1, Math.round(course.totalMinutes / 60))} {t.home.hourUnit}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/courses/${encodeURIComponent(course.slug)}`}
                        className="home-course-card__link"
                        aria-label={`${t.home.openCourse}: ${course.title}`}
                      >
                        {t.home.openCourse}
                        <ArrowIcon />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="home-cta" aria-labelledby="home-cta-title">
          <div className="home-container">
            <div className="home-cta__panel">
              <div className="home-cta__orb home-cta__orb--one" aria-hidden="true" />
              <div className="home-cta__orb home-cta__orb--two" aria-hidden="true" />
              <div className="home-cta__content">
                <p className="home-eyebrow home-eyebrow--cta">{t.home.ctaEyebrow}</p>
                <h2 id="home-cta-title">{t.home.ctaTitle}</h2>
                <p>{t.home.ctaDescription}</p>
              </div>
              <Link to="/courses" className="home-button home-button--cta">
                {t.home.ctaAction}
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-container home-footer__inner">
          <Link to="/" className="home-brand home-brand--footer" onClick={closeMenu}>
            <BrandLogo />
            <span>CorseWeb</span>
          </Link>
          <p>{t.home.footerDescription}</p>
          <span className="home-footer__copyright">© {new Date().getFullYear()} CorseWeb</span>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
