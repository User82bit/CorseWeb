import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CourseCreateInput, Media } from "../../types/course";
import { apiFetch } from "../../lib/api";
import { createCourse } from "../../store/courseStore";
import { DEFAULT_COURSE_COVER_URL, resolveCourseCoverUrl } from "../../utils/courseCoverUrl";
import "./AdminCourseEditor.scss";

function AdminCourseEditor() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CourseCreateInput>(() => ({
    title: "",
    subtitle: "",
    description: "",
    thumbnail: {
      id: "course-cover",
      type: "image",
      url: DEFAULT_COURSE_COVER_URL,
      alt: "Capa do curso",
    },
    // Metadados iniciais internos; a autoria do conteúdo começa diretamente no canvas.
    category: "Geral",
    tags: [],
    level: "Iniciante",
    language: "pt-BR",
    allowComments: true,
    allowFork: true,
  }));
  const [coverUrlDraft, setCoverUrlDraft] = useState(DEFAULT_COURSE_COVER_URL);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = form.title.trim().length >= 3 && form.description.trim().length >= 20 && !saving;

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

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
      const thumbnail = { ...uploaded, alt: form.title.trim() || "Capa do curso" };
      setCoverUrlDraft(thumbnail.url);
      setForm((current) => ({ ...current, thumbnail }));
    } catch (caught) {
      setCoverError(caught instanceof Error ? caught.message : "Não foi possível enviar a capa.");
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
        alt: current.thumbnail?.alt?.trim() || current.title.trim() || "Capa do curso",
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;

    const coverUrl = resolveCourseCoverUrl(coverUrlDraft);
    if (!coverUrl) {
      setCoverError("Use uma URL HTTP(S) válida ou um caminho local iniciado por /.");
      return;
    }

    const payload: CourseCreateInput = {
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || undefined,
      description: form.description.trim(),
      thumbnail: {
        ...(form.thumbnail ?? { id: "course-cover", type: "image" as const, alt: form.title }),
        url: coverUrl,
        alt: form.thumbnail?.alt?.trim() || form.title.trim() || "Capa do curso",
      },
      // Campos mantidos no contrato da API, mas não expostos no formulário inicial.
      category: "Geral",
      tags: [],
      level: "Iniciante",
      language: "pt-BR",
    };

    setSaving(true);
    setError(null);
    setCoverError(null);
    try {
      const created = await createCourse(payload);
      // Ao salvar o rascunho, o próximo destino já é o editor visual do curso.
      navigate(`/admin/courses/${created.slug}/editor`, { replace: true });
    } catch (caught) {
      setError((caught as { body?: { error?: string }; message?: string })?.body?.error
        ?? (caught as { message?: string })?.message
        ?? "Não foi possível criar o rascunho.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-editor">
      <header className="admin-editor__header">
        <div>
          <p className="admin-editor__eyebrow">Autoria</p>
          <h1 className="display-lg">Novo curso</h1>
          <p className="admin-editor__subtitle">
            Defina o nome e as informações básicas. Ao criar o rascunho, você irá direto para o canvas visual para montar as aulas com cards arrastáveis.
          </p>
        </div>
        <div className="admin-editor__header-actions">
          <Link to="/admin/courses" className="button button--secondary">Cancelar</Link>
          <button type="submit" form="course-form" className="button button--primary" disabled={!canCreate || coverUploading}>
            {saving ? "Criando rascunho…" : "Criar rascunho e abrir editor"}
          </button>
        </div>
      </header>

      {error && <p role="alert" style={{ color: "crimson", margin: "12px 0" }}>{error}</p>}

      <form id="course-form" className="admin-editor__form" onSubmit={handleSubmit}>
        <div className="admin-editor__grid">
          <div className="admin-editor__main">
            <label className="field">
              <span className="field__label">Título *</span>
              <input
                className="field__input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex.: Inglês do Zero ao Intermediário"
                maxLength={120}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Subtítulo</span>
              <input
                className="field__input"
                value={form.subtitle ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Uma frase curta sobre o curso"
                maxLength={160}
              />
            </label>

            <label className="field">
              <span className="field__label">Descrição *</span>
              <textarea
                className="field__input field__input--textarea"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descreva o curso e o que será aprendido"
                rows={5}
                minLength={20}
                required
              />
              <span className="field__hint">{form.description.length} caracteres (mín. 20)</span>
            </label>

            <section className="admin-editor__cover" aria-labelledby="course-cover-title">
              <div className="admin-editor__cover-preview">
                <img
                  src={coverUrlDraft || DEFAULT_COURSE_COVER_URL}
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
                    onChange={(event) => { setCoverError(null); setCoverUrlDraft(event.target.value); }}
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
                      const current = form.thumbnail ?? { id: "course-cover", type: "image" as const, url: DEFAULT_COURSE_COVER_URL, alt: "" };
                      setForm((state) => ({ ...state, thumbnail: { ...current, alt: event.target.value } }));
                    }}
                  />
                </label>
                {coverUploading && <p role="status" className="field__hint">Enviando capa…</p>}
                {coverError && <p role="alert" className="field__hint admin-editor__cover-error">{coverError}</p>}
              </div>
            </section>
          </div>
        </div>
      </form>
    </section>
  );
}

export default AdminCourseEditor;
