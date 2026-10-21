import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import PageHero from "../../components/PageHero/PageHero";
import CardCourseBase from "../../UIComplement/CardCourseBase/CardCourseBase";
import { getPublishedCourses, subscribeCourses, refreshCourses } from "../../store/courseStore";
import type { Course } from "../../types/course";
import "./CoursesPage.scss";

function CoursesPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(() => getPublishedCourses());

  useEffect(() => { refreshCourses().catch(() => {}); return subscribeCourses(() => setCourses(getPublishedCourses())); }, []);

  return (
    <>
      <PageHero
        eyebrow="Catálogo aberto"
        title={t.home.discoverCourses || "Descubra cursos gratuitos"}
        description="Explore o acervo publicado pela comunidade. Todo curso publicado é aberto, gratuito e pode ser remixado — do zero ao avançado."
        actions={[
          { label: "Criar curso", to: "/admin/courses/new", variant: "primary" },
          { label: "Como funciona", href: "/#sobre", variant: "glass" },
        ]}
      />

      <div className="courses-page">
        {courses.length === 0 ? (
          <div className="courses-page__empty">
            <div className="courses-page__empty-card">
              <h2 className="heading-lg">Nenhum curso publicado ainda</h2>
              <p className="text-secondary">
                O catálogo começa vazio — é assim que deve ser. Cursos são criados como rascunhos vinculados à sua conta e aparecem aqui após publicar.
              </p>
              <div className="courses-page__empty-actions">
                <Link to="/login" className="button button--primary">
                  Entrar e criar
                </Link>
                <Link to="/#sobre" className="button button--glass">
                  Entender o fluxo
                </Link>
              </div>
              <p className="courses-page__empty-hint">
                Catálogo público = cursos com status publicado no banco.
              </p>
            </div>
          </div>
        ) : (
          <div className="courses-page__grid">
            {courses.map((course) => (
              <CardCourseBase
                key={course.id}
                children={
                  <article className="card">
                    <div className="card__banner">
                      <img src={course.thumbnail.url} alt={course.thumbnail.alt ?? course.title} loading="lazy" />
                      {course.isFeatured && <span className="card__badge card__badge--featured">Destaque</span>}
                    </div>
                    <div className="card__content">
                      <div className="card__tags">
                        <span className="card__tag">{course.category}</span>
                        <span className="card__tag card__tag--level">{course.level}</span>
                      </div>
                      <h2 className="card__title">{course.title}</h2>
                      <p className="card__description">{course.shortDescription ?? course.description}</p>
                      <div className="card__meta">
                        <span className="card__meta-item">{course.totalLessons} aulas</span>
                        <span className="card__meta-item">{Math.round(course.totalMinutes / 60)}h</span>
                      </div>
                      <Link to={`/courses/${course.slug}`} className="card__button card__button--primary">
                        {t.common.seeMore}
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

export default CoursesPage;
