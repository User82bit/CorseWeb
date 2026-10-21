import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import { getCurrentUser, logout as doLogout, refreshAuth, subscribeAuth } from "../../store/authStore";
import type { User } from "../../store/authStore";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import "./AdminLayout.scss";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: "layout-dashboard" },
  { path: "/admin/courses", label: "Cursos", icon: "library" },
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  useEffect(() => { refreshAuth().catch(() => {}); return subscribeAuth(() => setUser(getCurrentUser())); }, []);

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const handleLogout = async () => { await doLogout(); navigate("/"); };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Navegação administrativa">
        <nav className="admin-nav">
          <div className="admin-nav__brand">
            <Link to="/admin" className="admin-nav__logo">
              <span className="admin-nav__logo-mark">C</span>
              <span>CorseWeb</span>
              <span className="admin-nav__badge">Admin</span>
            </Link>
          </div>

          <ul className="admin-nav__list" role="list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`admin-nav__link ${isActive(item.path) ? "admin-nav__link--active" : ""}`}
                  aria-current={isActive(item.path) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="admin-nav__footer">
            {user && (
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                {user.name} · {user.email} · {user.role}
              </div>
            )}
            <Link to="/" className="admin-nav__exit">
              <SvgIcon name="log-out" size="1rem" />
              Voltar ao site
            </Link>
            <Link to="/app" className="admin-nav__exit">
              Área do aluno
            </Link>
            {user ? (
              <button type="button" onClick={handleLogout} className="admin-nav__exit" style={{ marginTop: 8 }}>
                Sair
              </button>
            ) : (
              <Link to="/login" className="admin-nav__exit" style={{ marginTop: 8 }}>Entrar</Link>
            )}
          </div>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header__left">
            <span className="admin-header__eyebrow">Administração</span>
          </div>
          <div className="admin-header__right">
            <LanguageSwitcher />
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
