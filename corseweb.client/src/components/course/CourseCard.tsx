import { Link } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import type { Course } from "../../types/course";
import { formatEstimatedDuration } from "../../utils/formatEstimatedDuration";
import "./CourseCard.scss";

export type CourseCardVariant = "default" | "continue" | "admin" | "compact";

interface Props {
  course: Course;
  variant?: CourseCardVariant;
  progress?: number; // 0-100, quando aplicável
  currentLessonLabel?: string;
  to: string;
  actionLabel?: string;
  footer?: React.ReactNode;
}

function CourseCard({ course, variant = "default", progress, currentLessonLabel, to, actionLabel, footer }: Props) {
  const { locale } = useTranslation();
  const levelClass =
    course.level === "Iniciante" ? "level--beginner" :
    course.level === "Intermediário" ? "level--intermediate" : "level--advanced";

  return (
    <article className={`course-card course-card--${variant}`}>
      <Link to={to} className="course-card__banner-link" aria-label={course.title}>
        <div className="course-card__banner">
          <img src={course.thumbnail?.url?.trim() || "/course-cover-placeholder.svg"} alt={course.thumbnail?.alt || course.title} loading="lazy" />
          {typeof progress === "number" && progress > 0 && progress < 100 && (
            <div className="course-card__progress-overlay" aria-hidden>
              <div className="course-card__progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
          {typeof progress === "number" && progress === 100 && (
            <span className="course-card__badge course-card__badge--done" aria-label="Concluído">✓</span>
          )}
        </div>
      </Link>

      <div className="course-card__content">
        <div className="course-card__tags">
          {course.tags.slice(0, 3).map((tag, i) => (
            <span key={tag.id} className={`course-card__tag ${i === 1 ? "course-card__tag--featured" : ""}`}>
              {tag.label}
            </span>
          ))}
          <span className={`course-card__level ${levelClass}`}>{course.level}</span>
        </div>

        <h3 className="course-card__title">
          <Link to={to}>{course.title}</Link>
        </h3>
        <p className="course-card__description">{course.shortDescription || course.description}</p>

        {currentLessonLabel && <p className="course-card__current-lesson">{currentLessonLabel}</p>}

        {typeof progress === "number" && (
          <div className="course-card__progress-mini" aria-label={`Progresso ${progress}%`}>
            <span>{progress}% concluído</span>
            <div className="course-card__progress-track-mini">
              <div className="course-card__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="course-card__meta">
          <span className="course-card__meta-item">{course.totalLessons} aulas</span>
          {course.totalMinutes > 0 && <span className="course-card__meta-item">{formatEstimatedDuration(course.totalMinutes, locale)}</span>}
          <span className="course-card__meta-item">{course.category}</span>
        </div>

        <Link to={to} className="button button--primary course-card__cta">
          {actionLabel ?? "Ver curso"}
        </Link>

        {footer}
      </div>
    </article>
  );
}

export default CourseCard;
