import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import type { Lesson, Module } from "../../types/course";
import LessonCanvasEditor from "./LessonCanvasEditor";
import "./CourseStructureEditor.scss";

interface CourseStructureEditorProps {
  courseId: string;
  actorId: string;
  modules: Module[];
  onChange: (modules: Module[]) => void;
}

function createId(prefix: string): string {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomId}`;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function reorder<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function normalizeModules(modules: Module[], courseId: string): Module[] {
  return modules.map((module, index) => {
    const lessons = [...(module.lessons ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((lesson, lessonIndex) => ({
        ...lesson,
        courseId,
        moduleId: module.id,
        order: lessonIndex + 1,
      }));
    return {
      ...module,
      courseId,
      order: index + 1,
      lessons,
      totalLessons: lessons.length,
      totalMinutes: lessons.reduce((total, lesson) => total + Math.max(0, lesson.estimatedMinutes || 0), 0),
    };
  });
}

function CourseStructureEditor({ courseId, actorId, modules, onChange }: CourseStructureEditorProps) {
  const { t } = useTranslation();
  const copy = t.editorStructure;
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(modules[0]?.id ?? null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules],
  );
  const selectedModule = orderedModules.find((module) => module.id === selectedModuleId) ?? orderedModules[0] ?? null;
  const activeModuleId = selectedModule?.id ?? null;
  const selectedLesson = selectedModule?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;


  const commit = (nextModules: Module[]) => onChange(normalizeModules(nextModules, courseId));

  const handleAddModule = () => {
    const title = newModuleTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const baseSlug = slugify(title);
    const existingSlugs = new Set(orderedModules.map((module) => module.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
    const moduleId = createId("module");
    const nextModule: Module = {
      id: moduleId,
      courseId,
      slug,
      title,
      description: "",
      order: orderedModules.length + 1,
      lessons: [],
      totalLessons: 0,
      totalMinutes: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    };
    commit([...orderedModules, nextModule]);
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setNewModuleTitle("");
  };

  const handleAddLesson = (module: Module) => {
    const title = newLessonTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const lessonId = createId("lesson");
    const baseSlug = slugify(title);
    const existingSlugs = new Set(module.lessons.map((lesson) => lesson.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
    const lesson: Lesson = {
      id: lessonId,
      courseId,
      moduleId: module.id,
      slug,
      title,
      description: "",
      order: module.lessons.length + 1,
      estimatedMinutes: 5,
      blocks: [],
      isPublished: false,
      isFree: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    };
    commit(orderedModules.map((item) => item.id === module.id
      ? { ...item, lessons: [...item.lessons, lesson] }
      : item));
    setSelectedModuleId(module.id);
    setSelectedLessonId(lessonId);
    setNewLessonTitle("");
  };

  const updateModule = (patch: Partial<Module>) => {
    if (!selectedModule) return;
    const now = new Date().toISOString();
    commit(orderedModules.map((module) => module.id === selectedModule.id
      ? { ...module, ...patch, updatedAt: now, updatedBy: actorId }
      : module));
  };

  const updateLesson = (patch: Partial<Lesson>) => {
    if (!selectedModule || !selectedLesson) return;
    const now = new Date().toISOString();
    commit(orderedModules.map((module) => module.id === selectedModule.id
      ? {
          ...module,
          lessons: module.lessons.map((lesson) => lesson.id === selectedLesson.id
            ? { ...lesson, ...patch, updatedAt: now, updatedBy: actorId }
            : lesson),
        }
      : module));
  };

  const handleMoveModule = (moduleId: string, offset: number) => {
    const index = orderedModules.findIndex((module) => module.id === moduleId);
    commit(reorder(orderedModules, index, offset));
  };

  const handleMoveLesson = (offset: number) => {
    if (!selectedModule || !selectedLesson) return;
    const lessons = [...selectedModule.lessons].sort((a, b) => a.order - b.order);
    const index = lessons.findIndex((lesson) => lesson.id === selectedLesson.id);
    const movedLessons = reorder(lessons, index, offset).map((lesson, lessonIndex) => ({
      ...lesson,
      order: lessonIndex + 1,
    }));
    commit(orderedModules.map((module) => module.id === selectedModule.id
      ? { ...module, lessons: movedLessons }
      : module));
  };

  const handleDeleteModule = () => {
    if (!selectedModule || !window.confirm(copy.confirmDeleteModule.replace("{title}", selectedModule.title))) return;
    const next = orderedModules.filter((module) => module.id !== selectedModule.id);
    commit(next);
    setSelectedModuleId(next[0]?.id ?? null);
    setSelectedLessonId(null);
  };

  const handleDeleteLesson = () => {
    if (!selectedModule || !selectedLesson
      || !window.confirm(copy.confirmDeleteLesson.replace("{title}", selectedLesson.title))) return;
    commit(orderedModules.map((module) => module.id === selectedModule.id
      ? { ...module, lessons: module.lessons.filter((lesson) => lesson.id !== selectedLesson.id) }
      : module));
    setSelectedLessonId(null);
  };

  return (
    <section className="course-structure" aria-labelledby="course-structure-title">
      <header className="course-structure__header">
        <div>
          <p className="course-structure__eyebrow">{copy.eyebrow}</p>
          <h2 id="course-structure-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <span className="course-structure__summary">
          {orderedModules.length} {copy.modules.toLowerCase()} · {orderedModules.reduce((total, module) => total + module.lessons.length, 0)} {copy.lessons.toLowerCase()}
        </span>
      </header>

      <div className="course-structure__add-module">
        <label className="course-structure__field course-structure__field--grow">
          <span>{copy.newModule}</span>
          <input
            value={newModuleTitle}
            onChange={(event) => setNewModuleTitle(event.target.value)}
            placeholder={copy.modulePlaceholder}
            maxLength={120}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddModule(); } }}
          />
        </label>
        <button className="course-structure__button course-structure__button--primary" type="button" onClick={handleAddModule}>
          <span aria-hidden="true">+</span> {copy.addModule}
        </button>
      </div>

      {orderedModules.length === 0 ? (
        <div className="course-structure__empty">
          <span className="course-structure__empty-icon" aria-hidden="true">▤</span>
          <h3>{copy.emptyTitle}</h3>
          <p>{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="course-structure__board" role="region" aria-label={copy.boardLabel}>
          {orderedModules.map((module, index) => (
            <article
              className={`course-structure__column${module.id === activeModuleId ? " course-structure__column--selected" : ""}`}
              key={module.id}
            >
              <div className="course-structure__column-header">
                <button
                  type="button"
                  className="course-structure__module-select"
                  aria-pressed={module.id === activeModuleId && selectedLessonId === null}
                  onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(null); }}
                >
                  <span className="course-structure__module-order">{String(index + 1).padStart(2, "0")}</span>
                  <span className="course-structure__module-name">{module.title}</span>
                  <span className="course-structure__count">{module.lessons.length}</span>
                </button>
                <div className="course-structure__column-actions">
                  <button type="button" aria-label={copy.moveModuleUp.replace("{title}", module.title)} onClick={() => handleMoveModule(module.id, -1)} disabled={index === 0}>↑</button>
                  <button type="button" aria-label={copy.moveModuleDown.replace("{title}", module.title)} onClick={() => handleMoveModule(module.id, 1)} disabled={index === orderedModules.length - 1}>↓</button>
                </div>
              </div>

              <div className="course-structure__lesson-list">
                {module.lessons.length === 0 ? (
                  <p className="course-structure__empty-lessons">{copy.noLessons}</p>
                ) : [...module.lessons].sort((a, b) => a.order - b.order).map((lesson, lessonIndex) => (
                  <button
                    type="button"
                    key={lesson.id}
                    className={`course-structure__lesson-card${lesson.id === selectedLessonId ? " course-structure__lesson-card--selected" : ""}`}
                    aria-pressed={lesson.id === selectedLessonId}
                    onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(lesson.id); }}
                  >
                    <span className="course-structure__lesson-number">{String(lessonIndex + 1).padStart(2, "0")}</span>
                    <span className="course-structure__lesson-copy">
                      <strong>{lesson.title}</strong>
                      <small>{lesson.estimatedMinutes} {copy.minutes}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="course-structure__add-lesson">
                <label className="course-structure__sr-only" htmlFor={`new-lesson-${module.id}`}>{copy.newLesson}</label>
                <input
                  id={`new-lesson-${module.id}`}
                  value={module.id === activeModuleId ? newLessonTitle : ""}
                  onFocus={() => { if (selectedModuleId !== module.id) setNewLessonTitle(""); setSelectedModuleId(module.id); setSelectedLessonId(null); }}
                  onChange={(event) => { setSelectedModuleId(module.id); setNewLessonTitle(event.target.value); }}
                  placeholder={copy.lessonPlaceholder}
                  maxLength={120}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddLesson(module); } }}
                />
                <button type="button" onClick={() => handleAddLesson(module)} aria-label={copy.addLesson} title={copy.addLesson}>+</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedModule && (
        <div className="course-structure__inspector">
          <section className="course-structure__panel">
            <div className="course-structure__panel-heading">
              <div>
                <p className="course-structure__eyebrow">{copy.moduleSettings}</p>
                <h3>{copy.editModule}</h3>
              </div>
              <div className="course-structure__panel-actions">
                <button type="button" className="course-structure__button" onClick={handleDeleteModule}>{copy.deleteModule}</button>
              </div>
            </div>
            <label className="course-structure__field">
              <span>{copy.moduleTitle}</span>
              <input value={selectedModule.title} onChange={(event) => updateModule({ title: event.target.value })} maxLength={120} required />
            </label>
            <label className="course-structure__field">
              <span>{copy.moduleDescription}</span>
              <textarea value={selectedModule.description ?? ""} onChange={(event) => updateModule({ description: event.target.value })} rows={2} maxLength={1000} />
            </label>
          </section>

          {selectedLesson ? (
            <>
            <section className="course-structure__panel">
              <div className="course-structure__panel-heading">
                <div>
                  <p className="course-structure__eyebrow">{copy.lessonSettings}</p>
                  <h3>{copy.editLesson}</h3>
                </div>
                <button type="button" className="course-structure__button course-structure__button--danger" onClick={handleDeleteLesson}>{copy.deleteLesson}</button>
              </div>
              <label className="course-structure__field">
                <span>{copy.lessonTitle}</span>
                <input value={selectedLesson.title} onChange={(event) => updateLesson({ title: event.target.value })} maxLength={120} required />
              </label>
              <label className="course-structure__field">
                <span>{copy.lessonDescription}</span>
                <textarea value={selectedLesson.description ?? ""} onChange={(event) => updateLesson({ description: event.target.value })} rows={3} maxLength={2000} />
              </label>
              <div className="course-structure__lesson-settings-row">
                <label className="course-structure__field">
                  <span>{copy.duration}</span>
                  <input type="number" min={1} max={600} value={selectedLesson.estimatedMinutes} onChange={(event) => updateLesson({ estimatedMinutes: Math.min(600, Math.max(1, Number(event.target.value) || 1)) })} />
                </label>
                <label className="course-structure__checkbox">
                  <input type="checkbox" checked={selectedLesson.isFree} onChange={(event) => updateLesson({ isFree: event.target.checked })} />
                  <span>{copy.freePreview}</span>
                </label>
              </div>
              <div className="course-structure__reorder-row">
                <button type="button" className="course-structure__button" onClick={() => handleMoveLesson(-1)} disabled={selectedLesson.order <= 1}>{copy.moveLessonUp}</button>
                <button type="button" className="course-structure__button" onClick={() => handleMoveLesson(1)} disabled={selectedLesson.order >= selectedModule.lessons.length}>{copy.moveLessonDown}</button>
              </div>
            </section>
            <LessonCanvasEditor lesson={selectedLesson} onChange={(blocks) => updateLesson({ blocks })} />
            </>
          ) : (
            <div className="course-structure__hint">
              <strong>{copy.lessonCanvasNextTitle}</strong>
              <p>{copy.lessonCanvasNextDescription}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default CourseStructureEditor;
