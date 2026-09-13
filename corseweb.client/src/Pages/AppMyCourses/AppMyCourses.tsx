import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getAllCourses, subscribeCourses, refreshCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AppMyCourses.scss";

function AppMyCourses() {
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  const [filter, setFilter] = useState<"all" | "rascunho" | "publicado">("all");
  useEffect(() => { refreshCourses().catch(() => {}); return subscribeCourses(() => setCourses(getAllCourses())); }, []);

  const filtered = courses.filter((c) => (filter === "all" ? true : c.status === filter));

  return (
    <>
      <PageHero
        eyebrow="Meus cursos"
        title="Sua coleção"
        description="Seus rascunhos ficam vinculados à sua conta (banco). Publicados aparecem no catálogo público."
        actions={[
          { label: "Criar curso", to: "/admin/courses/new", variant: "primary" },
          { label: "Explorar catálogo", to: "/courses", variant: "glass" },
        ]}
        size="sm"
      />

      <div className="app-mycourses">
        <div className="courses-filters-bar">
          <div className="filters-tabs" role="tablist" aria-label="Filtrar por status">
            {(["all", "rascunho", "publicado"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={filter === v}
                className={`filter-tab ${filter === v ? "filter-tab--active" : ""}`}
                onClick={() => setFilter(v)}
              >
                {v === "all" ? `Todos (${courses.length})` : v === "rascunho" ? `Rascunhos (${courses.filter((c) => c.status === "rascunho").length})` : `Publicados (${courses.filter((c) => c.status === "publicado").length})`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <h2>{courses.length === 0 ? "Nenhum curso ainda" : "Nenhum curso neste filtro"}</h2>
            <p>{courses.length === 0 ? "Crie seu primeiro curso — rascunho vinculado à sua conta; ao publicar entra no catálogo." : "Tente outro filtro ou crie um novo curso."}</p>
            <Link to="/admin/courses/new" className="button button--primary">
              Criar curso
            </Link>
          </div>
        ) : (
          <div className="courses-list-grid">
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
                      </div>
                      <div className="card__actions">
                        <Link to={`/app/courses/${course.slug}`} className="card__button card__button--primary">
                          Abrir
                        </Link>
                        <Link to={`/courses/${course.slug}`} className="card__button">
                          Ver no catálogo
                        </Link>
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

export default AppMyCourses;
