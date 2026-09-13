import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import { useTranslation } from "../../i18n/LanguageContext";
import CardGuidLayout from "../../UIComplement/CardGuidLayout/CardGuidLayout";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getPublishedCourses, subscribeCourses, refreshCourses } from "../../store/courseStore";
import { getCurrentUser, subscribeAuth, refreshAuth, logout, isAdmin, getGoogleClientId, loginWithGoogle } from "../../store/authStore";
import type { User } from "../../store/authStore";
import type { Course } from "../../types/course";
import "./HomePage.scss";

declare global {
  interface Window { google?: { accounts: { id: { initialize: (o: unknown) => void; renderButton: (el: HTMLElement, o: unknown) => void; prompt?: () => void } } } }
}

function HomePage() {
  const { t } = useTranslation();
  const infos = t.home.informations ?? [];
  const pillars = infos.filter((i) => i.priority === 4).map((i) => i.text);
  const intro = infos.find((i) => i.priority === 1)?.text;
  const introLong = infos.find((i) => i.priority === 3)?.text;
  const listTitle = infos.find((i) => i.priority === 2)?.text;
  const ctaQuestion = infos.filter((i) => i.priority === 1)[1]?.text;
  const [courses, setCourses] = useState<Course[]>(() => getPublishedCourses());
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [clientId, setClientId] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  useEffect(() => { refreshCourses().catch(() => {}); return subscribeCourses(() => setCourses(getPublishedCourses())); }, []);
  useEffect(() => {
    refreshAuth().catch(() => {});
    return subscribeAuth(() => setUser(getCurrentUser()));
  }, []);
  useEffect(() => { getGoogleClientId().then(setClientId).catch(() => {}); }, []);

  // GSI inline na Home (quando deslogado e ClientId configurado)
  useEffect(() => {
    if (user || !clientId || !window.google) return;
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          setAuthBusy(true); setAuthErr(null);
          try {
            await loginWithGoogle(resp.credential);
            setUser(getCurrentUser());
          } catch (e: unknown) {
            const msg = (e as { body?: { error?: string } })?.body?.error ?? (e as Error).message ?? "Falha no login Google";
            setAuthErr(msg);
          } finally { setAuthBusy(false); }
        },
      });
      const el = document.getElementById("home-gsi-btn");
      if (el) {
        el.innerHTML = "";
        window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 260, text: "signin_with", shape: "pill" });
      }
    } catch { /* ignore */ }
  }, [clientId, user]);

  const featured = courses.slice(0, 3);

  const handleLogout = async () => {
    setAuthBusy(true);
    try { await logout(); setUser(null); } finally { setAuthBusy(false); }
  };
  const dashboardTo = user ? (isAdmin(user) ? "/admin" : "/app") : "/login";

  return (
    <>
      <section className="hero">
        <div className="home-topbar">
          <Link to="/" className="home-topbar__brand" aria-label="CorseWeb início">CorseWeb</Link>
          <div className="home-topbar__right">
            <LanguageSwitcher />
            {user ? (
              <div className="home-topbar__auth">
                <span className="home-topbar__user" title={user.email}>{user.name}</span>
                <Link to={dashboardTo} className="button button--glass home-topbar__btn">Dashboard</Link>
                <button type="button" onClick={handleLogout} disabled={authBusy} className="button button--glass home-topbar__btn">
                  Sair
                </button>
              </div>
            ) : (
              <div className="home-topbar__auth">
                <Link to="/login" className="button button--glass home-topbar__btn">Entrar</Link>
              </div>
            )}
          </div>
        </div>

        <h1 className="hero__title">{t.home.title || "Aprenda de graça, no seu ritmo."}</h1>
        <p className="hero__description">
          {t.home.description || "Sua estante pessoal de cursos 100% gratuitos. Comece agora, sem cadastro e sem custo."}
        </p>
        <div className="hero__actions">
          <Link to="/courses" className="button button--primary">
            {t.home.discoverCourses || "Explorar cursos"}
          </Link>
          <a href="#sobre" className="button button--glass">
            Como funciona
          </a>
          {user ? (
            <Link to={dashboardTo} className="button button--glass">
              Ir ao dashboard →
            </Link>
          ) : (
            <Link to="/login" className="button button--glass">
              Entrar e criar
            </Link>
          )}
        </div>

        {!user && (
          <div className="home-hero-login" aria-label="Entrar na plataforma">
            <div className="home-hero-login__card">
              <p className="home-hero-login__title">Entre para criar rascunhos vinculados à sua conta</p>
              <p className="home-hero-login__hint">Publicados entram no catálogo. Rascunhos ficam só na sua conta (banco).</p>
              <div id="home-gsi-btn" className="home-hero-login__gsi">
                {!clientId && <span className="home-hero-login__gsi-fallback">Google não configurado — use Entrar para login dev.</span>}
              </div>
              {authErr && <p role="alert" className="home-hero-login__err">{authErr}</p>}
              <div className="home-hero-login__or">
                <span>ou</span>
              </div>
              <Link to="/login" className="button button--primary home-hero-login__cta">
                Entrar com e-mail
              </Link>
            </div>
          </div>
        )}
        {user && (
          <p className="hero__welcome">
            Olá, <strong>{user.name}</strong> · {user.role === "admin" ? "admin" : "aluno"} · <Link to={dashboardTo}>ir ao dashboard</Link>
          </p>
        )}
      </section>

      <section id="sobre" className="home-about">
        <div className="home-about__inner">
          <header className="home-about__header">
            <p className="home-about__eyebrow">Por que CorseWeb</p>
            <h2 className="home-about__title">{intro ?? "O que é o CorseWeb?"}</h2>
            <p className="home-about__lead">{introLong}</p>
          </header>
          <div className="home-about__panel">
            <h3 className="home-about__panel-title">{listTitle ?? "O que você encontra na plataforma:"}</h3>
            <ul className="home-about__list">
              {pillars.map((text) => (
                <li key={text} className="home-about__list-item">
                  <span className="home-about__check" aria-hidden="true">✓</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {ctaQuestion && (
            <div className="home-about__cta">
              <p className="home-about__cta-question">{ctaQuestion}</p>
              <Link to="/courses" className="button button--primary">
                Ver todos os cursos
              </Link>
            </div>
          )}
        </div>
      </section>

      <section id="courses" className="home-courses">
        <div className="home-courses__header">
          <h2 className="home-section-title">{t.home.discoverCourses}</h2>
          <Link to="/courses" className="home-courses__link">
            Ver catálogo →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="home-courses__empty">
            <p className="text-secondary">Nenhum curso publicado ainda. Faça login e crie o primeiro — rascunhos ficam na sua conta; ao publicar entram no catálogo.</p>
            <Link to={user ? "/admin/courses/new" : "/login"} className="button button--primary">
              {user ? "Criar curso agora" : "Entrar e criar curso"}
            </Link>
          </div>
        ) : (
          <CardGuidLayout
            children={
              <>
                {featured.map((c) => (
                  <CardCourseBase
                    key={c.id}
                    children={
                      <article className="card">
                        <div className="card__banner">
                          <img src={c.thumbnail.url} alt={c.thumbnail.alt ?? c.title} loading="lazy" />
                        </div>
                        <div className="card__content">
                          <div className="card__tags">
                            <span className="card__tag">{c.category}</span>
                            <span className="card__tag card__tag--level">{c.level}</span>
                          </div>
                          <h3 className="card__title">{c.title}</h3>
                          <p className="card__description">{c.shortDescription ?? c.description}</p>
                          <Link to={`/courses/${c.slug}`} className="card__button card__button--primary">
                            {t.common.seeMore}
                          </Link>
                        </div>
                      </article>
                    }
                  />
                ))}
              </>
            }
          />
        )}
      </section>
    </>
  );
}

export default HomePage;
