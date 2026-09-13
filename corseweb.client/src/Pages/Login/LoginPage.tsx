import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { devLogin, getGoogleClientId, getCurrentUser, loginWithGoogle } from "../../store/authStore";

declare global {
  interface Window { google?: { accounts: { id: { initialize: (o: unknown) => void; renderButton: (el: HTMLElement, o: unknown) => void; prompt?: () => void } } } }
}

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const from = loc.state?.from ?? (getCurrentUser()?.role === "admin" ? "/admin" : "/app");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    getGoogleClientId().then(setClientId).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId || !window.google) return;
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          setBusy(true); setErr(null);
          try {
            await loginWithGoogle(resp.credential);
            nav(from, { replace: true });
          } catch (e: unknown) {
            const msg = (e as { body?: { error?: string } })?.body?.error ?? (e as Error).message ?? "Falha no login Google";
            setErr(msg);
          } finally { setBusy(false); }
        },
      });
      const el = document.getElementById("gsi-btn");
      if (el) window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 280 });
    } catch { /* ignore */ }
  }, [clientId, from, nav]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) { setErr("Informe um e-mail válido"); return; }
    setBusy(true); setErr(null);
    try {
      await devLogin(email.trim(), name.trim() || undefined);
      nav(from, { replace: true });
    } catch (e2: unknown) {
      const m = (e2 as { body?: { error?: string } })?.body?.error ?? (e2 as Error).message ?? "Falha no login";
      setErr(m);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "var(--color-bg)" }}>
      <div style={{ width: "min(100%, 420px)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 24, background: "var(--color-surface, white)" }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 18 }}>CorseWeb</Link>
        <h1 style={{ margin: "12px 0 4px" }}>Entrar</h1>
        <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>
          Use sua conta Google. Emails definidos como admin no servidor ganham acesso a /admin.
        </p>

        <div id="gsi-btn" style={{ marginTop: 20, display: "flex", justifyContent: "center", minHeight: 44 }}>
          {!clientId && <span className="text-secondary" style={{ fontSize: 13 }}>Google ClientId não configurado — use login de desenvolvimento abaixo.</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          <span className="text-secondary" style={{ fontSize: 12 }}>ou</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>

        <form onSubmit={handleDevLogin} style={{ display: "grid", gap: 12 }}>
          <label className="field">
            <span className="field__label">E-mail (dev)</span>
            <input className="field__input" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" type="email" autoComplete="email" />
          </label>
          <label className="field">
            <span className="field__label">Nome (opcional)</span>
            <input className="field__input" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
          </label>
          <button className="button button--primary" disabled={busy} type="submit">
            {busy ? "Entrando…" : "Entrar (dev)"}
          </button>
        </form>

        {err && <p role="alert" style={{ color: "crimson", marginTop: 12, fontSize: 13 }}>{err}</p>}

        <p className="text-secondary" style={{ marginTop: 16, fontSize: 12 }}>
          Apenas e-mails em <code>AdminEmails</code> no servidor são admin. Configure em <code>appsettings.json</code> ou <code>appsettings.local.json</code>.
        </p>
        <p style={{ marginTop: 8 }}>
          <Link to="/" className="button button--glass" style={{ width: "100%", justifyContent: "center" }}>Voltar ao site</Link>
        </p>
      </div>
    </div>
  );
}
