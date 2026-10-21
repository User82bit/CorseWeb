import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import { getCurrentUser, logout as doLogout, refreshAuth, subscribeAuth, isAdmin } from "../../store/authStore";
import type { User } from "../../store/authStore";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import "./AppLayout.scss";

function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    refreshAuth().catch(() => {});
    return subscribeAuth(() => setUser(getCurrentUser()));
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    navigationRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (mediaQuery.matches) setMobileNavOpen(false);
    };

    mediaQuery.addEventListener("change", closeOnDesktop);
    return () => mediaQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const closeMobileNav = () => setMobileNavOpen(false);

  const handleLogout = async () => {
    await doLogout();
    closeMobileNav();
    navigate("/");
  };

  return (
    <div className="app-layout">
      <a className="skip-link" href="#app-main-content">{t.app.skipToContent}</a>

      <aside className={mobileNavOpen ? "app-sidebar app-sidebar--open" : "app-sidebar"} id="student-navigation">
        <nav className="app-nav" ref={navigationRef} aria-label={t.app.primaryNavigation}>
          <div className="app-nav__brand">
            <Link to="/app" className="app-nav__logo" onClick={closeMobileNav}>
              <img className="app-nav__logo-image" src="/favicon.ico" alt="" width={32} height={32} decoding="async" />
              <span>CorseWeb</span>
            </Link>
          </div>

          <ul className="app-nav__list">
            <li>
              <NavLink
                to="/app"
                end
                className={({ isActive }) => isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"}
                onClick={closeMobileNav}
              >
                {t.navbar.home}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/courses"
                className={({ isActive }) => isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"}
                onClick={closeMobileNav}
              >
                {t.navbar.myCourse}
              </NavLink>
            </li>
            {user && isAdmin(user) && (
              <li>
                <NavLink to="/admin" className="app-nav__link" onClick={closeMobileNav}>
                  Admin
                </NavLink>
              </li>
            )}
          </ul>

          <div className="app-nav__footer">
            {user ? (
              <div className="app-nav__user">
                <div className="user-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-plan" title={user.email}>{user.email}</span>
                </div>
              </div>
            ) : null}
            <Link to="/" className="app-nav__exit" onClick={closeMobileNav}>
              <SvgIcon name="log-out" size="1rem" />
              {t.app.returnToSite}
            </Link>
            {user && (
              <button type="button" onClick={handleLogout} className="app-nav__exit app-nav__logout">
                <SvgIcon name="log-out" size="1rem" />
                {t.home.logout}
              </button>
            )}
          </div>
        </nav>
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="app-sidebar-scrim"
          aria-label={t.app.closeMenu}
          onClick={closeMobileNav}
        />
      )}

      <main className="app-main" id="app-main-content" tabIndex={-1}>
        <header className="app-header">
          <div className="app-header__left">
            <button
              ref={menuButtonRef}
              type="button"
              className="app-header__menu-toggle"
              aria-label={mobileNavOpen ? t.app.closeMenu : t.app.openMenu}
              aria-expanded={mobileNavOpen}
              aria-controls="student-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <SvgIcon name={mobileNavOpen ? "close" : "menu"} size="1.5rem" />
            </button>
            <span className="app-header__section-label">{t.app.sectionLabel}</span>
          </div>
          <div className="app-header__right">
            <LanguageSwitcher />
          </div>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
