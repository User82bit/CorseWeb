import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getAllCourses, subscribeCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AppCoursesPage.scss";

// Esta rota não é mais usada no App.tsx (/app/courses usa AppMyCourses),
// mas mantida sem mocks para não deixar lixo no projeto.
function AppCoursesPage() {
  const [courses, setCourses] = useState<Course[]>(() => getAllCourses());
  useEffect(() => subscribeCourses(() => setCourses(getAllCourses())), []);

  return (
    <>
      <PageHero
        eyebrow="Área do aluno"
        title="Meus cursos"
        description="Todos os cursos disponíveis para você. Sem mocks — o que você cria aparece aqui."
        actions={[
          { label: "Criar curso", to: "/app/courses/new", variant: "primary" },
          { label: "Catálogo público", to: "/courses", variant: "glass" },
        ]}
        size="sm"
      />
      <div className="app-courses-page">
        {courses.length === 0 ? (
          <div className="empty-state">
            <h2>Nenhum curso ainda</h2>
            <p>Crie seu primeiro curso — ele ficará salvo neste navegador até o backend existir.</p>
            <Link to="/app/courses/new" className="button button--primary">
              Criar curso
            </Link>
          </div>
        ) : (
          <div className="app-courses-page__grid">
            {courses.map((c) => (
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
        )}
      </div>
    </>
  );
}

export default AppCoursesPage;
