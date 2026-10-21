import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import LanguageSwitcher from '../../UIComplement/LanguageSwitcher/LanguageSwitcher';
import { getCurrentUser, logout as doLogout, refreshAuth, subscribeAuth, isAdmin } from '../../store/authStore';
import type { User } from '../../store/authStore';
import SvgIcon from '../../UIComplement/SvgIcon/SvgIcon';
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
              <img className="app-nav__logo-image" src="/favicon.ico" alt="" width={32} height={32} decoding="async" />
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
              <SvgIcon name="log-out" size="1rem" />
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
              <SvgIcon name="menu" size="1.5rem" />
            </button>
          </div>
          <div className="app-header__right">
            <LanguageSwitcher />
            <div className="app-header__notifications" role="button" aria-label="Notificações" tabIndex={0}>
              <SvgIcon name="bell" size="1.25rem" />
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
