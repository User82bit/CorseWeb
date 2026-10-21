import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { devLogin, getGoogleClientId, getLoginRedirectPath, loginWithGoogle } from "../../store/authStore";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: unknown) => void;
          renderButton: (element: HTMLElement, options: unknown) => void;
        };
      };
    };
  }
}

type LoginLocationState = { from?: string };

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const from = locationState?.from ?? getLoginRedirectPath();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const isDevelopment = import.meta.env.DEV;

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
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              setErr("O Google não retornou uma credencial válida. Tente novamente.");
              return;
            }

            setBusy(true);
            setErr(null);
            try {
              await loginWithGoogle(response.credential);
              nav(from, { replace: true });
            } catch (error: unknown) {
              const apiError = error as { body?: { error?: string }; message?: string };
              setErr(apiError.body?.error ?? apiError.message ?? "Falha no login Google.");
            } finally {
              setBusy(false);
            }
          },
        });

        element.replaceChildren();
        window.google.accounts.id.renderButton(element, {
          theme: "outline",
          size: "large",
          width: 280,
          text: "signin_with",
          shape: "rectangular",
        });
        initialized = true;
        setGoogleError(null);
      } catch {
        setGoogleError("Não foi possível inicializar o login Google. Recarregue a página e tente novamente.");
      }
    };

    const onScriptError = () => {
      if (!disposed) {
        setGoogleError("Não foi possível carregar o serviço de login do Google. Verifique sua conexão ou tente novamente.");
      }
    };

    const script = document.querySelector<HTMLScriptElement>(
      'script[src*="accounts.google.com/gsi/client"]',
    );

    if (window.google) {
      initializeGoogle();
    } else if (script) {
      // The Google script is async/defer. Listen for it instead of assuming
      // it loaded before the API returned the client ID.
      script.addEventListener("load", initializeGoogle);
      script.addEventListener("error", onScriptError);
    } else {
      // Defer the state update out of the effect body to avoid an immediate
      // render cascade; this branch is only a defensive fallback.
      queueMicrotask(() => {
        if (!disposed) setGoogleError("O script de login Google não foi encontrado nesta página.");
      });
    }

    return () => {
      disposed = true;
      script?.removeEventListener("load", initializeGoogle);
      script?.removeEventListener("error", onScriptError);
    };
  }, [clientId, from, nav]);

  const handleDevLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErr("Informe um e-mail válido.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      await devLogin(email.trim(), name.trim() || undefined);
      nav(from, { replace: true });
    } catch (error: unknown) {
      const apiError = error as { body?: { error?: string }; message?: string };
      setErr(apiError.body?.error ?? apiError.message ?? "Falha no login de desenvolvimento.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "clamp(1rem, 5vw, 2rem)", background: "var(--color-bg)" }}>
      <section aria-labelledby="login-title" style={{ width: "min(100%, 420px)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "clamp(1.25rem, 5vw, 1.5rem)", background: "var(--color-surface, white)" }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 18 }}>CorseWeb</Link>
        <h1 id="login-title" style={{ margin: "12px 0 4px" }}>Entrar</h1>
        <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>
          Entre com sua conta Google para acessar seus cursos. Em desenvolvimento, também é possível usar o acesso de teste.
        </p>

        <div id="gsi-btn" aria-busy={configLoading || busy} style={{ marginTop: 20, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 44 }}>
          {configLoading && <span className="text-secondary" style={{ fontSize: 13 }}>Verificando login Google…</span>}
          {!configLoading && clientId && !googleError && <span className="text-secondary" style={{ fontSize: 13 }}>Carregando login Google…</span>}
          {!configLoading && !clientId && !isDevelopment && <span className="text-secondary" style={{ fontSize: 13 }}>O login Google não está configurado neste ambiente.</span>}
          {!configLoading && !clientId && isDevelopment && <span className="text-secondary" style={{ fontSize: 13 }}>Google Client ID não configurado — use o acesso de desenvolvimento abaixo.</span>}
        </div>
        {googleError && <p role="status" className="text-secondary" style={{ fontSize: 13, marginTop: 8 }}>{googleError}</p>}

        {isDevelopment && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
              <div aria-hidden="true" style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              <span className="text-secondary" style={{ fontSize: 12 }}>ou acesso de desenvolvimento</span>
              <div aria-hidden="true" style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            </div>

            <form onSubmit={handleDevLogin} style={{ display: "grid", gap: 12 }}>
              <label className="field">
                <span className="field__label">E-mail</span>
                <input
                  className="field__input"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                <span className="field__label">Nome (opcional)</span>
                <input
                  className="field__input"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </label>
              <button className="button button--primary" disabled={busy} type="submit">
                {busy ? "Entrando…" : "Entrar em modo de desenvolvimento"}
              </button>
            </form>
          </>
        )}

        {err && <p role="alert" style={{ color: "var(--color-danger, crimson)", marginTop: 12, fontSize: 13 }}>{err}</p>}

        <p className="text-secondary" style={{ marginTop: 16, fontSize: 12 }}>
          {isDevelopment
            ? <>Este acesso de teste só é aceito quando o backend está em <code>Development</code>. A permissão de administrador vem da configuração <code>AdminEmails</code> no servidor.</>
            : <>Se o login Google não aparecer, o servidor precisa ter <code>Authentication:Google:ClientId</code> configurado.</>}
        </p>
        <p style={{ marginTop: 8 }}>
          <Link to="/" className="button button--glass" style={{ width: "100%", justifyContent: "center" }}>Voltar ao site</Link>
        </p>
      </section>
    </main>
  );
}
