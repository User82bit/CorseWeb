import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getAllCourses, subscribeCourses, togglePublish, deleteCourse, refreshCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AdminDashboard.scss";

function AdminDashboard() {
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { refreshCourses().catch(() => {}); }, []);
  useEffect(() => subscribeCourses(() => setCourses(getAllCourses())), []);

  const drafts = courses.filter((c) => c.status === "rascunho");
  const published = courses.filter((c) => c.status === "publicado");
  const recent = [...courses].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6);

  const handleToggle = async (slug: string) => {
    setBusy(slug);
    try { await togglePublish(slug); } finally { setBusy(null); }
  };
  const handleDelete = async (slug: string) => {
    if (!confirm("Excluir?")) return;
    setBusy(slug);
    try { await deleteCourse(slug); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHero
        eyebrow="Administração"
        title="Painel administrativo"
        description="Visão com privilégios: editar qualquer curso, publicar rascunhos vinculados à sua conta e gerenciar o catálogo."
        actions={[
          { label: "Novo curso", to: "/admin/courses/new", variant: "primary" },
          { label: "Gerenciar cursos", to: "/admin/courses", variant: "glass" },
          { label: "Área do aluno", to: "/app", variant: "ghost" },
        ]}
        meta={`${courses.length} curso(s) · ${published.length} publicado(s) · ${drafts.length} rascunho(s)`}
        size="sm"
      />

      <div className="admin-dashboard">
        <section className="admin-dashboard__stats" aria-label="Resumo">
          <div className="admin-dashboard__stat-grid">
            <div className="admin-dashboard__stat">
              <span className="admin-dashboard__stat-value">{courses.length}</span>
              <span className="admin-dashboard__stat-label">Total</span>
            </div>
            <div className="admin-dashboard__stat">
              <span className="admin-dashboard__stat-value">{published.length}</span>
              <span className="admin-dashboard__stat-label">Publicados</span>
            </div>
            <div className="admin-dashboard__stat">
              <span className="admin-dashboard__stat-value">{drafts.length}</span>
              <span className="admin-dashboard__stat-label">Rascunhos</span>
            </div>
            <div className="admin-dashboard__stat">
              <span className="admin-dashboard__stat-value">{courses.filter((c) => c.isFeatured).length}</span>
              <span className="admin-dashboard__stat-label">Destaques</span>
            </div>
          </div>
        </section>

        <section className="admin-dashboard__section">
          <header className="admin-dashboard__section-header">
            <h2 className="heading-lg">Recentes</h2>
            <Link to="/admin/courses" className="admin-dashboard__see-all">
              Gerenciar todos →
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="admin-dashboard__empty">
              <p className="text-secondary">Nenhum curso ainda. Crie o primeiro — rascunhos ficam vinculados à sua conta.</p>
              <Link to="/admin/courses/new" className="button button--primary">
                Criar curso
              </Link>
            </div>
          ) : (
            <div className="admin-dashboard__grid">
              {recent.map((c) => (
                <CardCourseBase
                  key={c.id}
                  children={
                    <article className="card">
                      <div className="card__banner">
                        <img src={c.thumbnail.url} alt={c.thumbnail.alt ?? c.title} loading="lazy" />
                        <span className={`card__badge ${c.status === "publicado" ? "card__badge--featured" : ""}`}>{c.status}</span>
                      </div>
                      <div className="card__content">
                        <h3 className="card__title">{c.title}</h3>
                        <p className="card__description">{c.shortDescription ?? c.description}</p>
                        <div className="card__meta">
                          <span className="card__meta-item">{c.category}</span>
                          <span className="card__meta-item">{c.level}</span>
                        </div>
                        <div className="card__actions">
                          <Link to={`/admin/courses/${c.slug}/editor`} className="card__button card__button--primary">
                            Editar
                          </Link>
                          <Link to={`/courses/${c.slug}`} className="card__button">
                            Ver
                          </Link>
                          <button type="button" className="card__button" disabled={busy === c.slug} onClick={() => handleToggle(c.slug)}>
                            {c.status === "publicado" ? "Despublicar" : "Publicar"}
                          </button>
                          <button type="button" className="card__button card__button--danger" disabled={busy === c.slug} onClick={() => handleDelete(c.slug)}>
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
        </section>
      </div>
    </>
  );
}

export default AdminDashboard;
