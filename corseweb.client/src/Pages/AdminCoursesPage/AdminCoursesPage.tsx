import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getAllCourses, subscribeCourses, togglePublish, deleteCourse, refreshCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import "./AdminCoursesPage.scss";

function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  const [filter, setFilter] = useState<"all" | "rascunho" | "publicado" | "arquivado">("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { refreshCourses().catch(() => {}); }, []);
  useEffect(() => subscribeCourses(() => setCourses(getAllCourses())), []);

  const filtered = courses.filter((c) => {
    const byStatus = filter === "all" ? true : c.status === filter;
    const bySearch =
      !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return byStatus && bySearch;
  });

  const handleTogglePublish = async (slug: string) => {
    setBusy(slug); setErr(null);
    try { await togglePublish(slug); } catch (e: unknown) {
      setErr((e as { body?: { error?: string } })?.body?.error ?? (e as Error).message ?? "Falha");
    } finally { setBusy(null); }
  };
  const handleDelete = async (slug: string) => {
    if (!confirm("Excluir curso/rascunho?")) return;
    setBusy(slug); setErr(null);
    try { await deleteCourse(slug); } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? "Falha ao excluir");
    } finally { setBusy(null); }
  };

  return (
    <>
      <PageHero
        eyebrow="Catálogo"
        title="Gerenciar cursos"
        description="Crie, edite e publique cursos. Qualquer usuário logado pode criar; a publicação acontece via drafts → publish no servidor."
        actions={[
          { label: "Novo curso", to: "/admin/courses/new", variant: "primary" },
          { label: "Ver catálogo público", to: "/courses", variant: "glass" },
        ]}
        meta={`${courses.length} curso(s) · ${courses.filter((c) => c.status === "publicado").length} publicado(s)`}
        size="sm"
      />

      <div className="admin-courses-page">
        <div className="admin-courses-page__filters">
          <div className="admin-courses-page__search">
            <SvgIcon name="search" size="20px" />
            <input
              type="search"
              placeholder="Buscar cursos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-courses-page__search-input"
              aria-label="Buscar cursos"
            />
          </div>
          <div className="admin-courses-page__filter-tabs" role="tablist" aria-label="Filtrar por status">
            {([
              { value: "all", label: `Todos (${courses.length})` },
              { value: "rascunho", label: `Rascunhos (${courses.filter((c) => c.status === "rascunho").length})` },
              { value: "publicado", label: `Publicados (${courses.filter((c) => c.status === "publicado").length})` },
              { value: "arquivado", label: `Arquivados (${courses.filter((c) => c.status === "arquivado").length})` },
            ] as const).map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={filter === tab.value}
                className={`admin-courses-page__filter-tab ${filter === tab.value ? "active" : ""}`}
                onClick={() => setFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {err && <p role="alert" style={{ color: "crimson" }}>{err}</p>}

        {filtered.length === 0 ? (
          <div className="admin-courses-page__empty">
            <h2 className="heading-lg">{courses.length === 0 ? "Nenhum curso ainda" : "Nenhum curso neste filtro"}</h2>
            <p className="text-secondary">
              {courses.length === 0
                ? "O catálogo começa vazio de propósito. Crie o primeiro curso — ele aparecerá em /courses, /app e aqui."
                : "Tente outro filtro ou crie um novo curso."}
            </p>
            <Link to="/admin/courses/new" className="button button--primary">
              Criar curso
            </Link>
            <p className="admin-courses-page__empty-hint">Rascunhos vinculados à sua conta (banco). Publicados no catálogo público.</p>
          </div>
        ) : (
          <div className="admin-courses-page__grid">
            {filtered.map((course) => (
              <CardCourseBase
                key={course.id}
                children={
                  <article className="card">
                    <div className="card__banner">
                      <img src={course.thumbnail.url} alt={course.thumbnail.alt ?? course.title} loading="lazy" />
                      <span className={`card__badge ${course.status === "publicado" ? "card__badge--featured" : ""}`}>{course.status}</span>
                    </div>
                    <div className="card__content">
                      <div className="card__tags">
                        <span className="card__tag">{course.category}</span>
                        <span className="card__tag card__tag--level">{course.level}</span>
                      </div>
                      <h3 className="card__title">{course.title}</h3>
                      <p className="card__description">{course.shortDescription ?? course.description}</p>
                      <div className="card__meta">
                        <span className="card__meta-item">{course.totalLessons} aulas</span>
                        <span className="card__meta-item">{Math.round(course.totalMinutes / 60)}h</span>
                        <span className="card__meta-item">por {course.authorName}</span>
                      </div>
                      <div className="card__actions">
                        <Link to={`/admin/courses/${course.slug}/editor`} className="card__button card__button--primary">
                          Editar
                        </Link>
                        <Link to={`/courses/${course.slug}`} className="card__button">
                          Ver
                        </Link>
                        <button
                          type="button"
                          className="card__button"
                          disabled={busy === course.slug}
                          onClick={() => handleTogglePublish(course.slug)}
                        >
                          {course.status === "publicado" ? "Despublicar" : "Publicar"}
                        </button>
                        <button type="button" className="card__button card__button--danger" disabled={busy === course.slug} onClick={() => handleDelete(course.slug)}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default AdminCoursesPage;
