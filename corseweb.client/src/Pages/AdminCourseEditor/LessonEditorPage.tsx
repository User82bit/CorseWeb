import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import LessonCanvasEditor from "./LessonCanvasEditor";
import { useTranslation } from "../../i18n/useTranslation";
import type { Locale } from "../../i18n/types";
import type { Block, Course, CourseCreateInput, Lesson, Module } from "../../types/course";
import { getCourseBySlugStore, refreshCourses } from "../../store/courseStore";
import "./LessonEditorPage.scss";

interface EditorLocationState {
  modules?: Module[];
  courseForm?: CourseCreateInput;
}

const COPY: Record<Locale, {
  back: string;
  applyAndReturn: string;
  structure: string;
  properties: string;
  lessonTitle: string;
  description: string;
  duration: string;
  freePreview: string;
  gridScale: string;
  savingNote: string;
  loading: string;
  notFound: string;
  returnToCourse: string;
  minutes: string;
  noLessons: string;
  selectLesson: string;
}> = {
  "pt-BR": {
    back: "Voltar sem aplicar",
    applyAndReturn: "Aplicar e voltar",
    structure: "Estrutura",
    properties: "Propriedades da aula",
    lessonTitle: "Título da aula",
    description: "Descrição",
    duration: "Duração (min)",
    freePreview: "Prévia gratuita",
    gridScale: "Grade · 22 px",
    savingNote: "As alterações voltam para o formulário do curso. Clique em Salvar para persistir.",
    loading: "Carregando aula…",
    notFound: "A aula não foi encontrada neste curso.",
    returnToCourse: "Retornar ao curso",
    minutes: "min",
    noLessons: "Nenhuma aula",
    selectLesson: "Ir para outra aula",
  },
  en: {
    back: "Voltar sem aplicar",
    applyAndReturn: "Apply and return",
    structure: "Structure",
    properties: "Lesson properties",
    lessonTitle: "Lesson title",
    description: "Description",
    duration: "Duration (min)",
    freePreview: "Free preview",
    gridScale: "Grid · 22 px",
    savingNote: "Changes return to the course form. Click Save to persist them.",
    loading: "Loading lesson…",
    notFound: "This lesson was not found in the course.",
    returnToCourse: "Return to course",
    minutes: "min",
    noLessons: "No lessons",
    selectLesson: "Go to another lesson",
  },
  es: {
    back: "Volver sin aplicar",
    applyAndReturn: "Apply and return",
    structure: "Estructura",
    properties: "Propiedades de la lección",
    lessonTitle: "Título de la lección",
    description: "Descripción",
    duration: "Duración (min)",
    freePreview: "Vista previa gratuita",
    gridScale: "Cuadrícula · 22 px",
    savingNote: "Los cambios vuelven al formulario del curso. Pulsa Guardar para persistirlos.",
    loading: "Cargando lección…",
    notFound: "No se encontró esta lección en el curso.",
    returnToCourse: "Volver al curso",
    minutes: "min",
    noLessons: "Sin lecciones",
    selectLesson: "Ir a otra lección",
  },
};

function LessonEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseSlug, lessonId } = useParams<{ courseSlug: string; lessonId: string }>();
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const navigationState = location.state as EditorLocationState | null;

  const [course, setCourse] = useState<Course | undefined>(() =>
    courseSlug ? getCourseBySlugStore(courseSlug) : undefined
  );
  const [modules, setModules] = useState<Module[]>(() =>
    navigationState?.modules ?? (courseSlug ? getCourseBySlugStore(courseSlug)?.modules ?? [] : [])
  );
  const [loading, setLoading] = useState(!navigationState?.modules);

  useEffect(() => {
    if (navigationState?.modules) {
      setLoading(false);
      return;
    }
    if (!courseSlug) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    refreshCourses()
      .then(() => {
        if (cancelled) return;
        const loadedCourse = getCourseBySlugStore(courseSlug);
        setCourse(loadedCourse);
        setModules(loadedCourse?.modules ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [courseSlug, location.key, navigationState]);

  useEffect(() => {
    const state = location.state as EditorLocationState | null;
    if (!state?.modules) return;
    setModules(state.modules);
    if (courseSlug) setCourse(getCourseBySlugStore(courseSlug));
  }, [location.key, location.state, courseSlug]);

  const active = useMemo(() => {
    for (const module of modules) {
      const lesson = module.lessons.find((item) => item.id === lessonId);
      if (lesson) return { module, lesson };
    }
    return null;
  }, [modules, lessonId]);

  const updateLesson = (patch: Partial<Lesson>) => {
    if (!active) return;
    const timestamp = new Date().toISOString();
    setModules((current) => current.map((module) => module.id !== active.module.id ? module : {
      ...module,
      lessons: module.lessons.map((lesson) => lesson.id === active.lesson.id
        ? { ...lesson, ...patch, updatedAt: timestamp }
        : lesson),
    }));
  };

  const handleNavigateToLesson = (nextLesson: Lesson) => {
    if (!courseSlug) return;
    navigate(
      `/admin/courses/${courseSlug}/editor/lessons/${nextLesson.id}`,
      { state: { modules, courseForm: navigationState?.courseForm } }
    );
  };

  const handleApplyAndReturn = () => {
    if (!courseSlug) return;
    navigate(`/admin/courses/${courseSlug}/editor`, {
      state: {
        lessonEditorReturn: true,
        modules,
        courseForm: navigationState?.courseForm,
      },
    });
  };

  const handleBack = () => {
    if (!courseSlug) {
      navigate("/admin/courses");
      return;
    }
    navigate(`/admin/courses/${courseSlug}/editor`, {
      state: {
        lessonEditorReturn: true,
        modules: navigationState?.modules ?? course?.modules ?? modules,
        courseForm: navigationState?.courseForm,
      },
    });
  };

  if (loading) {
    return <main className="lesson-editor-workspace lesson-editor-workspace--status"><p role="status">{copy.loading}</p></main>;
  }

  if (!active) {
    return (
      <main className="lesson-editor-workspace lesson-editor-workspace--status">
        <p role="alert">{copy.notFound}</p>
        <button type="button" className="lesson-editor-workspace__primary" onClick={handleBack}>{copy.returnToCourse}</button>
      </main>
    );
  }

  const orderedModules = [...modules].sort((a, b) => a.order - b.order);

  return (
    <main className="lesson-editor-workspace">
      <header className="lesson-editor-workspace__toolbar">
        <div className="lesson-editor-workspace__brand">
          <button type="button" className="lesson-editor-workspace__back" onClick={handleBack} aria-label={copy.back} title={copy.back}>←</button>
          <div className="lesson-editor-workspace__breadcrumbs">
            <span>{course?.title ?? courseSlug}</span>
            <span aria-hidden="true">/</span>
            <span>{active.module.title}</span>
            <strong>{active.lesson.title}</strong>
          </div>
        </div>
        <div className="lesson-editor-workspace__toolbar-actions">
          <label className="lesson-editor-workspace__lesson-picker">
            <span className="lesson-editor-workspace__sr-only">{copy.selectLesson}</span>
            <select value={active.lesson.id} onChange={(event) => {
              const next = modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === event.target.value);
              if (next) handleNavigateToLesson(next);
            }}>
              {orderedModules.map((module) => (
                <optgroup key={module.id} label={module.title}>
                  {[...module.lessons].sort((a, b) => a.order - b.order).map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <span className="lesson-editor-workspace__grid-scale">{copy.gridScale}</span>
          <button type="button" className="lesson-editor-workspace__primary" onClick={handleApplyAndReturn}>{copy.applyAndReturn}</button>
        </div>
      </header>

      <div className="lesson-editor-workspace__body">
        <aside className="lesson-editor-workspace__sidebar" aria-label={copy.structure}>
          <h2>{copy.structure}</h2>
          {orderedModules.map((module, index) => (
            <section className="lesson-editor-workspace__module" key={module.id}>
              <h3><span>{String(index + 1).padStart(2, "0")}</span>{module.title}</h3>
              {module.lessons.length === 0 ? <p>{copy.noLessons}</p> : [...module.lessons].sort((a, b) => a.order - b.order).map((lesson) => (
                <button
                  type="button"
                  key={lesson.id}
                  className={`lesson-editor-workspace__lesson${lesson.id === active.lesson.id ? " lesson-editor-workspace__lesson--active" : ""}`}
                  aria-current={lesson.id === active.lesson.id ? "page" : undefined}
                  onClick={() => handleNavigateToLesson(lesson)}
                >
                  <span aria-hidden="true">▤</span>
                  <span>{lesson.title}</span>
                </button>
              ))}
            </section>
          ))}
        </aside>

        <section className="lesson-editor-workspace__stage" aria-label={copy.gridScale}>
          <div className="lesson-editor-workspace__canvas-surface">
            <div className="lesson-editor-workspace__canvas-heading">
              <div>
                <strong>{active.lesson.title}</strong>
                <span>{active.module.title}</span>
              </div>
              <span className="lesson-editor-workspace__grid-scale">{copy.gridScale}</span>
            </div>
            <LessonCanvasEditor lesson={active.lesson} onChange={(blocks: Block[]) => updateLesson({ blocks })} />
          </div>
        </section>

        <aside className="lesson-editor-workspace__inspector" aria-labelledby="lesson-editor-properties-title">
          <p className="lesson-editor-workspace__eyebrow">{copy.properties}</p>
          <h2 id="lesson-editor-properties-title">{active.lesson.title}</h2>
          <label>
            <span>{copy.lessonTitle}</span>
            <input value={active.lesson.title} maxLength={120} onChange={(event) => updateLesson({ title: event.target.value })} />
          </label>
          <label>
            <span>{copy.description}</span>
            <textarea value={active.lesson.description ?? ""} rows={4} maxLength={2000} onChange={(event) => updateLesson({ description: event.target.value })} />
          </label>
          <label>
            <span>{copy.duration}</span>
            <input type="number" min={1} max={600} value={active.lesson.estimatedMinutes} onChange={(event) => updateLesson({ estimatedMinutes: Math.min(600, Math.max(1, Number(event.target.value) || 1)) })} />
          </label>
          <label className="lesson-editor-workspace__checkbox">
            <input type="checkbox" checked={active.lesson.isFree} onChange={(event) => updateLesson({ isFree: event.target.checked })} />
            <span>{copy.freePreview}</span>
          </label>
          <p className="lesson-editor-workspace__note">{copy.savingNote}</p>
        </aside>
      </div>
    </main>
  );
}

export default LessonEditorPage;
