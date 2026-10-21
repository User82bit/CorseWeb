import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../UIComplement/LanguageSwitcher/LanguageSwitcher";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getGoogleClientId, getLoginRedirectPath, loginWithEmail, loginWithGoogle, registerWithEmail } from "../../store/authStore";
import homeOpenBook from "../../assets/illustrations/home-open-book.svg?url";
import "./LoginPage.scss";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void | Promise<void>;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type LoginLocationState = { from?: string };
type AuthMode = "login" | "register";

function BrandMark() {
  return (
    <Link to="/" className="auth-brand" aria-label="CorseWeb">
      <img src="/favicon.ico" alt="" width={42} height={42} />
      <span>CorseWeb</span>
    </Link>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as LoginLocationState | null;
  const redirectTo = routeState?.from ?? getLoginRedirectPath();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getGoogleClientId()
      .then(id => { if (active) setClientId(id); })
      .catch(() => { if (active) setClientId(null); })
      .finally(() => { if (active) setConfigLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!clientId) return;

    let disposed = false;
    let initialized = false;

    const initializeGoogle = () => {
      if (disposed || initialized || !window.google) return;
      const element = document.getElementById("gsi-btn");
      if (!element) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async response => {
            if (!response.credential) {
              setError(t.auth.loginFailure);
              return;
            }

            setBusy(true);
            setError(null);
            try {
              await loginWithGoogle(response.credential);
              navigate(redirectTo, { replace: true });
            } catch {
              setError(t.auth.loginFailure);
            } finally {
              setBusy(false);
            }
          },
        });

        element.replaceChildren();
        window.google.accounts.id.renderButton(element, {
          theme: "outline",
          size: "large",
          width: 300,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
        initialized = true;
        setGoogleError(null);
      } catch {
        setGoogleError(t.auth.googleLoadError);
      }
    };

    const onScriptError = () => {
      if (!disposed) setGoogleError(t.auth.googleLoadError);
    };

    const script = document.querySelector<HTMLScriptElement>(
      'script[src*="accounts.google.com/gsi/client"]',
    );

    if (window.google) {
      initializeGoogle();
    } else if (script) {
      script.addEventListener("load", initializeGoogle);
      script.addEventListener("error", onScriptError);
    } else {
      queueMicrotask(() => {
        if (!disposed) setGoogleError(t.auth.googleLoadError);
      });
    }

    return () => {
      disposed = true;
      script?.removeEventListener("load", initializeGoogle);
      script?.removeEventListener("error", onScriptError);
    };
  }, [clientId, redirectTo, navigate, t.auth.googleLoadError, t.auth.loginFailure]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const normalizedEmail = email.trim();
    if (mode === "register") {
      if (name.trim().length < 2) {
        setError(t.auth.registerFailure);
        return;
      }
      if (password.length < 8) {
        setError(t.auth.passwordMinLength);
        return;
      }
      if (password !== confirmPassword) {
        setError(t.auth.passwordMismatch);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await loginWithEmail(normalizedEmail, password);
      } else {
        await registerWithEmail(name.trim(), normalizedEmail, password);
      }
      navigate(redirectTo, { replace: true });
    } catch (caught: unknown) {
      const apiError = caught as { status?: number };
      if (mode === "login" && apiError.status === 401) {
        setError(t.auth.invalidCredentials);
      } else if (mode === "register" && apiError.status === 409) {
        setError(t.auth.accountExists);
      } else {
        setError(mode === "login" ? t.auth.loginFailure : t.auth.registerFailure);
      }
    } finally {
      setBusy(false);
    }
  }

  const isRegistering = mode === "register";

  return (
    <div className="auth-page">
      <a className="auth-skip-link" href="#auth-main">{t.app.skipToContent}</a>

      <header className="auth-header">
        <div className="auth-header__inner">
          <BrandMark />
          <div className="auth-header__actions">
            <LanguageSwitcher />
            <Link to="/" className="auth-header__back">
              <SvgIcon name="arrow-left" size="1rem" />
              <span>{t.auth.backToSite}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="auth-main" className="auth-main">
        <section className="auth-promo" aria-labelledby="auth-promo-title">
          <div className="auth-promo__glow auth-promo__glow--one" />
          <div className="auth-promo__glow auth-promo__glow--two" />
          <p className="auth-eyebrow">{t.auth.brandEyebrow}</p>
          <h1 id="auth-promo-title">{t.auth.panelTitle}</h1>
          <p className="auth-promo__description">{t.auth.panelDescription}</p>

          <div className="auth-illustration" aria-hidden="true">
            <div className="auth-illustration__window">
              <div className="auth-illustration__window-top">
                <span /><span /><span />
                <span className="auth-illustration__window-label">CORSEWEB / LEARNING</span>
              </div>
              <img src={homeOpenBook} alt="" width={240} height={170} />
              <div className="auth-illustration__lines"><span /><span /><span /></div>
            </div>
            <span className="auth-illustration__float auth-illustration__float--check"><SvgIcon name="check" /></span>
            <span className="auth-illustration__float auth-illustration__float--book"><SvgIcon name="book-open" /></span>
          </div>

          <ul className="auth-benefits">
            <li><span className="auth-benefits__check"><SvgIcon name="check" size="0.9rem" /></span>{t.auth.featureOne}</li>
            <li><span className="auth-benefits__check"><SvgIcon name="check" size="0.9rem" /></span>{t.auth.featureTwo}</li>
            <li><span className="auth-benefits__check"><SvgIcon name="check" size="0.9rem" /></span>{t.auth.featureThree}</li>
          </ul>
        </section>

        <section className="auth-card-wrap" aria-labelledby="auth-form-title">
          <div className="auth-card">
            <div className="auth-card__intro">
              <span className="auth-card__mark"><SvgIcon name="user" size="1.15rem" /></span>
              <p className="auth-card__eyebrow">{isRegistering ? t.auth.registerTitle : t.auth.loginTitle}</p>
              <h2 id="auth-form-title">{isRegistering ? t.auth.registerTitle : t.auth.loginTitle}</h2>
              <p>{isRegistering ? t.auth.registerDescription : t.auth.loginDescription}</p>
            </div>

            <div className="auth-google-wrap">
              <div id="gsi-btn" className="auth-google-button" aria-busy={configLoading || busy}>
                {configLoading && <span className="auth-muted">{t.auth.googleConfigLoading}</span>}
                {!configLoading && !clientId && <span className="auth-muted">{t.auth.googleConfigMissing}</span>}
                {!configLoading && clientId && !googleError && <span className="auth-muted">{t.auth.googleConfigLoading}</span>}
              </div>
              {googleError && <p role="status" className="auth-inline-note">{googleError}</p>}
            </div>

            <div className="auth-divider"><span>{t.auth.divider}</span></div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegistering && (
                <label className="auth-field">
                  <span>{t.auth.nameLabel}</span>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder={t.auth.namePlaceholder}
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                    disabled={busy}
                  />
                </label>
              )}

              <label className="auth-field">
                <span>{t.auth.emailLabel}</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={busy}
                />
              </label>

              <label className="auth-field">
                <span>{t.auth.passwordLabel}</span>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  minLength={isRegistering ? 8 : undefined}
                  maxLength={128}
                  required
                  disabled={busy}
                />
                {isRegistering && <small>{t.auth.passwordHint}</small>}
              </label>

              {isRegistering && (
                <label className="auth-field">
                  <span>{t.auth.confirmPasswordLabel}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={busy}
                  />
                </label>
              )}

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="auth-submit" disabled={busy}>
                <span>{busy
                  ? (isRegistering ? t.auth.registerBusy : t.auth.loginBusy)
                  : (isRegistering ? t.auth.registerAction : t.auth.loginAction)}</span>
                {!busy && <SvgIcon name="arrow-right" size="1rem" />}
              </button>
            </form>

            <p className="auth-switch">
              {isRegistering ? t.auth.hasAccount : t.auth.noAccount}
              <button
                type="button"
                onClick={() => switchMode(isRegistering ? "login" : "register")}
                disabled={busy}
              >
                {isRegistering ? t.auth.signInLink : t.auth.createAccountLink}
              </button>
            </p>

            <p className="auth-security-note"><SvgIcon name="check" size="0.9rem" />{t.auth.accountNote}</p>
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} CorseWeb</span>
        <Link to="/courses">{t.home.discoverCourses}</Link>
      </footer>
    </div>
  );
}
