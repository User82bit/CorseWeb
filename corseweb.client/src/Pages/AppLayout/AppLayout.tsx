import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import LanguageSwitcher from '../../UIComplement/LanguageSwitcher/LanguageSwitcher';
import { getCurrentUser, logout as doLogout, refreshAuth, subscribeAuth, isAdmin } from '../../store/authStore';
import type { User } from '../../store/authStore';
import './AppLayout.scss';

function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    refreshAuth().catch(() => {});
    return subscribeAuth(() => setUser(getCurrentUser()));
  }, []);

  const navItems = [
    { path: '/app', label: t.navbar.home, exact: true },
    { path: '/app/courses', label: t.navbar.myCourse },
  ];

  const handleLogout = async () => {
    await doLogout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label="Navegação do aluno">
        <nav className="app-nav">
          <div className="app-nav__brand">
            <Link to="/app" className="app-nav__logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
                <path d="M16 8 L16 24 M8 16 L24 16" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span>CorseWeb</span>
            </Link>
          </div>

          <ul className="app-nav__list" role="list">
            {navItems.map(item => (
              <li key={item.path}>
                <Link to={item.path} className="app-nav__link" aria-current={item.exact ? 'page' : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
            {user && isAdmin(user) && (
              <li>
                <Link to="/admin" className="app-nav__link">Admin</Link>
              </li>
            )}
          </ul>

          <div className="app-nav__footer">
            {user ? (
              <div className="app-nav__user">
                <div className="user-avatar" aria-hidden="true">{user.name.slice(0,1).toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-plan" title={user.email}>{user.email} · {user.role}</span>
                </div>
              </div>
            ) : (
              <div className="app-nav__user">
                <div className="user-avatar">U</div>
                <div className="user-info">
                  <span className="user-name">Visitante</span>
                  <Link to="/login" className="user-plan" style={{ textDecoration: 'underline' }}>Entrar</Link>
                </div>
              </div>
            )}
            <Link to="/" className="app-nav__exit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Voltar ao site
            </Link>
            {user ? (
              <button type="button" onClick={handleLogout} className="app-nav__exit" style={{ marginTop: 8 }}>
                Sair
              </button>
            ) : (
              <Link to="/login" className="app-nav__exit" style={{ marginTop: 8 }}>Entrar</Link>
            )}
          </div>
        </nav>
      </aside>

      <main className="app-main" role="main">
        <header className="app-header">
          <div className="app-header__left">
            <button className="app-header__menu-toggle" aria-label="Alternar menu" aria-expanded="false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
          <div className="app-header__right">
            <LanguageSwitcher />
            <div className="app-header__notifications" role="button" aria-label="Notificações" tabIndex={0}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
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
