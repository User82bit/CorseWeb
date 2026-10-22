import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { formatEstimatedDuration } from "../../utils/formatEstimatedDuration";
import PageHero from "../../components/PageHero/PageHero";
import { getCourseBySlugStore, getAllCourses, subscribeCourses, refreshCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./CourseDetailPage.scss";

function CourseDetailPage() {
  const { locale } = useTranslation();
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const [course, setCourse] = useState<Course | undefined>(() => (courseSlug ? getCourseBySlugStore(courseSlug) : undefined));

  useEffect(() => {
    refreshCourses().catch(() => {});
  }, []);
  useEffect(() => {
    if (!courseSlug) return;
    const sync = () => setCourse(getCourseBySlugStore(courseSlug));
    sync();
    return subscribeCourses(sync);
  }, [courseSlug]);

  if (!course) {
    const hasAny = getAllCourses().length > 0;
    return (
      <>
        <PageHero
          eyebrow="Curso não encontrado"
          title={courseSlug ?? "Curso"}
          description={hasAny ? "Este curso não existe ou foi removido." : "Ainda não há cursos publicados. Crie o primeiro."}
          actions={
            hasAny
              ? [
                  { label: "Voltar ao catálogo", to: "/courses", variant: "primary" },
                  { label: "Criar curso", to: "/admin/courses/new", variant: "glass" },
                ]
              : [{ label: "Criar meu primeiro curso", to: "/admin/courses/new", variant: "primary" }]
          }
        />
        <div className="course-detail-page__empty">
          <Link to="/courses" className="button button--glass">
            ← Voltar ao catálogo
          </Link>
        </div>
      </>
    );
  }

  const isDraft = (course as unknown as { isDraft?: boolean }).isDraft;

  return (
    <>
      <PageHero
        eyebrow={`${course.category} · ${course.level}${isDraft ? " · rascunho (só você vê)" : ""}`}
        title={course.title}
        description={course.description}
        meta={`${course.totalLessons} aulas · ${formatEstimatedDuration(course.totalMinutes, locale)} · por ${course.authorName}`}
        actions={[
          ...(isDraft ? [] : [{ label: "Começar agora", to: `/app/courses/${course.slug}`, variant: "primary" as const }]),
          { label: "Voltar ao catálogo", to: "/courses", variant: "glass" as const },
        ]}
      />

      <main className="course-detail-page__main">
        <section className="course-detail-page__info">
          <div className="course-detail-page__card">
            <h2 className="heading-lg">Sobre este curso</h2>
            <p className="text-secondary">{course.description}</p>
            {course.subtitle && <p className="text-secondary">{course.subtitle}</p>}
            <dl className="course-detail-page__facts">
              <div><dt>Categoria</dt><dd>{course.category}</dd></div>
              <div><dt>Nível</dt><dd>{course.level}</dd></div>
              <div><dt>Idioma</dt><dd>{course.language}</dd></div>
              <div><dt>Status</dt><dd>{course.status}</dd></div>
            </dl>
          </div>

          <div className="course-detail-page__card">
            <h3 className="heading-md">Conteúdo</h3>
            {course.modules.length === 0 ? (
              <p className="text-secondary">Este curso ainda não tem módulos. O autor está montando o conteúdo.</p>
            ) : (
              <ol className="course-detail-page__modules">
                {course.modules.map((m) => (
                  <li key={m.id} className="course-detail-page__module">
                    <strong>{m.title}</strong>
                    <span className="text-secondary">{m.lessons.length} aulas · {m.totalMinutes} min</span>
                  </li>
                ))}
              </ol>
            )}
            <Link to={`/app/courses/${course.slug}`} className="button button--primary">
              Ir para área do aluno
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

export default CourseDetailPage;
