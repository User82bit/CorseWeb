import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import { useTranslation } from "../../i18n/useTranslation";
import { getCourseBySlugStore, refreshCourses, subscribeCourses } from "../../store/courseStore";
import {
  enrollInCourse,
  getMyEnrollments,
  updateEnrollmentProgress,
  type CourseEnrollment,
  type EnrollmentModuleProgress,
} from "../../store/enrollmentStore";
import type { Component, Course, Lesson, Module } from "../../types/course";
import "./AppLessonPage.scss";

function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
}

function ContentComponent({ component }: { component: Component }) {
  const props = component.props as Record<string, unknown>;
  const safeText = (value: unknown) => String(value ?? "");
  const safeUrl = (value: unknown) => {
    const text = safeText(value).trim();
    if (!text) return "";
    try {
      const parsed = new URL(text, window.location.origin);
      return parsed.protocol === "https:" || parsed.origin === window.location.origin ? parsed.href : "";
    } catch {
      return "";
    }
  };

  switch (component.type) {
    case "paragrafo":
      return <p className="student-lesson__text">{safeText(props.content)}</p>;
    case "titulo": {
      const level = Number(props.level ?? 2);
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      return <Tag className="student-lesson__content-heading">{safeText(props.content)}</Tag>;
    }
    case "lista": {
      const items = Array.isArray(props.items) ? props.items.map(item => String(item)) : [];
      const ListTag = props.ordered ? "ol" : "ul";
      return <ListTag className="student-lesson__list">{items.map((item, index) => <li key={index}>{item}</li>)}</ListTag>;
    }
    case "bloco-codigo":
      return (
        <pre className="student-lesson__code">
          {props.language && <span className="student-lesson__code-language">{safeText(props.language)}</span>}
          <code>{safeText(props.code)}</code>
        </pre>
      );
    case "imagem": {
      const src = safeUrl(props.url ?? props.src);
      if (!src) return <p className="student-lesson__unsupported">{safeText(props.alt || props.caption || "")}</p>;
      return (
        <figure className="student-lesson__figure">
          <img src={src} alt={safeText(props.alt)} loading="lazy" decoding="async" />
          {props.caption && <figcaption>{safeText(props.caption)}</figcaption>}
        </figure>
      );
    }
    case "video": {
      const src = safeUrl(props.url ?? props.src);
      return src ? (
        <div className="student-lesson__video">
          <video controls preload="metadata" src={src}>
            <track kind="captions" />
          </video>
          {props.caption && <p>{safeText(props.caption)}</p>}
        </div>
      ) : <p className="student-lesson__unsupported">{safeText(props.caption || "")}</p>;
    }
    case "divisor":
      return <hr className={`student-lesson__divider student-lesson__divider--${safeText(props.style || "solid")}`} />;
    default:
      if (String(component.type).startsWith("callout")) {
        const variant = String(component.type).replace("callout-", "");
        return (
          <aside className={`student-lesson__callout student-lesson__callout--${variant}`}>
            {props.title && <strong>{safeText(props.title)}</strong>}
            <p>{safeText(props.content)}</p>
          </aside>
        );
      }
      if (String(component.type).startsWith("quiz")) {
        return (
          <section className="student-lesson__activity">
            <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />{safeText(component.type).includes("verdadeiro") ? "Verdadeiro ou falso" : "Atividade"}</span>
            <h3>{safeText(props.question)}</h3>
            <p>{safeText(props.instruction)}</p>
            <p className="student-lesson__activity-note">{"Esta atividade interativa ainda não está disponível."}</p>
          </section>
        );
      }
      if (String(component.type).startsWith("embed-")) {
        const url = safeUrl(props.url);
        return url ? (
          <div className="student-lesson__embed">
            <strong>{safeText(props.title || component.type.replace("embed-", ""))}</strong>
            <a href={url} target="_blank" rel="noreferrer">{url}<SvgIcon name="arrow-right" size="0.9rem" /></a>
          </div>
        ) : null;
      }
      return <p className="student-lesson__unsupported">{component.type}</p>;
  }
}

function AppLessonPage() {
  const { t, locale } = useTranslation();
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  const [course, setCourse] = useState<Course | undefined>(() => courseSlug ? getCourseBySlugStore(courseSlug) : undefined);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const lastTrackedLesson = useRef<string | null>(null);

  const loadLessonData = useCallback(async () => {
    if (!courseSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      await refreshCourses();
      const loadedCourse = getCourseBySlugStore(courseSlug);
      setCourse(loadedCourse);
      const myEnrollments = await getMyEnrollments();
      setEnrollment(loadedCourse
        ? myEnrollments.find(item => item.courseId === loadedCourse.id) ?? null
        : null);
    } catch {
      setCourse(getCourseBySlugStore(courseSlug));
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadLessonData();
    });
    return () => { active = false; };
  }, [loadLessonData]);

  useEffect(() => {
    if (!courseSlug) return;
    return subscribeCourses(() => setCourse(getCourseBySlugStore(courseSlug)));
  }, [courseSlug]);

  const modules = useMemo(() => course?.modules ?? [], [course?.modules]);
  const allLessons = useMemo(() =>
    modules.flatMap(module => [...module.lessons].sort((a, b) => a.order - b.order)),
  [modules]);
  const lesson = allLessons.find(item => item.slug === lessonSlug);
  const lessonIndex = lesson ? allLessons.findIndex(item => item.id === lesson.id) : -1;
  const previousLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;
  const currentModule = modules.find(module => module.lessons.some(item => item.id === lesson?.id));
  const lessonProgress = enrollment?.modulesProgress
    .flatMap(module => module.lessons ?? [])
    .find(progress => progress.lessonId === lesson?.id);
  const isLessonComplete = lessonProgress?.status === "concluido";
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const accessKey = course && lesson ? `${course.id}:${lesson.id}` : null;

  useEffect(() => {
    if (!course || course.status !== "publicado" || !lesson || !enrollment || !accessKey) return;
    if (lastTrackedLesson.current === accessKey) return;
    lastTrackedLesson.current = accessKey;

    let active = true;
    setSaveError(false);
    updateEnrollmentProgress(course.slug, {
      overallPercent: enrollment.overallPercent,
      currentLessonId: lesson.id,
      modulesProgress: enrollment.modulesProgress,
    }).then(updated => {
      if (active) setEnrollment(updated);
    }).catch(() => {
      if (active) setSaveError(true);
    });
    return () => { active = false; };
  }, [accessKey, course, enrollment, lesson]);

  const handleEnroll = async () => {
    if (!course || enrolling) return;
    setEnrolling(true);
    setLoadError(false);
    try {
      setEnrollment(await enrollInCourse(course.slug));
    } catch {
      setLoadError(true);
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!course || !lesson || !enrollment || saving || isLessonComplete) return;
    setSaving(true);
    setSaveError(false);

    const nextModulesProgress: EnrollmentModuleProgress[] = modules.map((module: Module) => {
      const currentProgress = enrollment.modulesProgress.find(item => item.moduleId === module.id);
      const previousLessons = currentProgress?.lessons ?? [];
      const lessonStatus = new Map(previousLessons.map(item => [item.lessonId, item]));
      const lessons = module.lessons.map((moduleLesson: Lesson) => {
        const existing = lessonStatus.get(moduleLesson.id);
        if (moduleLesson.id === lesson.id) {
          return {
            lessonId: moduleLesson.id,
            status: "concluido" as const,
            startedAt: existing?.startedAt ?? new Date().toISOString(),
            completedAt: existing?.completedAt ?? new Date().toISOString(),
            timeSpentMinutes: existing?.timeSpentMinutes ?? 0,
          };
        }
        return existing ?? {
          lessonId: moduleLesson.id,
          status: "nao-iniciado" as const,
          timeSpentMinutes: 0,
        };
      });
      const completedCount = lessons.filter(item => item.status === "concluido").length;
      return {
        moduleId: module.id,
        percent: module.lessons.length ? Math.round(completedCount / module.lessons.length * 100) : 0,
        ...(module.lessons.length > 0 && completedCount === module.lessons.length ? { completedAt: currentProgress?.completedAt ?? new Date().toISOString() } : {}),
        lessons,
      };
    });

    const completedLessonIds = new Set(nextModulesProgress.flatMap(module =>
      module.lessons.filter(item => item.status === "concluido").map(item => item.lessonId)));
    const overallPercent = allLessons.length
      ? Math.round(completedLessonIds.size / allLessons.length * 100)
      : 0;

    try {
      const updated = await updateEnrollmentProgress(course.slug, {
        overallPercent,
        currentLessonId: lesson.id,
        modulesProgress: nextModulesProgress,
      });
      setEnrollment(updated);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !course) {
    return (
      <div className="student-lesson__state" role="status" aria-live="polite">
        <span className="student-lesson__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
        <h1>{t.common.loading}</h1>
      </div>
    );
  }

  if (!course || course.status !== "publicado") {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon student-lesson__state-icon--error"><SvgIcon name="search" size="1.4rem" /></span>
        <h1>{t.learning.courseNotFoundTitle}</h1>
        <p>{t.learning.courseNotFoundDescription}</p>
        <Link to="/app/courses" className="student-lesson__button student-lesson__button--primary">{t.learning.backToMyCourses}</Link>
      </div>
    );
  }

  if (loadError && !enrollment) {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon student-lesson__state-icon--error"><SvgIcon name="bell" size="1.4rem" /></span>
        <h1>{t.learning.myCoursesErrorTitle}</h1>
        <p>{t.learning.myCoursesErrorDescription}</p>
        <button type="button" className="student-lesson__button student-lesson__button--primary" onClick={() => void loadLessonData()}>{t.learning.retry}</button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon student-lesson__state-icon--error"><SvgIcon name="search" size="1.4rem" /></span>
        <h1>{t.learning.lessonNotFoundTitle}</h1>
        <p>{t.learning.lessonNotFoundDescription}</p>
        <Link to={`/app/courses/${course.slug}`} className="student-lesson__button student-lesson__button--primary">{t.learning.backToMyCourses}</Link>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="student-lesson__state">
        <span className="student-lesson__state-icon"><SvgIcon name="book-open" size="1.4rem" /></span>
        <p className="student-lesson__state-eyebrow">{course.title}</p>
        <h1>{t.learning.enrollmentRequiredTitle}</h1>
        <p>{t.learning.enrollmentRequiredDescription}</p>
        <button type="button" className="student-lesson__button student-lesson__button--primary" onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? t.learning.enrolling : t.learning.enrollNow}
          <SvgIcon name="arrow-right" size="1rem" />
        </button>
        <Link to={`/app/courses/${course.slug}`} className="student-lesson__text-link">{t.learning.backToMyCourses}</Link>
        {loadError && <p role="alert" className="student-lesson__error">{t.learning.enrollmentError}</p>}
      </div>
    );
  }

  const completionPercent = Math.round(enrollment.overallPercent);
  const sortedBlocks = [...lesson.blocks].sort((a, b) => a.order - b.order);
  const readingTime = interpolate(t.learning.readingTime, { count: number(lesson.estimatedMinutes) });
  const lessonCountText = interpolate(t.learning.lessonNumber, { index: number(lessonIndex + 1), count: number(allLessons.length) });

  return (
    <div className="student-lesson">
      <header className="student-lesson__topbar">
        <Link to={`/app/courses/${course.slug}`} className="student-lesson__back">
          <SvgIcon name="arrow-left" size="1rem" />
          <span>{course.title}</span>
        </Link>
        <div className="student-lesson__top-progress">
          <div className="student-lesson__top-progress-row"><span>{t.learning.courseProgress}</span><strong>{completionPercent}%</strong></div>
          <div className="student-lesson__top-progress-bar" role="progressbar" aria-label={t.learning.courseProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent}>
            <span style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </header>

      {saveError && (
        <div className="student-lesson__notice" role="alert">
          <SvgIcon name="bell" size="1rem" />
          <span>{t.learning.saveProgressError}</span>
          <button type="button" onClick={() => void loadLessonData()}>{t.learning.retry}</button>
        </div>
      )}

      <main className="student-lesson__main" id="lesson-content">
        <article className="student-lesson__article">
          <nav className="student-lesson__breadcrumbs" aria-label={t.learning.lessonNavigation}>
            <Link to="/app/courses">{t.learning.myCoursesTitle}</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/app/courses/${course.slug}`}>{course.title}</Link>
            {currentModule && <><span aria-hidden="true">/</span><span>{currentModule.title}</span></>}
          </nav>

          <header className="student-lesson__lesson-header">
            <p className="student-lesson__eyebrow">{currentModule?.title ?? t.learning.modulesTitle}</p>
            <h1>{lesson.title}</h1>
            {lesson.description && <p className="student-lesson__description">{lesson.description}</p>}
            <div className="student-lesson__meta">
              <span><SvgIcon name="book-open" size="0.95rem" />{lessonCountText}</span>
              <span><SvgIcon name="clock" size="0.95rem" />{readingTime}</span>
              {isLessonComplete && <span className="student-lesson__completed-badge"><SvgIcon name="check" size="0.9rem" />{t.learning.lessonCompleted}</span>}
            </div>
          </header>

          {sortedBlocks.length === 0 ? (
            <div className="student-lesson__empty-content">
              <span className="student-lesson__state-icon"><SvgIcon name="book-open" size="1.35rem" /></span>
              <h2>{t.learning.noLessonContentTitle}</h2>
              <p>{t.learning.noLessonContentDescription}</p>
            </div>
          ) : (
            <div className="student-lesson__content">
              {sortedBlocks.map(block => (
                <section className="student-lesson__block" key={block.id}>
                  {block.components.slice().sort((a, b) => a.order - b.order).map(component =>
                    <ContentComponent key={component.id} component={component} />)}
                </section>
              ))}
            </div>
          )}

          <section className="student-lesson__completion">
            <div className="student-lesson__completion-copy">
              <span className={isLessonComplete ? "student-lesson__completion-icon student-lesson__completion-icon--done" : "student-lesson__completion-icon"}>
                <SvgIcon name="check" size="1.15rem" />
              </span>
              <div>
                <h2>{isLessonComplete ? t.learning.lessonCompleted : t.learning.completeLesson}</h2>
                <p>{isLessonComplete ? t.learning.courseProgress + ": " + completionPercent + "%" : t.learning.savingProgress}</p>
              </div>
            </div>
            <button
              type="button"
              className={isLessonComplete ? "student-lesson__button student-lesson__button--completed" : "student-lesson__button student-lesson__button--primary"}
              onClick={handleCompleteLesson}
              disabled={saving || isLessonComplete}
            >
              {saving ? t.learning.savingProgress : isLessonComplete ? t.learning.lessonCompleted : t.learning.completeLesson}
              {!isLessonComplete && <SvgIcon name="check" size="1rem" />}
            </button>
          </section>

          <nav className="student-lesson__navigation" aria-label={t.learning.lessonNavigation}>
            {previousLesson ? (
              <Link to={`/app/courses/${course.slug}/lessons/${previousLesson.slug}`} className="student-lesson__nav-button student-lesson__nav-button--previous">
                <SvgIcon name="arrow-left" size="1rem" />
                <span><small>{t.learning.previousLesson}</small><strong>{previousLesson.title}</strong></span>
              </Link>
            ) : <span />}
            {nextLesson ? (
              <Link to={`/app/courses/${course.slug}/lessons/${nextLesson.slug}`} className="student-lesson__nav-button student-lesson__nav-button--next">
                <span><small>{t.learning.nextLesson}</small><strong>{nextLesson.title}</strong></span>
                <SvgIcon name="arrow-right" size="1rem" />
              </Link>
            ) : (
              <Link to={`/app/courses/${course.slug}`} className="student-lesson__nav-button student-lesson__nav-button--next">
                <span><small>{t.learning.modulesTitle}</small><strong>{t.learning.backToMyCourses}</strong></span>
                <SvgIcon name="arrow-right" size="1rem" />
              </Link>
            )}
          </nav>
        </article>
      </main>
    </div>
  );
}

export default AppLessonPage;
