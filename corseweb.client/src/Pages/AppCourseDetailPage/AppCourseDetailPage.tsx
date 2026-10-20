import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import { getCourseBySlugStore, subscribeCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./AppCourseDetailPage.scss";

function AppCourseDetailPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const [course, setCourse] = useState<Course | undefined>(() => (courseSlug ? getCourseBySlugStore(courseSlug) : undefined));
  useEffect(() => {
    if (!courseSlug) return;
    const sync = () => setCourse(getCourseBySlugStore(courseSlug));
    sync();
    return subscribeCourses(sync);
  }, [courseSlug]);

  if (!course) {
    return (
      <>
        <PageHero
          eyebrow="Curso não encontrado"
          title={courseSlug ?? "Curso"}
          description="Este curso não existe ou foi removido."
          actions={[
            { label: "Voltar aos meus cursos", to: "/app/courses", variant: "primary" },
            { label: "Catálogo", to: "/courses", variant: "glass" },
          ]}
          size="sm"
        />
        <div className="app-course-detail-page__empty">
          <Link to="/app/courses" className="button button--glass">
            ← Meus cursos
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow={`${course.category} · ${course.level} · ${course.status}`}
        title={course.title}
        description={course.description}
        meta={`${course.totalLessons} aulas · ${Math.round(course.totalMinutes / 60)}h`}
        actions={[
          ...(course.modules[0]?.lessons[0]
            ? [{ label: "Continuar", to: `/app/courses/${course.slug}/lessons/${course.modules[0].lessons[0].slug}`, variant: "primary" as const }]
            : []),
          { label: "Editar curso", to: `/admin/courses/${course.slug}/editor`, variant: "glass" },
        ]}
        size="sm"
      />

      <div className="app-course-detail-page">
        <section className="app-course-detail-page__content">
          <h2 className="heading-lg">Módulos</h2>
          {course.modules.length === 0 ? (
            <p className="text-secondary">Este curso ainda não tem módulos. Adicione conteúdo pelo editor.</p>
          ) : (
            <ol className="app-course-detail-page__modules">
              {course.modules.map((m) => (
                <li key={m.id} className="app-course-detail-page__module">
                  <header className="app-course-detail-page__module-head">
                    <h3 className="heading-md">{m.title}</h3>
                    <span className="text-secondary">
                      {m.lessons.length} aulas · {m.totalMinutes} min
                    </span>
                  </header>
                  <ul className="app-course-detail-page__lessons">
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <Link to={`/app/courses/${course.slug}/lessons/${l.slug}`} className="app-course-detail-page__lesson">
                          <span>{l.title}</span>
                          <span className="text-secondary">{l.estimatedMinutes} min</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

export default AppCourseDetailPage;
