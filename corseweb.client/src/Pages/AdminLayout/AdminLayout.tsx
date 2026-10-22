import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getCurrentUser, logout as doLogout, refreshAuth, subscribeAuth } from "../../store/authStore";
import type { User } from "../../store/authStore";
import "./AdminLayout.scss";

function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();
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
      if (event.key !== "Escape") return;
      setMobileNavOpen(false);
      menuButtonRef.current?.focus();
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
  const currentSection = location.pathname.startsWith("/admin/courses")
    ? t.admin.navCourses
    : t.admin.navDashboard;

  const handleLogout = async () => {
    await doLogout();
    closeMobileNav();
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <a className="skip-link" href="#admin-main-content">{t.app.skipToContent}</a>

      <aside
        className={mobileNavOpen ? "admin-sidebar admin-sidebar--open" : "admin-sidebar"}
        id="admin-navigation"
      >
        <nav className="admin-nav" ref={navigationRef} aria-label={t.admin.primaryNavigation}>
          <div className="admin-nav__brand">
            <Link to="/admin" className="admin-nav__logo" onClick={closeMobileNav}>
              <img
                className="admin-nav__logo-image"
                src="/favicon.ico"
                alt=""
                width={36}
                height={36}
                decoding="async"
              />
              <span>CorseWeb</span>
              <span className="admin-nav__badge">Admin</span>
            </Link>
            <p className="admin-nav__brand-caption">{t.admin.sectionLabel}</p>
          </div>

          <ul className="admin-nav__list">
            <li>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => isActive ? "admin-nav__link admin-nav__link--active" : "admin-nav__link"}
                onClick={closeMobileNav}
              >
                <SvgIcon name="monitor" size="1.125rem" />
                <span>{t.admin.navDashboard}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/courses"
                className={({ isActive }) => isActive ? "admin-nav__link admin-nav__link--active" : "admin-nav__link"}
                onClick={closeMobileNav}
              >
                <SvgIcon name="book-open" size="1.125rem" />
                <span>{t.admin.navCourses}</span>
              </NavLink>
            </li>
          </ul>

          <div className="admin-nav__footer">
            {user && (
              <div className="admin-nav__profile">
                <span className="admin-nav__avatar" aria-hidden="true">
                  {user.name.trim().slice(0, 1).toLocaleUpperCase() || "A"}
                </span>
                <span className="admin-nav__profile-copy">
                  <strong>{user.name}</strong>
                  <span title={user.email}>{user.email}</span>
                  <small>{t.admin.administratorRole}</small>
                </span>
              </div>
            )}

            <Link to="/" className="admin-nav__utility" onClick={closeMobileNav}>
              <SvgIcon name="home" size="1rem" />
              <span>{t.admin.returnToSite}</span>
            </Link>
            <Link to="/app" className="admin-nav__utility" onClick={closeMobileNav}>
              <SvgIcon name="user" size="1rem" />
              <span>{t.admin.studentArea}</span>
            </Link>
            {user ? (
              <button type="button" onClick={handleLogout} className="admin-nav__utility admin-nav__logout">
                <SvgIcon name="log-out" size="1rem" />
                <span>{t.admin.signOut}</span>
              </button>
            ) : (
              <Link to="/login" className="admin-nav__utility" onClick={closeMobileNav}>
                <SvgIcon name="user" size="1rem" />
                <span>{t.home.login}</span>
              </Link>
            )}
          </div>
        </nav>
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="admin-sidebar-scrim"
          aria-label={t.admin.closeMenu}
          onClick={closeMobileNav}
        />
      )}

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header__left">
            <button
              ref={menuButtonRef}
              type="button"
              className="admin-header__menu-toggle"
              aria-label={mobileNavOpen ? t.admin.closeMenu : t.admin.openMenu}
              aria-expanded={mobileNavOpen}
              aria-controls="admin-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <SvgIcon name={mobileNavOpen ? "close" : "menu"} size="1.375rem" />
            </button>
            <div className="admin-header__section">
              <span className="admin-header__eyebrow">{t.admin.sectionLabel}</span>
              <span className="admin-header__current">{currentSection}</span>
            </div>
          </div>
          <div className="admin-header__right">
            <LanguageSwitcher />
          </div>
        </header>

        <main className="admin-content" id="admin-main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
