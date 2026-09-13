import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, isAdmin, refreshAuth } from "../store/authStore";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState<boolean>(() => !!getCurrentUser());
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    refreshAuth().then(u => { if (alive) { setAuthed(!!u); setChecked(true); } }).catch(() => { if (alive) setChecked(true); });
    return () => { alive = false; };
  }, []);

  if (!checked && !authed) {
    // mostra nada até checar, mas não bloqueia forever
    // se já tem user no cache, permite render
    const cached = getCurrentUser();
    if (!cached) return <div style={{ padding: 24 }}>Carregando…</div>;
  }
  if (!authed && checked) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (authed) return <>{children}</>;
  // optimistic while checking
  const cached = getCurrentUser();
  if (cached) return <>{children}</>;
  return <div style={{ padding: 24 }}>Carregando…</div>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(() => getCurrentUser());
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    refreshAuth().then(u => { if (alive) { setUser(u); setChecked(true); } }).catch(() => { if (alive) setChecked(true); });
    return () => { alive = false; };
  }, []);

  if (!checked && !user) return <div style={{ padding: 24 }}>Carregando…</div>;
  const u = user ?? getCurrentUser();
  if (!u) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin(u)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
