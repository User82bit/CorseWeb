import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import { getCourseBySlugStore, subscribeCourses } from "../../store/courseStore";
import type { Lesson } from "../../types/course";
import "./AppLessonPage.scss";

function AppLessonPage() {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const course = courseSlug ? getCourseBySlugStore(courseSlug) : undefined;
  const allLessons: Lesson[] = course ? course.modules.flatMap((m) => m.lessons) : [];
  const lesson = allLessons.find((l) => l.slug === lessonSlug);
  const [, setTick] = useState(0);
  useEffect(() => subscribeCourses(() => setTick((x) => x + 1)), []);

  if (!course || !lesson) {
    return (
      <>
        <PageHero
          eyebrow="Aula"
          title={lessonSlug ?? "Aula não encontrada"}
          description={course ? `Curso: ${course.title}. Esta aula não existe.` : "Curso não encontrado."}
          actions={[
            { label: "Voltar ao curso", to: course ? `/app/courses/${course.slug}` : "/app/courses", variant: "primary" },
            { label: "Catálogo", to: "/courses", variant: "glass" },
          ]}
          size="sm"
        />
        <div className="app-lesson-page__empty">
          <p className="text-secondary">Conteúdo ainda vazio — cursos sem mocks começam sem módulos/aulas. Adicione pelo editor.</p>
          <Link to={course ? `/admin/courses/${course.slug}/editor` : "/admin/courses/new"} className="button button--primary">
            Abrir editor
          </Link>
        </div>
      </>
    );
  }

  const idx = allLessons.findIndex((l) => l.slug === lessonSlug);
  const prev = idx > 0 ? allLessons[idx - 1] : null;
  const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  const mod = course.modules.find((m) => m.lessons.some((l) => l.slug === lessonSlug));

  return (
    <div className="app-lesson-page">
      <header className="app-lesson-page__header">
        <div className="app-lesson-page__breadcrumb">
          <Link to={`/app/courses/${course.slug}`} className="app-lesson-page__breadcrumb-link">
            {mod?.title ?? course.title}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="app-lesson-page__breadcrumb-current">{lesson.title}</span>
        </div>
        <div className="app-lesson-page__progress">
          <div className="app-lesson-page__progress-bar">
            <div className="app-lesson-page__progress-fill" style={{ width: `${((idx + 1) / Math.max(1, allLessons.length)) * 100}%` }} />
          </div>
          <span className="app-lesson-page__progress-text">
            Aula {idx + 1} de {allLessons.length}
          </span>
        </div>
      </header>

      <main className="app-lesson-page__main">
        <article className="app-lesson-page__content">
          <header className="app-lesson-page__lesson-header">
            <h1 className="heading-xl">{lesson.title}</h1>
            <div className="app-lesson-page__lesson-meta">
              <span>{lesson.estimatedMinutes} min</span>
              <span>{mod?.title}</span>
            </div>
            {lesson.description && <p className="text-secondary">{lesson.description}</p>}
          </header>

          <div className="app-lesson-page__lesson-body">
            {lesson.blocks.length === 0 ? (
              <div className="app-lesson-page__empty-block">
                <p className="text-secondary">Esta aula ainda não tem conteúdo. Edite o curso para adicionar blocos.</p>
                <Link to={`/admin/courses/${course.slug}/editor`} className="button button--glass">
                  Editar curso
                </Link>
              </div>
            ) : (
              lesson.blocks
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((block) => (
                  <div key={block.id} className="app-lesson-page__block">
                    {block.components
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((comp) => {
                        const p = comp.props as Record<string, unknown>;
                        switch (comp.type) {
                          case "paragrafo":
                            return <p key={comp.id} className="app-lesson-page__text">{String(p.content ?? "")}</p>;
                          case "titulo": {
                            const level = (p.level as number) ?? 2;
                            const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
                            return <Tag key={comp.id} className="heading-lg">{String(p.content ?? "")}</Tag>;
                          }
                          case "lista": {
                            const items = (p.items as string[]) ?? [];
                            const ordered = p.ordered as boolean;
                            const ListTag = ordered ? "ol" : "ul";
                            return (
                              <ListTag key={comp.id} className="app-lesson-page__list">
                                {items.map((it, i) => (
                                  <li key={i}>{it}</li>
                                ))}
                              </ListTag>
                            );
                          }
                          case "bloco-codigo":
                            return (
                              <pre key={comp.id} className="app-lesson-page__code">
                                <code>{String(p.code ?? "")}</code>
                              </pre>
                            );
                          default:
                            if (String(comp.type).startsWith("callout")) {
                              return (
                                <div key={comp.id} className={`app-lesson-page__callout app-lesson-page__callout--${String(comp.type).replace("callout-", "")}`}>
                                  {p.title ? <strong>{String(p.title)}</strong> : null}
                                  <p>{String(p.content ?? "")}</p>
                                </div>
                              );
                            }
                            if (String(comp.type).startsWith("quiz")) {
                              return (
                                <div key={comp.id} className="app-lesson-page__quiz">
                                  <p className="app-lesson-page__quiz-q">{String(p.question ?? "")}</p>
                                  <p className="text-secondary">Quiz interativo — renderização completa entra com o editor visual.</p>
                                </div>
                              );
                            }
                            return (
                              <div key={comp.id} className="app-lesson-page__unknown">
                                <span className="text-secondary">Bloco {comp.type} — prévia simplificada</span>
                              </div>
                            );
                        }
                      })}
                  </div>
                ))
            )}
          </div>

          <nav className="app-lesson-page__nav" aria-label="Navegação de aulas">
            {prev ? (
              <Link to={`/app/courses/${course.slug}/lessons/${prev.slug}`} className="button button--glass">
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <button type="button" className="button button--primary" onClick={() => navigate(`/app/courses/${course.slug}/lessons/${next.slug}`)}>
                Próxima: {next.title} →
              </button>
            ) : (
              <Link to={`/app/courses/${course.slug}`} className="button button--primary">
                Voltar ao curso
              </Link>
            )}
          </nav>
        </article>
      </main>
    </div>
  );
}

export default AppLessonPage;
