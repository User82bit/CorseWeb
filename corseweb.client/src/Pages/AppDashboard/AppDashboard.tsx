import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getAllCourses, subscribeCourses, refreshCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AppDashboard.scss";

function AppDashboard() {
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  useEffect(() => { refreshCourses().catch(() => {}); return subscribeCourses(() => setCourses(getAllCourses())); }, []);

  const featured = courses.filter((c) => c.isFeatured).slice(0, 4);
  const recent = [...courses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6);

  return (
    <>
      <PageHero
        eyebrow="Área do aluno"
        title="Continue de onde parou"
        description="Seus cursos, seu ritmo. Rascunhos ficam vinculados à sua conta; publicados aparecem no catálogo público."
        actions={[
          { label: "Criar curso", to: "/admin/courses/new", variant: "primary" },
          { label: "Explorar catálogo", to: "/courses", variant: "glass" },
        ]}
        meta={courses.length === 0 ? "Nenhum curso ainda — que tal começar o primeiro?" : `${courses.length} curso(s) · ${courses.filter(c=>c.status==="rascunho").length} rascunho(s)`}
        size="sm"
      />

      <div className="app-dashboard">
        {courses.length === 0 ? (
          <div className="app-dashboard__empty">
            <h2 className="heading-lg">Sua estante está vazia</h2>
            <p className="text-secondary">
              Ainda não há cursos. Crie um — rascunhos ficam na sua conta; ao publicar entram no catálogo.
            </p>
            <div className="app-dashboard__empty-actions">
              <Link to="/admin/courses/new" className="button button--primary">
                Criar meu primeiro curso
              </Link>
              <Link to="/courses" className="button button--glass">
                Ver catálogo
              </Link>
            </div>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="app-dashboard__section">
                <header className="app-dashboard__section-header">
                  <h2 className="heading-lg">Em destaque</h2>
                  <Link to="/app/courses" className="app-dashboard__see-all">
                    Ver todos →
                  </Link>
                </header>
                <div className="app-dashboard__grid">
                  {featured.map((c) => (
                    <CardCourseBase
                      key={c.id}
                      children={
                        <article className="card">
                          <div className="card__banner">
                            <img src={c.thumbnail.url} alt={c.thumbnail.alt ?? c.title} loading="lazy" />
                          </div>
                          <div className="card__content">
                            <div className="card__tags">
                              <span className="card__tag">{c.category}</span>
                              <span className="card__tag card__tag--level">{c.level}</span>
                            </div>
                            <h3 className="card__title">{c.title}</h3>
                            <p className="card__description">{c.shortDescription ?? c.description}</p>
                            <Link to={`/app/courses/${c.slug}`} className="card__button card__button--primary">
                              Abrir
                            </Link>
                          </div>
                        </article>
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="app-dashboard__section">
              <header className="app-dashboard__section-header">
                <h2 className="heading-lg">Recentes</h2>
                <Link to="/app/courses" className="app-dashboard__see-all">
                  Meus cursos →
                </Link>
              </header>
              <div className="app-dashboard__grid">
                {recent.map((c) => (
                  <CardCourseBase
                    key={c.id}
                    children={
                      <article className="card">
                        <div className="card__banner">
                          <img src={c.thumbnail.url} alt={c.thumbnail.alt ?? c.title} loading="lazy" />
                          {c.status === "rascunho" && <span className="card__badge">rascunho</span>}
                        </div>
                        <div className="card__content">
                          <h3 className="card__title">{c.title}</h3>
                          <p className="card__description">{c.shortDescription ?? c.description}</p>
                          <div className="card__meta">
                            <span className="card__meta-item">{c.category}</span>
                            <span className="card__meta-item">{c.level}</span>
                          </div>
                          <Link to={`/app/courses/${c.slug}`} className="card__button card__button--primary">
                            Continuar
                          </Link>
                        </div>
                      </article>
                    }
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default AppDashboard;
