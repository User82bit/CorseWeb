import { useEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import type { CanvasElement, CanvasElementType, Course, Lesson, Module } from "../../types/course";
import { getCourseBySlugStore, getDraftCourses, publishDraft, refreshCourses, updateCourse } from "../../store/courseStore";
import "./LessonEditorPage.scss";

const GRID = 24;
const CANVAS_WIDTH = 1200;
const CANVAS_MIN_HEIGHT = 900;
const PALETTE_DRAG_TYPE = "application/x-corseweb-canvas-element";

const ELEMENT_TYPES: CanvasElementType[] = [
  "heading", "paragraph", "list", "image", "video", "code", "quiz", "exercise", "callout", "divider", "embed",
];

const COPY: Record<"pt-BR" | "en" | "es", {
  back: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
  publish: string;
  publishing: string;
  loading: string;
  notFound: string;
  palette: string;
  paletteHint: string;
  canvas: string;
  canvasHint: string;
  inspector: string;
  inspectorHint: string;
  course: string;
  lesson: string;
  chooseLesson: string;
  addModule: string;
  addLesson: string;
  properties: string;
  cardType: string;
  content: string;
  title: string;
  url: string;
  alt: string;
  caption: string;
  language: string;
  code: string;
  question: string;
  options: string;
  correctAnswer: string;
  instruction: string;
  starterCode: string;
  solution: string;
  ordered: string;
  width: string;
  height: string;
  remove: string;
  duplicate: string;
  emptyCanvas: string;
  dropHere: string;
  moduleName: string;
  lessonName: string;
  duration: string;
  cardNames: Record<CanvasElementType, string>;
}> = {
  "pt-BR": {
    back: "Voltar aos cursos",
    save: "Salvar",
    saving: "Salvando…",
    saved: "Rascunho salvo.",
    saveError: "Não foi possível salvar. Verifique sua conexão e tente novamente.",
    publish: "Publicar curso",
    publishing: "Publicando…",
    loading: "Abrindo o editor visual…",
    notFound: "Curso não encontrado ou sem permissão de edição.",
    palette: "Cards",
    paletteHint: "Arraste um card para o canvas ou toque para adicionar.",
    canvas: "Canvas",
    canvasHint: "Solte cards aqui. Arraste-os para reposicionar; eles encaixam nos pontos da grade.",
    inspector: "Propriedades",
    inspectorHint: "Selecione um card no canvas para editar suas propriedades.",
    course: "Curso",
    lesson: "Aula",
    chooseLesson: "Selecionar aula",
    addModule: "Novo módulo",
    addLesson: "Nova aula",
    properties: "Conteúdo",
    cardType: "Tipo de card",
    content: "Texto",
    title: "Título",
    url: "URL",
    alt: "Texto alternativo",
    caption: "Legenda",
    language: "Linguagem",
    code: "Código",
    question: "Pergunta",
    options: "Opções (uma por linha)",
    correctAnswer: "Índice da resposta certa (começa em 0)",
    instruction: "Instrução",
    starterCode: "Código inicial",
    solution: "Solução",
    ordered: "Lista numerada",
    width: "Largura (px)",
    height: "Altura (px)",
    remove: "Excluir card",
    duplicate: "Duplicar card",
    emptyCanvas: "Esta aula ainda está vazia.",
    dropHere: "Arraste um card da barra esquerda para começar",
    moduleName: "Módulo",
    lessonName: "Aula",
    duration: "Duração estimada (min)",
    cardNames: {
      heading: "Título", paragraph: "Texto", list: "Lista", image: "Imagem", video: "Vídeo",
      code: "Código", quiz: "Quiz", exercise: "Exercício", callout: "Destaque", divider: "Divisor", embed: "Incorporação",
    },
  },
  en: {
    back: "Back to courses",
    save: "Save",
    saving: "Saving…",
    saved: "Draft saved.",
    saveError: "Could not save. Check your connection and try again.",
    publish: "Publish course",
    publishing: "Publishing…",
    loading: "Opening visual editor…",
    notFound: "Course not found or you do not have permission to edit it.",
    palette: "Cards",
    paletteHint: "Drag a card onto the canvas or click to add it.",
    canvas: "Canvas",
    canvasHint: "Drop cards here. Drag to reposition; cards snap to the grid points.",
    inspector: "Properties",
    inspectorHint: "Select a card on the canvas to edit its properties.",
    course: "Course",
    lesson: "Lesson",
    chooseLesson: "Select lesson",
    addModule: "New module",
    addLesson: "New lesson",
    properties: "Content",
    cardType: "Card type",
    content: "Text",
    title: "Title",
    url: "URL",
    alt: "Alternative text",
    caption: "Caption",
    language: "Language",
    code: "Code",
    question: "Question",
    options: "Options (one per line)",
    correctAnswer: "Correct answer index (starts at 0)",
    instruction: "Instructions",
    starterCode: "Starter code",
    solution: "Solution",
    ordered: "Numbered list",
    width: "Width (px)",
    height: "Height (px)",
    remove: "Delete card",
    duplicate: "Duplicate card",
    emptyCanvas: "This lesson is empty.",
    dropHere: "Drag a card from the left panel to start",
    moduleName: "Module",
    lessonName: "Lesson",
    duration: "Estimated duration (min)",
    cardNames: {
      heading: "Heading", paragraph: "Text", list: "List", image: "Image", video: "Video",
      code: "Code", quiz: "Quiz", exercise: "Exercise", callout: "Callout", divider: "Divider", embed: "Embed",
    },
  },
  es: {
    back: "Volver a los cursos",
    save: "Guardar",
    saving: "Guardando…",
    saved: "Borrador guardado.",
    saveError: "No se pudo guardar. Comprueba la conexión e inténtalo de nuevo.",
    publish: "Publicar curso",
    publishing: "Publicando…",
    loading: "Abriendo el editor visual…",
    notFound: "Curso no encontrado o sin permiso de edición.",
    palette: "Tarjetas",
    paletteHint: "Arrastra una tarjeta al lienzo o pulsa para añadirla.",
    canvas: "Lienzo",
    canvasHint: "Suelta tarjetas aquí. Arrástralas para moverlas; se ajustan a la cuadrícula.",
    inspector: "Propiedades",
    inspectorHint: "Selecciona una tarjeta del lienzo para editar sus propiedades.",
    course: "Curso",
    lesson: "Lección",
    chooseLesson: "Seleccionar lección",
    addModule: "Nuevo módulo",
    addLesson: "Nueva lección",
    properties: "Contenido",
    cardType: "Tipo de tarjeta",
    content: "Texto",
    title: "Título",
    url: "URL",
    alt: "Texto alternativo",
    caption: "Leyenda",
    language: "Lenguaje",
    code: "Código",
    question: "Pregunta",
    options: "Opciones (una por línea)",
    correctAnswer: "Índice de la respuesta correcta (empieza en 0)",
    instruction: "Instrucción",
    starterCode: "Código inicial",
    solution: "Solución",
    ordered: "Lista numerada",
    width: "Ancho (px)",
    height: "Alto (px)",
    remove: "Eliminar tarjeta",
    duplicate: "Duplicar tarjeta",
    emptyCanvas: "Esta lección está vacía.",
    dropHere: "Arrastra una tarjeta desde el panel izquierdo para empezar",
    moduleName: "Módulo",
    lessonName: "Lección",
    duration: "Duración estimada (min)",
    cardNames: {
      heading: "Título", paragraph: "Texto", list: "Lista", image: "Imagen", video: "Vídeo",
      code: "Código", quiz: "Cuestionario", exercise: "Ejercicio", callout: "Destacado", divider: "Separador", embed: "Incrustación",
    },
  },
};

function createId(prefix: string): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${id}`;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID) * GRID;
}

function getText(element: CanvasElement, key: string, fallback = ""): string {
  const value = element.props?.[key];
  return typeof value === "string" ? value : fallback;
}

function elementDimensions(type: CanvasElementType): { width: number; height: number } {
  switch (type) {
    case "divider": return { width: 600, height: 72 };
    case "quiz":
    case "exercise": return { width: 384, height: 216 };
    case "image":
    case "video": return { width: 288, height: 216 };
    case "list": return { width: 288, height: 168 };
    case "code":
    case "embed": return { width: 336, height: 192 };
    case "heading": return { width: 288, height: 96 };
    case "callout": return { width: 288, height: 144 };
    default: return { width: 288, height: 144 };
  }
}

function defaultProps(type: CanvasElementType): Record<string, unknown> {
  switch (type) {
    case "heading": return { content: "Novo título", level: 2 };
    case "paragraph": return { content: "Escreva seu texto aqui." };
    case "list": return { items: ["Primeiro item", "Segundo item"], ordered: false };
    case "image": return { url: "", alt: "", caption: "" };
    case "video": return { url: "", caption: "" };
    case "code": return { code: "console.log('Hello world');", language: "javascript" };
    case "quiz": return { question: "Escreva a pergunta", options: ["Opção A", "Opção B"], correctIndex: 0, explanation: "" };
    case "exercise": return { instruction: "Descreva a atividade", starterCode: "", solution: "" };
    case "callout": return { title: "Destaque", content: "Escreva uma informação importante." };
    case "divider": return { style: "solid" };
    case "embed": return { url: "", title: "" };
  }
}

function overlaps(a: Pick<CanvasElement, "x" | "y" | "width" | "height">, b: Pick<CanvasElement, "x" | "y" | "width" | "height">): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function findFreePosition(elements: CanvasElement[], width: number, height: number): { x: number; y: number } {
  const possibleX = [...new Set([GRID, GRID * 14, GRID * 27, Math.max(GRID, snapToGrid(CANVAS_WIDTH - width - GRID))])];
  for (let y = GRID; y < 12000; y += GRID) {
    for (const x of possibleX) {
      const candidate = { x, y, width, height };
      if (x + width <= CANVAS_WIDTH - GRID && !elements.some((element) => overlaps(candidate, element))) {
        return { x, y };
      }
    }
  }
  return { x: GRID, y: Math.max(GRID, ...elements.map((element) => snapToGrid(element.y + element.height + GRID))) };
}

function createCanvasElement(type: CanvasElementType, x: number, y: number): CanvasElement {
  const size = elementDimensions(type);
  return {
    id: createId("card"),
    type,
    x,
    y,
    width: size.width,
    height: size.height,
    props: defaultProps(type),
  };
}

function createLesson(course: Course, moduleId: string, order: number, title: string): Lesson {
  const now = new Date().toISOString();
  const id = createId("lesson");
  const actor = course.authorId || "local-user";
  return {
    id,
    courseId: course.id,
    moduleId,
    slug: `${title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `aula-${order}`}-${order}`,
    title,
    description: "",
    order,
    estimatedMinutes: 5,
    elements: [],
    isPublished: false,
    isFree: false,
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    updatedBy: actor,
  };
}

function createModule(course: Course, order: number): Module {
  const now = new Date().toISOString();
  const id = createId("module");
  const actor = course.authorId || "local-user";
  const lesson = createLesson(course, id, 1, "Aula 1");
  return {
    id,
    courseId: course.id,
    slug: `modulo-${order}`,
    title: `Módulo ${order}`,
    description: "",
    order,
    lessons: [lesson],
    totalLessons: 1,
    totalMinutes: lesson.estimatedMinutes,
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    updatedBy: actor,
  };
}

function prepareModules(course: Course): Module[] {
  const received = (course.modules ?? []).map((module, moduleIndex) => ({
    ...module,
    order: moduleIndex + 1,
    lessons: (module.lessons ?? []).map((lesson, lessonIndex) => {
      // This is the new contract: legacy "blocks" are not translated into canvas elements.
      const { blocks: discardedLegacyBlocks, ...lessonWithoutLegacyBlocks } = lesson as Lesson & { blocks?: unknown };
      void discardedLegacyBlocks;
      return { ...lessonWithoutLegacyBlocks, elements: Array.isArray(lesson.elements) ? lesson.elements : [], order: lessonIndex + 1, moduleId: module.id };
    }),
  }));
  if (received.length === 0) return [createModule(course, 1)];
  if (received.every((module) => module.lessons.length === 0)) {
    const first = received[0];
    const lesson = createLesson(course, first.id, 1, "Aula 1");
    received[0] = { ...first, lessons: [lesson], totalLessons: 1, totalMinutes: lesson.estimatedMinutes };
  }
  return received;
}

function ElementPreview({ element }: { element: CanvasElement }) {
  const props = element.props ?? {};
  const text = (key: string, fallback = "") => getText(element, key, fallback);
  const safeUrl = (value: string) => {
    if (!value.trim()) return "";
    try {
      const url = new URL(value.trim(), window.location.origin);
      return url.protocol === "https:" || url.origin === window.location.origin ? url.href : "";
    } catch {
      return "";
    }
  };

  switch (element.type) {
    case "heading": {
      const level = Number(props.level ?? 2);
      const Tag = level === 1 ? "h2" : level === 3 ? "h4" : "h3";
      return <Tag className="lesson-editor-workspace__preview-heading">{text("content", "Novo título")}</Tag>;
    }
    case "paragraph":
      return <p className="lesson-editor-workspace__preview-text">{text("content", "Escreva seu texto aqui.")}</p>;
    case "list": {
      const items = Array.isArray(props.items) ? props.items.map((item) => String(item)) : [];
      const Tag = props.ordered ? "ol" : "ul";
      return <Tag className="lesson-editor-workspace__preview-list">{items.map((item, index) => <li key={index}>{item}</li>)}</Tag>;
    }
    case "image": {
      const url = safeUrl(text("url"));
      return url
        ? <figure className="lesson-editor-workspace__preview-figure"><img src={url} alt={text("alt")} />{text("caption") && <figcaption>{text("caption")}</figcaption>}</figure>
        : <div className="lesson-editor-workspace__preview-placeholder"><span aria-hidden="true">▧</span>{text("alt", "Imagem")} · URL não definida</div>;
    }
    case "video": {
      const url = safeUrl(text("url"));
      return url
        ? <div className="lesson-editor-workspace__preview-placeholder"><span aria-hidden="true">▶</span>{text("caption", "Vídeo")}</div>
        : <div className="lesson-editor-workspace__preview-placeholder"><span aria-hidden="true">▶</span>URL do vídeo não definida</div>;
    }
    case "code":
      return <pre className="lesson-editor-workspace__preview-code"><small>{text("language", "text")}</small><code>{text("code", "Código")}</code></pre>;
    case "quiz":
      return <div className="lesson-editor-workspace__preview-activity"><strong>{text("question", "Pergunta")}</strong><span>◯ Opção A</span><span>◯ Opção B</span></div>;
    case "exercise":
      return <div className="lesson-editor-workspace__preview-activity"><strong>Exercício</strong><p>{text("instruction", "Descreva a atividade")}</p></div>;
    case "callout":
      return <aside className="lesson-editor-workspace__preview-callout"><strong>{text("title", "Destaque")}</strong><p>{text("content", "Escreva uma informação importante.")}</p></aside>;
    case "divider":
      return <hr className="lesson-editor-workspace__preview-divider" />;
    case "embed": {
      const url = safeUrl(text("url"));
      return <div className="lesson-editor-workspace__preview-placeholder"><span aria-hidden="true">↗</span>{text("title", "Incorporação")} {url && <small>{url}</small>}</div>;
    }
  }
}

function LessonEditorPage() {
  const navigate = useNavigate();
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const cachedCourse = courseSlug ? getCourseBySlugStore(courseSlug) : undefined;
  const dirty = useRef(false);

  const [course, setCourse] = useState<Course | undefined>(() => cachedCourse);
  const [modules, setModules] = useState<Module[]>(() => cachedCourse ? prepareModules(cachedCourse) : []);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedCourse);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; clientX: number; clientY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!courseSlug) return;
    let cancelled = false;
    refreshCourses()
      .then(() => {
        if (cancelled) return;
        const loaded = getCourseBySlugStore(courseSlug);
        setCourse(loaded);
        if (loaded && !dirty.current) {
          const prepared = prepareModules(loaded);
          setModules(prepared);
          setSelectedLessonId(prepared[0]?.lessons[0]?.id ?? "");
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        const local = getCourseBySlugStore(courseSlug);
        if (local) {
          setCourse(local);
          if (!dirty.current) {
            const prepared = prepareModules(local);
            setModules(prepared);
            setSelectedLessonId(prepared[0]?.lessons[0]?.id ?? "");
          }
        } else {
          setError(copy.notFound);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [courseSlug, copy.notFound]);

  const lessonEntries = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ module, lesson }))
  );
  const activeEntry = lessonEntries.find((entry) => entry.lesson.id === selectedLessonId) ?? lessonEntries[0] ?? null;
  const activeLesson = activeEntry?.lesson ?? null;
  const activeModule = activeEntry?.module ?? modules[0] ?? null;
  const elements = activeLesson?.elements ?? [];
  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;
  const canvasHeight = Math.max(CANVAS_MIN_HEIGHT, ...elements.map((element) => element.y + element.height + GRID * 2));
  const isDraft = Boolean(course && getDraftCourses().some((draft) => draft.slug === course.slug));

  const commitModules = (next: Module[]) => {
    dirty.current = true;
    setModules(next.map((module, index) => ({
      ...module,
      order: index + 1,
      totalLessons: module.lessons.length,
      totalMinutes: module.lessons.reduce((sum, lesson) => sum + Math.max(0, lesson.estimatedMinutes || 0), 0),
    })));
    setNotice(null);
  };

  const updateLesson = (patch: Partial<Lesson>) => {
    if (!activeEntry) return;
    commitModules(modules.map((module) => module.id !== activeEntry.module.id ? module : {
      ...module,
      lessons: module.lessons.map((lesson) => lesson.id === activeEntry.lesson.id
        ? { ...lesson, ...patch, updatedAt: new Date().toISOString() }
        : lesson),
    }));
  };

  const updateElements = (transform: (current: CanvasElement[]) => CanvasElement[]) => {
    if (!activeLesson) return;
    updateLesson({ elements: transform(activeLesson.elements ?? []) });
  };

  const addElement = (type: CanvasElementType, requestedX?: number, requestedY?: number) => {
    if (!activeLesson) return;
    const size = elementDimensions(type);
    const free = requestedX == null || requestedY == null
      ? findFreePosition(elements, size.width, size.height)
      : { x: requestedX, y: requestedY };
    const x = Math.max(GRID, Math.min(CANVAS_WIDTH - size.width - GRID, snapToGrid(free.x)));
    const y = Math.max(GRID, snapToGrid(free.y));
    const element = createCanvasElement(type, x, y);
    updateElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  };

  const handlePaletteDragStart = (event: ReactDragEvent<HTMLButtonElement>, type: CanvasElementType) => {
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(PALETTE_DRAG_TYPE) as CanvasElementType;
    if (!ELEMENT_TYPES.includes(type)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = snapToGrid(event.clientX - bounds.left - GRID);
    const y = snapToGrid(event.clientY - bounds.top - GRID);
    addElement(type, x, y);
  };

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLElement>, element: CanvasElement) => {
    if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, a")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: element.id,
      clientX: event.clientX,
      clientY: event.clientY,
      originX: element.x,
      originY: element.y,
    };
    setSelectedElementId(element.id);
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !activeLesson) return;
    const element = elements.find((item) => item.id === drag.id);
    if (!element) return;
    const x = Math.max(GRID, Math.min(CANVAS_WIDTH - element.width - GRID, snapToGrid(drag.originX + event.clientX - drag.clientX)));
    const y = Math.max(GRID, snapToGrid(drag.originY + event.clientY - drag.clientY));
    if (x === element.x && y === element.y) return;
    updateElements((current) => current.map((item) => item.id === drag.id ? { ...item, x, y } : item));
  };

  const handleCardPointerUp = () => { dragRef.current = null; };

  const handleAddModule = () => {
    if (!course) return;
    const module = createModule(course, modules.length + 1);
    commitModules([...modules, module]);
    setSelectedLessonId(module.lessons[0]?.id ?? "");
    setSelectedElementId(null);
  };

  const handleAddLesson = () => {
    if (!course || !activeModule) return;
    const nextOrder = activeModule.lessons.length + 1;
    const lesson = createLesson(course, activeModule.id, nextOrder, `Aula ${nextOrder}`);
    commitModules(modules.map((module) => module.id === activeModule.id
      ? { ...module, lessons: [...module.lessons, lesson] }
      : module));
    setSelectedLessonId(lesson.id);
    setSelectedElementId(null);
  };

  const handleRemoveElement = () => {
    if (!selectedElement) return;
    updateElements((current) => current.filter((element) => element.id !== selectedElement.id));
    setSelectedElementId(null);
  };

  const handleDuplicateElement = () => {
    if (!selectedElement) return;
    const position = findFreePosition(elements, selectedElement.width, selectedElement.height);
    const copy = { ...selectedElement, id: createId("card"), x: position.x, y: position.y, props: { ...selectedElement.props } };
    updateElements((current) => [...current, copy]);
    setSelectedElementId(copy.id);
  };

  const patchSelectedProps = (patch: Record<string, unknown>) => {
    if (!selectedElement) return;
    updateElements((current) => current.map((element) => element.id === selectedElement.id
      ? { ...element, props: { ...element.props, ...patch } }
      : element));
  };

  const patchSelectedSize = (key: "width" | "height", value: number) => {
    if (!selectedElement) return;
    const nextValue = Math.max(GRID * 4, Math.min(key === "width" ? CANVAS_WIDTH - GRID * 2 : 2400, snapToGrid(value)));
    updateElements((current) => current.map((element) => element.id === selectedElement.id
      ? { ...element, [key]: nextValue, x: key === "width" ? Math.min(element.x, CANVAS_WIDTH - nextValue - GRID) : element.x }
      : element));
  };

  const handleSave = async (): Promise<boolean> => {
    if (!courseSlug || !course || saving) return false;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const sanitizedModules = modules.map((module, moduleIndex) => ({
        ...module,
        order: moduleIndex + 1,
        lessons: module.lessons.map((lesson, lessonIndex) => {
          const { blocks: discardedLegacyBlocks, ...lessonData } = lesson as Lesson & { blocks?: unknown };
          void discardedLegacyBlocks;
          return {
            ...lessonData,
            elements: Array.isArray(lesson.elements) ? lesson.elements : [],
            order: lessonIndex + 1,
            moduleId: module.id,
          };
        }),
      }));
      const updated = await updateCourse(courseSlug, {
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        tags: course.tags,
        level: course.level,
        language: course.language,
        allowComments: course.allowComments,
        allowFork: course.allowFork,
        modules: sanitizedModules,
      });
      if (!updated) throw new Error("O curso não foi encontrado na store.");
      setCourse(updated);
      setModules(sanitizedModules);
      dirty.current = false;
      setNotice(copy.saved);
      return true;
    } catch (caught) {
      setError((caught as { body?: { error?: string }; message?: string })?.body?.error
        ?? (caught as { message?: string })?.message
        ?? copy.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const draft = course ? getDraftCourses().find((item) => item.slug === course.slug) : undefined;
    if (!draft?.draftId || publishing || saving) return;
    setPublishing(true);
    setError(null);
    try {
      const saved = await handleSave();
      if (!saved) return;
      await publishDraft(draft.draftId);
      navigate("/admin/courses");
    } catch (caught) {
      setError((caught as { body?: { error?: string }; message?: string })?.body?.error
        ?? (caught as { message?: string })?.message
        ?? copy.saveError);
    } finally {
      setPublishing(false);
    }
  };

  const handleLessonChange = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setSelectedElementId(null);
  };

  if (loading) {
    return <main className="lesson-editor-workspace lesson-editor-workspace--status"><p role="status">{copy.loading}</p></main>;
  }

  if (!course || error === copy.notFound) {
    return (
      <main className="lesson-editor-workspace lesson-editor-workspace--status">
        <p role="alert">{error ?? copy.notFound}</p>
        <Link to="/admin/courses" className="lesson-editor-workspace__primary">{copy.back}</Link>
      </main>
    );
  }

  return (
    <main className="lesson-editor-workspace">
      <header className="lesson-editor-workspace__toolbar">
        <div className="lesson-editor-workspace__brand">
          <Link to="/admin/courses" className="lesson-editor-workspace__back" aria-label={copy.back} title={copy.back}>←</Link>
          <div className="lesson-editor-workspace__breadcrumbs">
            <span>{copy.course}</span>
            <strong title={course.title}>{course.title}</strong>
          </div>
        </div>
        <div className="lesson-editor-workspace__toolbar-actions">
          {isDraft && <button type="button" className="lesson-editor-workspace__publish" onClick={() => void handlePublish()} disabled={publishing || saving}>{publishing ? copy.publishing : copy.publish}</button>}
          <button type="button" className="lesson-editor-workspace__save" onClick={() => void handleSave()} disabled={saving || publishing}>{saving ? copy.saving : copy.save}</button>
        </div>
      </header>

      <div className="lesson-editor-workspace__subtoolbar">
        <label className="lesson-editor-workspace__lesson-picker">
          <span>{copy.lesson}</span>
          <select value={activeLesson?.id ?? ""} onChange={(event) => handleLessonChange(event.target.value)}>
            {modules.map((module) => (
              <optgroup key={module.id} label={module.title}>
                {module.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="button" className="lesson-editor-workspace__secondary" onClick={handleAddModule}>{copy.addModule}</button>
        <button type="button" className="lesson-editor-workspace__secondary" onClick={handleAddLesson} disabled={!activeModule}>{copy.addLesson}</button>
        <span className="lesson-editor-workspace__grid-scale">Grid · 24 px</span>
      </div>

      <div className="lesson-editor-workspace__body">
        <aside className="lesson-editor-workspace__palette" aria-label={copy.palette}>
          <div className="lesson-editor-workspace__panel-heading">
            <h2>{copy.palette}</h2>
            <p>{copy.paletteHint}</p>
          </div>
          <div className="lesson-editor-workspace__palette-list">
            {ELEMENT_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                className="lesson-editor-workspace__palette-card"
                draggable
                onDragStart={(event) => handlePaletteDragStart(event, type)}
                onClick={() => addElement(type)}
              >
                <span className="lesson-editor-workspace__palette-symbol" aria-hidden="true">⠿</span>
                <span className="lesson-editor-workspace__palette-copy">
                  <strong>{copy.cardNames[type]}</strong>
                  <small>{type === "heading" ? "H" : type === "paragraph" ? "Aa" : type === "image" ? "▧" : type === "video" ? "▶" : type === "code" ? "</>" : type === "quiz" ? "?" : type === "divider" ? "—" : "＋"}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="lesson-editor-workspace__stage" aria-label={copy.canvas}>
          <div className="lesson-editor-workspace__stage-heading">
            <div>
              <h2>{activeLesson?.title ?? copy.lesson}</h2>
              <p>{copy.canvasHint}</p>
            </div>
            <span>{elements.length} cards</span>
          </div>
          <div className="lesson-editor-workspace__canvas-scroll">
            {activeLesson ? (
              <div
                className="lesson-editor-workspace__canvas"
                style={{ height: canvasHeight }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
              >
                {elements.length === 0 && <div className="lesson-editor-workspace__empty-canvas"><span>＋</span><strong>{copy.emptyCanvas}</strong><p>{copy.dropHere}</p></div>}
                {elements.map((element) => (
                  <article
                    key={element.id}
                    className={`lesson-editor-workspace__element${element.id === selectedElementId ? " lesson-editor-workspace__element--selected" : ""}`}
                    style={{ left: element.x, top: element.y, width: element.width, height: element.height } as CSSProperties}
                    role="button"
                    tabIndex={0}
                    aria-pressed={element.id === selectedElementId}
                    onClick={() => setSelectedElementId(element.id)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedElementId(element.id); } }}
                    onPointerDown={(event) => handleCardPointerDown(event, element)}
                    title={copy.cardNames[element.type]}
                  >
                    <div className="lesson-editor-workspace__element-toolbar">
                      <span>{copy.cardNames[element.type]}</span>
                      <span aria-hidden="true">⠿</span>
                    </div>
                    <div className="lesson-editor-workspace__element-content">
                      <ElementPreview element={element} />
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="lesson-editor-workspace__empty-canvas">{copy.notFound}</p>}
          </div>
        </section>

        <aside className="lesson-editor-workspace__inspector" aria-label={copy.inspector}>
          <div className="lesson-editor-workspace__panel-heading">
            <h2>{copy.inspector}</h2>
            <p>{selectedElement ? copy.cardNames[selectedElement.type] : copy.inspectorHint}</p>
          </div>

          {selectedElement ? (
            <div className="lesson-editor-workspace__inspector-form">
              {["heading", "paragraph"].includes(selectedElement.type) && (
                <label><span>{copy.content}</span><textarea rows={5} value={getText(selectedElement, "content")} onChange={(event) => patchSelectedProps({ content: event.target.value })} /></label>
              )}
              {selectedElement.type === "list" && (
                <>
                  <label><span>{copy.content}</span><textarea rows={6} value={Array.isArray(selectedElement.props.items) ? selectedElement.props.items.map(String).join("\n") : ""} onChange={(event) => patchSelectedProps({ items: event.target.value.split("\n") })} /></label>
                  <label className="lesson-editor-workspace__checkbox"><input type="checkbox" checked={Boolean(selectedElement.props.ordered)} onChange={(event) => patchSelectedProps({ ordered: event.target.checked })} /><span>{copy.ordered}</span></label>
                </>
              )}
              {selectedElement.type === "image" && (
                <>
                  <label><span>{copy.url}</span><input value={getText(selectedElement, "url")} onChange={(event) => patchSelectedProps({ url: event.target.value })} placeholder="https://…" /></label>
                  <label><span>{copy.alt}</span><input value={getText(selectedElement, "alt")} onChange={(event) => patchSelectedProps({ alt: event.target.value })} /></label>
                  <label><span>{copy.caption}</span><input value={getText(selectedElement, "caption")} onChange={(event) => patchSelectedProps({ caption: event.target.value })} /></label>
                </>
              )}
              {selectedElement.type === "video" && (
                <>
                  <label><span>{copy.url}</span><input value={getText(selectedElement, "url")} onChange={(event) => patchSelectedProps({ url: event.target.value })} placeholder="https://…" /></label>
                  <label><span>{copy.caption}</span><input value={getText(selectedElement, "caption")} onChange={(event) => patchSelectedProps({ caption: event.target.value })} /></label>
                </>
              )}
              {selectedElement.type === "code" && (
                <>
                  <label><span>{copy.language}</span><input value={getText(selectedElement, "language", "text")} onChange={(event) => patchSelectedProps({ language: event.target.value })} /></label>
                  <label><span>{copy.code}</span><textarea rows={7} value={getText(selectedElement, "code")} onChange={(event) => patchSelectedProps({ code: event.target.value })} /></label>
                </>
              )}
              {selectedElement.type === "quiz" && (
                <>
                  <label><span>{copy.question}</span><textarea rows={3} value={getText(selectedElement, "question")} onChange={(event) => patchSelectedProps({ question: event.target.value })} /></label>
                  <label><span>{copy.options}</span><textarea rows={4} value={Array.isArray(selectedElement.props.options) ? selectedElement.props.options.map(String).join("\n") : ""} onChange={(event) => patchSelectedProps({ options: event.target.value.split("\n") })} /></label>
                  <label><span>{copy.correctAnswer}</span><input type="number" min={0} value={Number(selectedElement.props.correctIndex ?? 0)} onChange={(event) => patchSelectedProps({ correctIndex: Math.max(0, Number(event.target.value) || 0) })} /></label>
                </>
              )}
              {selectedElement.type === "exercise" && (
                <>
                  <label><span>{copy.instruction}</span><textarea rows={3} value={getText(selectedElement, "instruction")} onChange={(event) => patchSelectedProps({ instruction: event.target.value })} /></label>
                  <label><span>{copy.starterCode}</span><textarea rows={5} value={getText(selectedElement, "starterCode")} onChange={(event) => patchSelectedProps({ starterCode: event.target.value })} /></label>
                  <label><span>{copy.solution}</span><textarea rows={4} value={getText(selectedElement, "solution")} onChange={(event) => patchSelectedProps({ solution: event.target.value })} /></label>
                </>
              )}
              {selectedElement.type === "callout" && (
                <>
                  <label><span>{copy.title}</span><input value={getText(selectedElement, "title")} onChange={(event) => patchSelectedProps({ title: event.target.value })} /></label>
                  <label><span>{copy.content}</span><textarea rows={4} value={getText(selectedElement, "content")} onChange={(event) => patchSelectedProps({ content: event.target.value })} /></label>
                </>
              )}
              {selectedElement.type === "embed" && (
                <>
                  <label><span>{copy.title}</span><input value={getText(selectedElement, "title")} onChange={(event) => patchSelectedProps({ title: event.target.value })} /></label>
                  <label><span>{copy.url}</span><input value={getText(selectedElement, "url")} onChange={(event) => patchSelectedProps({ url: event.target.value })} placeholder="https://…" /></label>
                </>
              )}
              <div className="lesson-editor-workspace__size-fields">
                <label><span>{copy.width}</span><input type="number" step={GRID} min={GRID * 4} max={CANVAS_WIDTH - GRID * 2} value={selectedElement.width} onChange={(event) => patchSelectedSize("width", Number(event.target.value))} /></label>
                <label><span>{copy.height}</span><input type="number" step={GRID} min={GRID * 4} max={2400} value={selectedElement.height} onChange={(event) => patchSelectedSize("height", Number(event.target.value))} /></label>
              </div>
              <div className="lesson-editor-workspace__element-actions">
                <button type="button" className="lesson-editor-workspace__secondary" onClick={handleDuplicateElement}>{copy.duplicate}</button>
                <button type="button" className="lesson-editor-workspace__danger" onClick={handleRemoveElement}>{copy.remove}</button>
              </div>
            </div>
          ) : activeLesson ? (
            <div className="lesson-editor-workspace__lesson-properties">
              <label><span>{copy.lessonName}</span><input value={activeLesson.title} maxLength={120} onChange={(event) => updateLesson({ title: event.target.value })} /></label>
              <label><span>{copy.content}</span><textarea rows={4} value={activeLesson.description ?? ""} onChange={(event) => updateLesson({ description: event.target.value })} /></label>
              <label><span>{copy.duration}</span><input type="number" min={1} max={600} value={activeLesson.estimatedMinutes} onChange={(event) => updateLesson({ estimatedMinutes: Math.max(1, Math.min(600, Number(event.target.value) || 1)) })} /></label>
            </div>
          ) : <p>{copy.inspectorHint}</p>}
          {notice && <p className="lesson-editor-workspace__notice" role="status">{notice}</p>}
          {error && <p className="lesson-editor-workspace__error" role="alert">{error}</p>}
        </aside>
      </div>
    </main>
  );
}

export default LessonEditorPage;
