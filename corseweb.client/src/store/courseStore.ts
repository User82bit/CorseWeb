import { apiFetch, apiJson } from "../lib/api";
import type { Course, CourseCreateInput, CourseLevel } from "../types/course";
import { courseCatalog as seedCatalog } from "../content/courses";

// ── Cache backend (publicados + drafts do usuário) ──
const LS_PUBLISHED = "corseweb:courses:cache:v1";
const LS_DRAFTS = "corseweb:drafts:cache:v1";
// ── Fallback legado (mesma chave do courseStore antigo) ──
const LS_LEGACY = "corseweb:courses:v1";

export type CourseDraftClient = Course & { draftId?: string; draftOwnerId?: string; isDraft?: boolean };

function saveCache(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}
function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}
function loadLegacy(): Course[] {
  if (typeof window === "undefined") return [...seedCatalog];
  try {
    const raw = localStorage.getItem(LS_LEGACY);
    if (!raw) return [...seedCatalog];
    const parsed = JSON.parse(raw) as Course[];
    return Array.isArray(parsed) ? parsed : [...seedCatalog];
  } catch { return [...seedCatalog]; }
}
function saveLegacy(courses: Course[]) {
  try { localStorage.setItem(LS_LEGACY, JSON.stringify(courses)); } catch { /* quota */ }
}

function normalizeCourse(raw: unknown): Course {
  const r = raw as Record<string, unknown>;
  // server returns camelCase; thumbnail/tags/modules already deserialized as objects
  const thumb = (r["thumbnail"] ?? r["thumbnailJson"] ?? { id: "thumb-default", type: "image", url: "/hero.png", alt: String(r["title"] ?? "") }) as Course["thumbnail"];
  return {
    id: String(r["id"] ?? ""),
    slug: String(r["slug"] ?? ""),
    title: String(r["title"] ?? ""),
    subtitle: (r["subtitle"] as string | undefined) ?? undefined,
    description: String(r["description"] ?? ""),
    shortDescription: (r["shortDescription"] as string | undefined) ?? String(r["description"] ?? "").slice(0, 140),
    thumbnail: thumb as Course["thumbnail"],
    category: String(r["category"] ?? "Geral"),
    tags: (r["tags"] ?? []) as Course["tags"],
    level: (r["level"] ?? "Iniciante") as Course["level"],
    status: (r["status"] ?? "publicado") as Course["status"],
    language: String(r["language"] ?? "pt-BR"),
    modules: (r["modules"] ?? []) as Course["modules"],
    totalModules: Number(r["totalModules"] ?? 0),
    totalLessons: Number(r["totalLessons"] ?? 0),
    totalMinutes: Number(r["totalMinutes"] ?? 0),
    seoTitle: r["seoTitle"] as string | undefined,
    seoDescription: r["seoDescription"] as string | undefined,
    ogImage: r["ogImage"] as Course["ogImage"],
    allowComments: r["allowComments"] != null ? Boolean(r["allowComments"]) : true,
    allowFork: r["allowFork"] != null ? Boolean(r["allowFork"]) : true,
    isFeatured: Boolean(r["isFeatured"] ?? false),
    authorId: String(r["authorId"] ?? "unknown"),
    authorName: String(r["authorName"] ?? "Autor"),
    authorAvatar: r["authorAvatar"] as Course["authorAvatar"],
    version: Number(r["version"] ?? 1),
    changelog: r["changelog"] as string | undefined,
    createdAt: String(r["createdAt"] ?? new Date().toISOString()),
    updatedAt: String(r["updatedAt"] ?? new Date().toISOString()),
    createdBy: String(r["createdBy"] ?? r["authorId"] ?? ""),
    updatedBy: String(r["updatedBy"] ?? r["authorId"] ?? ""),
  };
}

function draftToCourse(raw: unknown): CourseDraftClient {
  const r = raw as Record<string, unknown>;
  const id = String(r["id"] ?? "");
  return {
    id,
    draftId: id,
    draftOwnerId: String(r["ownerId"] ?? ""),
    isDraft: true,
    slug: String(r["slug"] ?? ""),
    title: String(r["title"] ?? ""),
    subtitle: (r["subtitle"] as string | undefined) ?? undefined,
    description: String(r["description"] ?? ""),
    shortDescription: (r["shortDescription"] as string | undefined) ?? String(r["description"] ?? "").slice(0, 140),
    thumbnail: (r["thumbnail"] ?? { id: "thumb-default", type: "image", url: "/hero.png", alt: String(r["title"] ?? "") }) as Course["thumbnail"],
    category: String(r["category"] ?? "Geral"),
    tags: (r["tags"] ?? []) as Course["tags"],
    level: (r["level"] ?? "Iniciante") as CourseLevel,
    status: "rascunho" as const,
    language: String(r["language"] ?? "pt-BR"),
    modules: (r["modules"] ?? []) as Course["modules"],
    totalModules: Number(r["totalModules"] ?? 0),
    totalLessons: Number(r["totalLessons"] ?? 0),
    totalMinutes: Number(r["totalMinutes"] ?? 0),
    allowComments: r["allowComments"] != null ? Boolean(r["allowComments"]) : true,
    allowFork: r["allowFork"] != null ? Boolean(r["allowFork"]) : true,
    isFeatured: false,
    authorId: String(r["ownerId"] ?? "local-user"),
    authorName: "Você",
    version: 1,
    createdAt: String(r["createdAt"] ?? new Date().toISOString()),
    updatedAt: String(r["updatedAt"] ?? new Date().toISOString()),
    createdBy: String(r["ownerId"] ?? ""),
    updatedBy: String(r["ownerId"] ?? ""),
  };
}

// cache em memória
let publishedCache: Course[] = loadCache<Course[]>(LS_PUBLISHED) ?? [];
let draftsCache: CourseDraftClient[] = loadCache<CourseDraftClient[]>(LS_DRAFTS) ?? [];
let legacyCache: Course[] = loadLegacy();
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function notify() {
  for (const cb of listeners) cb();
  try { window.dispatchEvent(new CustomEvent("corseweb:courses-changed")); } catch { /* */ }
}

function slugify(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `curso-${Date.now()}`;
}
function nowIso() { return new Date().toISOString(); }

// ── Refresh backend (publicados + drafts) ──
export async function refreshCourses(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch("/api/courses");
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json) ? json : [];
        publishedCache = arr.map(normalizeCourse);
        saveCache(LS_PUBLISHED, publishedCache);
      }
      // drafts precisam auth; 401 => sem drafts
      try {
        const draftsJson = await apiJson<unknown[]>("/api/drafts");
        if (Array.isArray(draftsJson)) {
          draftsCache = draftsJson.map(draftToCourse);
          saveCache(LS_DRAFTS, draftsCache);
        } else draftsCache = [];
      } catch (e: unknown) {
        const s = (e as { status?: number })?.status;
        if (s === 401 || s === 403) {
          draftsCache = [];
          saveCache(LS_DRAFTS, draftsCache);
        }
      }
      // re-hidrata legacy tbm (outra aba pode ter escrito)
      legacyCache = loadLegacy();
      notify();
    } finally { inflight = null; }
  })();
  return inflight;
}

// ── Leituras síncronas (compatível com páginas existentes) ──
export function getPublishedCourses(): Course[] { return publishedCache; }
export function getDraftCourses(): CourseDraftClient[] { return draftsCache; }

/** Todos visíveis para o usuário: publicados + seus rascunhos (DB) + legado local (fallback offline). Dedupe por slug. */
export function getAllCourses(): Course[] {
  const bySlug = new Map<string, Course>();
  for (const c of publishedCache) bySlug.set(c.slug, c);
  for (const d of draftsCache) {
    // drafts entram como rascunho; se slug colide com publicado, mantém publicado (draft é edição futura, não mostra duplicado)
    if (!bySlug.has(d.slug)) bySlug.set(d.slug, d);
  }
  // legado entra apenas se não existe no backend (preserva dados antigos offline)
  for (const l of legacyCache) {
    if (!bySlug.has(l.slug)) bySlug.set(l.slug, l);
  }
  return [...bySlug.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getCourseBySlugStore(slug: string): Course | undefined {
  return getAllCourses().find(c => c.slug === slug);
}
// alias compat
export const getCourseBySlug = getCourseBySlugStore;

// ── Criação / edição de rascunho ──
function legacyCreateCourse(input: CourseCreateInput, authorId = "local-user", authorName = "Você"): Course {
  const baseSlug = slugify(input.title);
  let slug = baseSlug; let n = 1;
  const existing = new Set(loadLegacy().map(c => c.slug));
  while (existing.has(slug)) slug = `${baseSlug}-${++n}`;
  const now = nowIso();
  const course: Course = {
    id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    slug, title: input.title.trim(), subtitle: input.subtitle?.trim() || undefined,
    description: input.description.trim(), shortDescription: input.description.trim().slice(0, 140),
    thumbnail: input.thumbnail ?? { id: "thumb-default", type: "image", url: "/hero.png", alt: input.title },
    category: input.category, tags: input.tags ?? [], level: input.level, status: "rascunho" as const,
    language: input.language ?? "pt-BR", modules: [], totalModules: 0, totalLessons: 0, totalMinutes: 0,
    allowComments: input.allowComments ?? true, allowFork: input.allowFork ?? true, isFeatured: false,
    authorId, authorName, version: 1, createdAt: now, updatedAt: now, createdBy: authorId, updatedBy: authorId,
  };
  const next = [...loadLegacy(), course];
  legacyCache = next; saveLegacy(next); notify(); return course;
}

export async function createDraft(input: CourseCreateInput, authorId?: string, authorName?: string): Promise<CourseDraftClient | Course> {
  const body = {
    title: input.title, subtitle: input.subtitle ?? null, description: input.description,
    category: input.category, level: input.level, language: input.language ?? "pt-BR",
    tags: input.tags ?? [], thumbnail: input.thumbnail ?? null, modules: [],
    allowComments: input.allowComments ?? true, allowFork: input.allowFork ?? true,
  };
  try {
    const raw = await apiJson<unknown>("/api/drafts", { method: "POST", body: JSON.stringify(body) });
    const draft = draftToCourse(raw);
    draftsCache = [draft, ...draftsCache.filter(d => d.draftId !== draft.draftId)];
    saveCache(LS_DRAFTS, draftsCache); notify(); return draft;
  } catch (e: unknown) {
    const s = (e as { status?: number })?.status;
    if (s === 401 || s === 403) {
      // sem login: fallback legado
      return legacyCreateCourse(input, authorId, authorName);
    }
    // rede falhou: fallback legado mas propaga erro se foi validação
    if (s != null && s >= 400 && s < 500) throw e;
    return legacyCreateCourse(input, authorId, authorName);
  }
}

// compat: createCourse agora tenta backend, cai no legado
export async function createCourse(input: CourseCreateInput, authorId = "local-user", authorName = "Você"): Promise<Course> {
  const res = await createDraft(input, authorId, authorName);
  return res as Course;
}

export async function updateDraft(draftId: string, patch: Partial<CourseCreateInput> & { slug?: string; modules?: Course["modules"] }): Promise<CourseDraftClient> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body["title"] = patch.title;
  if (patch.subtitle !== undefined) body["subtitle"] = patch.subtitle ?? null;
  if (patch.description !== undefined) body["description"] = patch.description;
  if (patch.category !== undefined) body["category"] = patch.category;
  if (patch.level !== undefined) body["level"] = patch.level;
  if (patch.language !== undefined) body["language"] = patch.language;
  if (patch.tags !== undefined) body["tags"] = patch.tags;
  if (patch.thumbnail !== undefined) body["thumbnail"] = patch.thumbnail;
  if (patch.allowComments !== undefined) body["allowComments"] = patch.allowComments;
  if (patch.allowFork !== undefined) body["allowFork"] = patch.allowFork;
  if (patch.slug !== undefined) body["slug"] = patch.slug;
  if (patch.modules !== undefined) body["modules"] = patch.modules;
  const raw = await apiJson<unknown>(`/api/drafts/${encodeURIComponent(draftId)}`, { method: "PUT", body: JSON.stringify(body) });
  const updated = draftToCourse(raw);
  draftsCache = draftsCache.map(d => d.draftId === draftId ? updated : d);
  saveCache(LS_DRAFTS, draftsCache); notify(); return updated;
}

export async function deleteDraft(draftId: string): Promise<void> {
  const res = await apiFetch(`/api/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`delete draft ${res.status}`);
  draftsCache = draftsCache.filter(d => d.draftId !== draftId);
  saveCache(LS_DRAFTS, draftsCache); notify();
}

export async function publishDraft(draftId: string): Promise<Course> {
  const raw = await apiJson<unknown>(`/api/drafts/${encodeURIComponent(draftId)}/publish`, { method: "POST" });
  const course = normalizeCourse(raw);
  draftsCache = draftsCache.filter(d => d.draftId !== draftId);
  saveCache(LS_DRAFTS, draftsCache);
  publishedCache = [course, ...publishedCache.filter(c => c.id !== course.id)];
  saveCache(LS_PUBLISHED, publishedCache);
  // remove do legado se existia com mesmo slug
  legacyCache = loadLegacy().filter(c => c.slug !== course.slug);
  saveLegacy(legacyCache);
  notify(); return course;
}

// publicados
export async function updatePublishedCourse(slug: string, patch: Partial<Course>): Promise<Course> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body["title"] = patch.title;
  if (patch.subtitle !== undefined) body["subtitle"] = patch.subtitle;
  if (patch.description !== undefined) body["description"] = patch.description;
  if (patch.category !== undefined) body["category"] = patch.category;
  if (patch.level !== undefined) body["level"] = patch.level;
  if (patch.language !== undefined) body["language"] = patch.language;
  if (patch.tags !== undefined) body["tags"] = patch.tags;
  if (patch.thumbnail !== undefined) body["thumbnail"] = patch.thumbnail;
  if (patch.allowComments !== undefined) body["allowComments"] = patch.allowComments;
  if (patch.allowFork !== undefined) body["allowFork"] = patch.allowFork;
  if (patch.isFeatured !== undefined) body["isFeatured"] = patch.isFeatured;
  // Nested course content remains data-only; scripts are not executed by the editor.
  if (patch.modules !== undefined) body["modules"] = patch.modules;
  const raw = await apiJson<unknown>(`/api/courses/${encodeURIComponent(slug)}`, { method: "PUT", body: JSON.stringify(body) });
  const updated = normalizeCourse(raw);
  // slug pode não mudar; se mudar, remove antigo
  publishedCache = publishedCache.map(c => c.slug === slug ? updated : c);
  // se slug mudou, garante dedup
  publishedCache = publishedCache.filter((c, i, a) => a.findIndex(x => x.slug === c.slug) === i);
  saveCache(LS_PUBLISHED, publishedCache); notify(); return updated;
}

export async function deletePublishedCourse(slug: string): Promise<void> {
  const res = await apiFetch(`/api/courses/${encodeURIComponent(slug)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
  publishedCache = publishedCache.filter(c => c.slug !== slug);
  saveCache(LS_PUBLISHED, publishedCache); notify();
}

// shims compatíveis com código antigo que chamava updateCourse/deleteCourse com slug
export async function updateCourse(slug: string, patch: Partial<Course>): Promise<Course | undefined> {
  // draft?
  const draft = draftsCache.find(d => d.slug === slug);
  if (draft?.draftId) {
    try {
      const upd = await updateDraft(draft.draftId, {
        title: patch.title, subtitle: patch.subtitle, description: patch.description,
        category: patch.category, level: patch.level as Course["level"], language: patch.language,
        tags: patch.tags as CourseCreateInput["tags"], thumbnail: patch.thumbnail,
        allowComments: patch.allowComments, allowFork: patch.allowFork, modules: patch.modules,
      });
      return upd as unknown as Course;
    } catch {
      // fallback legado
    }
  }
  // publicado?
  const pub = publishedCache.find(c => c.slug === slug);
  if (pub) {
    return updatePublishedCourse(slug, patch);
  }
  // legado
  const list = loadLegacy();
  const idx = list.findIndex(c => c.slug === slug);
  if (idx === -1) return undefined;
  const updated: Course = { ...list[idx], ...patch, updatedAt: nowIso(), updatedBy: list[idx].updatedBy };
  const next = [...list]; next[idx] = updated;
  legacyCache = next; saveLegacy(next); notify(); return updated;
}

export async function deleteCourse(slug: string): Promise<void> {
  const draft = draftsCache.find(d => d.slug === slug);
  if (draft?.draftId) {
    try { await deleteDraft(draft.draftId); return; } catch { /* fallthrough */ }
  }
  const pub = publishedCache.find(c => c.slug === slug);
  if (pub) { await deletePublishedCourse(slug); return; }
  const next = loadLegacy().filter(c => c.slug !== slug);
  legacyCache = next; saveLegacy(next); notify();
}

// publicar/despublicar toggle
export async function togglePublish(slug: string): Promise<Course> {
  const draft = draftsCache.find(d => d.slug === slug);
  if (draft?.draftId) return publishDraft(draft.draftId);
  // se já é publicado, arquiva (toggle para arquivado)
  const pub = publishedCache.find(c => c.slug === slug);
  if (!pub) throw new Error("Curso não encontrado");
  const target = pub.status === "publicado" ? "arquivado" : "publicado";
  const res = await apiJson<unknown>(`/api/courses/${encodeURIComponent(slug)}/publish`, { method: "POST", body: JSON.stringify({ status: target }) });
  const updated = normalizeCourse(res);
  publishedCache = publishedCache.map(c => c.slug === slug ? updated : c);
  saveCache(LS_PUBLISHED, publishedCache); notify(); return updated;
}

export function subscribeCourses(cb: () => void): () => void {
  listeners.add(cb);
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === LS_PUBLISHED || e.key === LS_DRAFTS || e.key === LS_LEGACY) {
      const p = loadCache<Course[]>(LS_PUBLISHED); if (p) publishedCache = p;
      const d = loadCache<CourseDraftClient[]>(LS_DRAFTS); if (d) draftsCache = d;
      legacyCache = loadLegacy();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("corseweb:courses-changed", onCustom as EventListener);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("corseweb:courses-changed", onCustom as EventListener);
  };
}

// eager refresh
if (typeof window !== "undefined") {
  setTimeout(() => { refreshCourses().catch(() => {}); }, 50);
}
