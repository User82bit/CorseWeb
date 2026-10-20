import { apiFetch, apiJson } from "../lib/api";
import { refreshCourses } from "./courseStore";

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "user" | "admin";
};

const LS_KEY_USER = "corseweb:user:v1";

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch { return null; }
}
function saveUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (!user) localStorage.removeItem(LS_KEY_USER);
  else localStorage.setItem(LS_KEY_USER, JSON.stringify(user));
  try { window.dispatchEvent(new CustomEvent("corseweb:auth-changed")); } catch { /* */ }
  for (const cb of listeners) cb();
}

let currentUser: User | null = loadUser();
const listeners = new Set<() => void>();

export function getCurrentUser(): User | null {
  // re-hidrata se outra aba escreveu
  const cached = loadUser();
  if (cached) currentUser = cached;
  return currentUser;
}

export function isAdmin(user: User | null = getCurrentUser()): boolean {
  if (!user) return false;
  return user.role === "admin";
}

export function getLoginRedirectPath(user: User | null = getCurrentUser()): string {
  return isAdmin(user) ? "/admin" : "/app";
}

let inflightAuth: Promise<User | null> | null = null;

export async function refreshAuth(): Promise<User | null> {
  if (inflightAuth) return inflightAuth;
  inflightAuth = (async () => {
    try {
      const user = await apiJson<User>("/api/auth/me");
      currentUser = user;
      saveUser(user);
      // drafts são por usuário — recarrega cursos após auth mudar
      refreshCourses().catch(() => {});
      return user;
    } catch (e: unknown) {
      const s = (e as { status?: number })?.status;
      if (s === 401) {
        currentUser = null;
        saveUser(null);
        refreshCourses().catch(() => {});
        return null;
      }
      // rede falhou: mantém cache
      return currentUser;
    } finally {
      inflightAuth = null;
    }
  })();
  return inflightAuth;
}

export async function loginWithGoogle(idToken: string): Promise<User> {
  const user = await apiJson<User>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  currentUser = user;
  saveUser(user);
  refreshCourses().catch(() => {});
  return user;
}

export async function devLogin(email: string, name?: string): Promise<User> {
  const user = await apiJson<User>("/api/auth/dev-login", {
    method: "POST",
    body: JSON.stringify({ email, name: name ?? email.split("@")[0] }),
  });
  currentUser = user;
  saveUser(user);
  refreshCourses().catch(() => {});
  return user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch { /* ignore */ }
  currentUser = null;
  saveUser(null);
  refreshCourses().catch(() => {});
}

export async function getGoogleClientId(): Promise<string | null> {
  try {
    const res = await apiFetch("/api/auth/config");
    if (!res.ok) return null;
    const j = await res.json() as { googleClientId?: string };
    return j.googleClientId || null;
  } catch { return null; }
}

export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb);
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === LS_KEY_USER) {
      currentUser = loadUser();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("corseweb:auth-changed", onCustom as EventListener);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("corseweb:auth-changed", onCustom as EventListener);
  };
}

// eager: valida sessão no load
if (typeof window !== "undefined") {
  setTimeout(() => { refreshAuth().catch(() => {}); }, 50);
}

// legacy compat: mockLogin now delegates to devLogin when possível
export async function mockLogin(email: string, name = email.split("@")[0]): Promise<User> {
  try {
    return await devLogin(email, name);
  } catch {
    // se backend offline, faz fallback local (não autentica de verdade)
    const user: User = { id: `user-${email.toLowerCase()}`, name, email, role: "user" };
    currentUser = user;
    saveUser(user);
    return user;
  }
}
