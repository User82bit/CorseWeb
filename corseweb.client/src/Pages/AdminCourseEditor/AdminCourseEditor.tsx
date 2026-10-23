import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { CourseCreateInput, Media, Module } from "../../types/course";
import { apiFetch } from "../../lib/api";
import { createCourse, getCourseBySlugStore, subscribeCourses, updateCourse, publishDraft, getDraftCourses, refreshCourses } from "../../store/courseStore";
import CourseStructureEditor from "./CourseStructureEditor";
import { DEFAULT_COURSE_COVER_URL, resolveCourseCoverUrl } from "../../utils/courseCoverUrl";
import "./AdminCourseEditor.scss";

const CATEGORIES = ["Idiomas", "Desenvolvimento", "Data Science", "Design", "Negócios", "Marketing"];
function AdminCourseEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as { lessonEditorReturn?: boolean; modules?: Module[]; courseForm?: CourseCreateInput } | null;
  const restoreLessonEditorResult = navigationState?.lessonEditorReturn === true;
  const { courseSlug } = useParams<{ courseSlug?: string }>();
  const isEditing = Boolean(courseSlug);
  const existing = courseSlug ? getCourseBySlugStore(courseSlug) : undefined;
  const isDraft = Boolean(existing && (existing as unknown as { isDraft?: boolean }).isDraft);

  const [form, setForm] = useState<CourseCreateInput>(() =>
    restoreLessonEditorResult && navigationState?.courseForm
      ? navigationState.courseForm
      : ({
          title: existing?.title ?? "",
          subtitle: existing?.subtitle ?? "",
          description: existing?.description ?? "",
          thumbnail: existing?.thumbnail,
          category: existing?.category ?? CATEGORIES[0],
          tags: (existing?.tags as CourseCreateInput["tags"]) ?? [],
          level: (existing?.level as CourseCreateInput["level"]) ?? "Iniciante",
          language: existing?.language ?? "pt-BR",
          allowComments: existing?.allowComments ?? true,
          allowFork: existing?.allowFork ?? true,
        }));

  const [modules, setModules] = useState<Module[]>(() =>
    restoreLessonEditorResult && navigationState?.modules
      ? navigationState.modules
      : existing?.modules ?? []
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverUrlDraft, setCoverUrlDraft] = useState(() => existing?.thumbnail?.url ?? DEFAULT_COURSE_COVER_URL);

  useEffect(() => {
    refreshCourses().catch(() => {});
  }, []);

  useEffect(() => {
    if (!courseSlug || restoreLessonEditorResult) return;
    return subscribeCourses(() => {
      const c = getCourseBySlugStore(courseSlug);
      if (c) {
        setForm({
          title: c.title,
          subtitle: c.subtitle ?? "",
          description: c.description,
          thumbnail: c.thumbnail,
          category: c.category,
          tags: c.tags as CourseCreateInput["tags"],
          level: c.level as CourseCreateInput["level"],
          language: c.language,
          allowComments: c.allowComments,
          allowFork: c.allowFork,
        });
        setCoverUrlDraft(c.thumbnail?.url ?? DEFAULT_COURSE_COVER_URL);
        setModules(c.modules ?? []);
      }
    });
  }, [courseSlug, restoreLessonEditorResult]);

  const canSave = form.title.trim().length >= 3 && form.description.trim().length >= 20;

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    // Some systems leave File.type empty; in that case let the backend
    // validate the actual file signature instead of rejecting a valid image.
    if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setCoverError("Use uma imagem PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setCoverUploading(true);
    setCoverError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await apiFetch("/api/course-media/covers", { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Não foi possível enviar a capa.");
      }
      const uploaded = await response.json() as Media;
      const uploadedCover = { ...uploaded, alt: form.title.trim() || "Capa do curso" };
      setCoverUrlDraft(uploadedCover.url);
      setForm((current) => ({
        ...current,
        thumbnail: { ...uploadedCover, alt: current.title.trim() || "Capa do curso" },
      }));
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "Não foi possível enviar a capa.");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverUrlBlur = () => {
    const url = resolveCourseCoverUrl(coverUrlDraft);
    if (!url) {
      setCoverError("Use uma URL HTTP(S) válida ou um caminho local iniciado por /.");
      return;
    }

    setCoverError(null);
    setCoverUrlDraft(url);
    setForm((current) => ({
      ...current,
      thumbnail: {
        ...(current.thumbnail ?? { id: "course-cover", type: "image" as const, alt: current.title }),
        url,
        alt: current.thumbnail?.alt || current.title,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;

    const coverUrl = resolveCourseCoverUrl(coverUrlDraft);
    if (!coverUrl) {
      setCoverError("Use uma URL HTTP(S) válida ou um caminho local iniciado por /.");
      return;
    }

    const formToSave: CourseCreateInput = {
      ...form,
      thumbnail: {
        ...(form.thumbnail ?? { id: "course-cover", type: "image" as const, alt: form.title }),
        url: coverUrl,
        alt: form.thumbnail?.alt?.trim() || form.title.trim() || "Capa do curso",
      },
    };

    setCoverError(null);
    setCoverUrlDraft(coverUrl);
    setForm(formToSave);
    setSaving(true); setErr(null);
    try {
      if (isEditing && courseSlug) {
        await updateCourse(courseSlug, {
          title: form.title.trim(),
          subtitle: form.subtitle?.trim() || undefined,
          description: form.description.trim(),
          thumbnail: formToSave.thumbnail,
          category: form.category,
          level: form.level,
          language: form.language,
          allowComments: form.allowComments,
          allowFork: form.allowFork,
          modules,
        });
        setSaveMessage("Curso e estrutura salvos.");
      } else {
        const created = await createCourse(formToSave) as unknown as { slug: string };
        navigate(`/admin/courses/${created.slug}/editor`);
      }
    } catch (e2: unknown) {
      const msg = (e2 as { body?: { error?: string }; message?: string })?.body?.error ?? (e2 as { message?: string })?.message ?? "Falha ao salvar. Verifique se está logado.";
      setErr(msg);
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!courseSlug || publishBusy) return;
    const draft = getDraftCourses().find(d => d.slug === courseSlug);
    if (!draft?.draftId) { setErr("Este curso já está publicado ou não é um rascunho seu."); return; }
    setPublishBusy(true); setErr(null);
    try {
      await publishDraft(draft.draftId);
      navigate("/admin/courses");
    } catch (e2: unknown) {
      const msg = (e2 as { body?: { error?: string }; message?: string })?.body?.error ?? (e2 as Error).message ?? "Falha ao publicar";
      setErr(msg);
    } finally { setPublishBusy(false); }
  };

  return (
    <section className="admin-editor">
      <header className="admin-editor__header">
        <div>
          <p className="admin-editor__eyebrow">{isEditing ? (isDraft ? "Rascunho vinculado à sua conta" : "Edição (publicado)") : "Autoria"}</p>
          <h1 className="display-lg">{isEditing ? "Editar curso" : "Novo curso"}</h1>
          <p className="admin-editor__subtitle">
            {isEditing
              ? isDraft
                ? "Rascunho salvo no banco (vinculado à sua conta). Ao publicar, entra no catálogo público."
                : "Curso publicado. Edições geram nova versão."
              : "Qualquer usuário logado pode criar. O curso inicia como rascunho vinculado à sua conta e só aparece no catálogo após publicar."}
          </p>
        </div>
        <div className="admin-editor__header-actions">
          <Link to="/admin/courses" className="button button--secondary">
            Cancelar
          </Link>
          {isEditing && isDraft && (
            <button type="button" className="button button--primary" onClick={handlePublish} disabled={publishBusy}>
              {publishBusy ? "Publicando…" : "Publicar"}
            </button>
          )}
          <button type="submit" form="course-form" className="button button--primary" disabled={!canSave || saving}>
            {saving ? "Salvando…" : isEditing ? "Salvar" : "Criar rascunho"}
          </button>
        </div>
      </header>

      {err && <p role="alert" style={{ color: "crimson", margin: "12px 0" }}>{err}</p>}
      {saveMessage && <p className="admin-editor__status" role="status">{saveMessage}</p>}
      {isEditing && !existing && (
        <p className="text-secondary">Curso não encontrado. Pode ter sido removido ou você não tem permissão.</p>
      )}

      <form id="course-form" className="admin-editor__form" onSubmit={handleSubmit}>
        <div className="admin-editor__grid">
          <div className="admin-editor__main">
            <label className="field">
              <span className="field__label">Título *</span>
              <input
                className="field__input"
                value={form.title}
                onChange={(e) => { setSaveMessage(null); setForm({ ...form, title: e.target.value }); }}
                placeholder="Ex: Inglês do Zero ao Intermediário"
                maxLength={120}
              />
            </label>

            <label className="field">
              <span className="field__label">Subtítulo</span>
              <input
                className="field__input"
                value={form.subtitle}
                onChange={(e) => { setSaveMessage(null); setForm({ ...form, subtitle: e.target.value }); }}
                placeholder="Uma frase curta sobre o curso"
                maxLength={160}
              />
            </label>

            <label className="field">
              <span className="field__label">Descrição *</span>
              <textarea
                className="field__input field__input--textarea"
                value={form.description}
                onChange={(e) => { setSaveMessage(null); setForm({ ...form, description: e.target.value }); }}
                placeholder="Descreva o curso, público e o que será aprendido"
                rows={5}
              />
              <span className="field__hint">{form.description.length} caracteres (mín. 20)</span>
            </label>

            <section className="admin-editor__cover" aria-labelledby="course-cover-title">
              <div className="admin-editor__cover-preview">
                <img
                  src={form.thumbnail?.url?.trim() || DEFAULT_COURSE_COVER_URL}
                  alt={form.thumbnail?.alt || form.title || "Capa do curso"}
                  loading="lazy"
                  onError={(event) => { if (!event.currentTarget.src.endsWith(DEFAULT_COURSE_COVER_URL)) event.currentTarget.src = DEFAULT_COURSE_COVER_URL; }}
                />
              </div>
              <div className="admin-editor__cover-controls">
                <h2 id="course-cover-title" className="admin-editor__panel-title">Capa do curso</h2>
                <p className="text-secondary">Envie uma imagem ou informe o endereço de uma capa existente.</p>
                <label className="field">
                  <span className="field__label">Enviar imagem (PNG, JPEG ou WebP · até 5 MB)</span>
                  <input className="field__input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverUpload} disabled={coverUploading} />
                </label>
                <label className="field">
                  <span className="field__label">URL da imagem</span>
                  <input
                    className="field__input"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    value={coverUrlDraft}
                    placeholder="https://exemplo.com/capa.webp ou /uploads/..."
                    onChange={(event) => {
                      setCoverError(null);
                      setCoverUrlDraft(event.target.value);
                    }}
                    onBlur={handleCoverUrlBlur}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Texto alternativo da imagem</span>
                  <input
                    className="field__input"
                    value={form.thumbnail?.alt ?? ""}
                    maxLength={180}
                    placeholder="Descreva a capa para leitores de tela"
                    onChange={(event) => {
                      const current = form.thumbnail ?? { id: "course-cover", type: "image" as const, url: "/course-cover-placeholder.svg", alt: "" };
                      setForm({ ...form, thumbnail: { ...current, alt: event.target.value } });
                    }}
                  />
                </label>
                {coverUploading && <p role="status" className="field__hint">Enviando capa…</p>}
                {coverError && <p role="alert" className="field__hint admin-editor__cover-error">{coverError}</p>}
              </div>
            </section>

            <div className="field-row">
              <label className="field">
                <span className="field__label">Categoria</span>
                <select className="field__input" value={form.category} onChange={(e) => { setSaveMessage(null); setForm({ ...form, category: e.target.value }); }}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">Nível</span>
                <select
                  className="field__input"
                  value={form.level}
                  onChange={(e) => { setSaveMessage(null); setForm({ ...form, level: e.target.value as CourseCreateInput["level"] }); }}
                >
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </label>

              <label className="field">
                <span className="field__label">Idioma</span>
                <select className="field__input" value={form.language} onChange={(e) => { setSaveMessage(null); setForm({ ...form, language: e.target.value }); }}>
                  <option value="pt-BR">pt-BR</option>
                  <option value="en">en</option>
                  <option value="es">es</option>
                </select>
              </label>
            </div>

            <div className="admin-editor__panel">
              <h2 className="admin-editor__panel-title">Estrutura educacional</h2>
              <p className="text-secondary" style={{ margin: 0 }}>
                Curso → Módulo → Aula → Blocos. As alterações na estrutura são salvas junto com os metadados do curso.
              </p>
              {isEditing && existing ? (
                <CourseStructureEditor
                  courseId={existing.id}
                  actorId={existing.authorId || "local-user"}
                  courseSlug={courseSlug ?? existing.slug}
                  courseForm={form}
                  modules={modules}
                  onChange={(nextModules) => { setModules(nextModules); setSaveMessage(null); }}
                />
              ) : (
                <div className="admin-editor__placeholder">
                  <span>Salve o rascunho do curso primeiro para começar a organizar seus módulos e aulas.</span>
                </div>
              )}
            </div>
          </div>

          <aside className="admin-editor__aside">
            <div className="admin-editor__card">
              <h3 className="admin-editor__card-title">Configurações</h3>
              <label className="field field--check">
                <input type="checkbox" checked={form.allowComments} onChange={(e) => { setSaveMessage(null); setForm({ ...form, allowComments: e.target.checked }); }} />
                <span>Permitir comentários</span>
              </label>
              <label className="field field--check">
                <input type="checkbox" checked={form.allowFork} onChange={(e) => { setSaveMessage(null); setForm({ ...form, allowFork: e.target.checked }); }} />
                <span>Permitir fork / remix</span>
              </label>
            </div>

            <div className="admin-editor__card">
              <h3 className="admin-editor__card-title">Próximos passos</h3>
              <ol className="admin-editor__steps">
                <li>Criar rascunho do curso</li>
                <li>Adicionar módulos e aulas no editor visual</li>
                <li>Publicar → entra no catálogo público (versionado)</li>
              </ol>
              <p className="text-secondary" style={{ fontSize: "var(--text-xs)", margin: "var(--space-3) 0 0" }}>
                Rascunhos ficam vinculados à sua conta (banco). Publicados ficam em /courses e /app.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}

export default AdminCourseEditor;
