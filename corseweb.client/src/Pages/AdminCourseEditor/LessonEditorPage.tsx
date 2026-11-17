import { useEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import type { CanvasConnection, CanvasNode, CanvasNodeLayout, CanvasNodeStyle, CanvasNodeType, Course, Lesson, LessonPresentation, Module } from "../../types/course";
import { canAssignNodeParent, CONTAINER_CONTENT_INSET, findContainerAtPosition, findContainerDropTarget, fitsInsideContainer, getContainerContentBounds, getEligibleContainerParents, getNodeDescendantIds, getNodeHierarchyDepth, isContainerNode, MAX_NODE_HIERARCHY_DEPTH, validateNodeHierarchy } from "./nodeHierarchy";
import { LessonContentTree } from "../AppLessonPage/LessonContentRenderer";
import { getLessonPresentationStyle } from "../AppLessonPage/lessonPresentation";
import { getCourseBySlugStore, getDraftCourses, publishDraft, refreshCourses, updateCourse } from "../../store/courseStore";
import "./LessonEditorPage.scss";

const GRID = 20;
const CANVAS_WIDTH = 1200;
const CANVAS_MIN_HEIGHT = 900;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const PALETTE_DRAG_TYPE = "application/x-corseweb-canvas-node";

const NODE_TYPES: CanvasNodeType[] = [
  "start", "heading", "paragraph", "list", "image", "video", "code", "quiz", "exercise", "callout", "divider", "embed", "certificate", "container",
];

interface PendingConnection {
  sourceNode: string;
  sourcePort: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CanvasCamera {
  x: number;
  y: number;
  zoom: number;
}

interface CameraDrag {
  pointerId: number;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
}

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
  unsupportedSchema: string;
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
  cameraControls: string;
  zoomOut: string;
  zoomIn: string;
  fitView: string;
  resetView: string;
  cardsTab: string;
  canvasTab: string;
  propertiesTab: string;
  preview: string;
  backToCanvas: string;
  previewMobile: string;
  previewTablet: string;
  previewDesktop: string;
  presentation: string;
  contentWidth: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
  textAlign: string;
  parentContainer: string;
  outsideContainer: string;
  hierarchy: string;
  addChild: string;
  containerHint: string;
  containerFull: string;
  invalidHierarchy: string;
  cardNames: Record<CanvasNodeType, string>;
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
    unsupportedSchema: "Este curso usa uma versão de conteúdo mais recente que este editor. Atualize o CorseWeb antes de editá-lo.",
    palette: "Cards",
    paletteHint: "Arraste um card para o canvas ou toque para adicionar.",
    canvas: "Canvas",
    canvasHint: "Arraste cards e conecte a saída inferior de um nó à entrada superior de outro. Tudo encaixa na grade.",
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
    cameraControls: "Controles da câmera do canvas",
    zoomOut: "Diminuir zoom",
    zoomIn: "Aumentar zoom",
    fitView: "Ajustar conteúdo à tela",
    resetView: "Centralizar canvas em 100%",
    cardsTab: "Cards",
    canvasTab: "Canvas",
    propertiesTab: "Propriedades",
    preview: "Prévia",
    backToCanvas: "Voltar ao canvas",
    previewMobile: "Celular",
    previewTablet: "Tablet",
    previewDesktop: "Desktop",
    presentation: "Apresentação",
    contentWidth: "Largura do conteúdo",
    textColor: "Cor do texto",
    backgroundColor: "Cor de fundo",
    fontFamily: "Fonte",
    fontSize: "Tamanho da fonte (px)",
    textAlign: "Alinhamento do texto",
    parentContainer: "Container pai",
    outsideContainer: "Fora de container",
    hierarchy: "Hierarquia",
    addChild: "Adicionar elemento filho",
    containerHint: "Este container agrupa outros cards. Selecione Cards para inserir um filho ou arraste um card para esta área.",
    containerFull: "Não há espaço interno suficiente. Aumente o tamanho do container ou reorganize seus filhos.",
    invalidHierarchy: "Esta alteração criaria uma hierarquia inválida.",
    cardNames: {
      heading: "Título", paragraph: "Texto", list: "Lista", image: "Imagem", video: "Vídeo",
      code: "Código", quiz: "Quiz", exercise: "Exercício", callout: "Destaque", divider: "Divisor", embed: "Incorporação", start: "Início", certificate: "Certificado", container: "Container",
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
    unsupportedSchema: "This course uses a newer content version. Update CorseWeb before editing it.",
    palette: "Cards",
    paletteHint: "Drag a card onto the canvas or click to add it.",
    canvas: "Canvas",
    canvasHint: "Drag cards and connect a node's bottom output to another node's top input. Everything snaps to the grid.",
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
    cameraControls: "Canvas camera controls",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    fitView: "Fit content to view",
    resetView: "Center canvas at 100%",
    cardsTab: "Cards",
    canvasTab: "Canvas",
    propertiesTab: "Properties",
    preview: "Preview",
    backToCanvas: "Back to canvas",
    previewMobile: "Phone",
    previewTablet: "Tablet",
    previewDesktop: "Desktop",
    presentation: "Presentation",
    contentWidth: "Content width",
    textColor: "Text color",
    backgroundColor: "Background color",
    fontFamily: "Font",
    fontSize: "Font size (px)",
    textAlign: "Text alignment",
    parentContainer: "Parent container",
    outsideContainer: "Outside a container",
    hierarchy: "Hierarchy",
    addChild: "Add child element",
    containerHint: "This container groups other cards. Open Cards to add a child or drag a card into this area.",
    containerFull: "There is not enough space inside this container. Resize it or rearrange its children.",
    invalidHierarchy: "This change would create an invalid hierarchy.",
    cardNames: {
      heading: "Heading", paragraph: "Text", list: "List", image: "Image", video: "Video",
      code: "Code", quiz: "Quiz", exercise: "Exercise", callout: "Callout", divider: "Divider", embed: "Embed", start: "Start", certificate: "Certificate", container: "Container",
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
    unsupportedSchema: "Este curso usa una versión de contenido más reciente. Actualiza CorseWeb antes de editarlo.",
    palette: "Tarjetas",
    paletteHint: "Arrastra una tarjeta al lienzo o pulsa para añadirla.",
    canvas: "Lienzo",
    canvasHint: "Arrastra tarjetas y conecta la salida inferior de un nodo a la entrada superior de otro. Todo se ajusta a la cuadrícula.",
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
    cameraControls: "Controles de cámara del lienzo",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    fitView: "Ajustar contenido a la pantalla",
    resetView: "Centrar lienzo al 100%",
    cardsTab: "Tarjetas",
    canvasTab: "Lienzo",
    propertiesTab: "Propiedades",
    preview: "Vista previa",
    backToCanvas: "Volver al lienzo",
    previewMobile: "Móvil",
    previewTablet: "Tableta",
    previewDesktop: "Escritorio",
    presentation: "Presentación",
    contentWidth: "Ancho del contenido",
    textColor: "Color del texto",
    backgroundColor: "Color de fondo",
    fontFamily: "Fuente",
    fontSize: "Tamaño de fuente (px)",
    textAlign: "Alineación del texto",
    parentContainer: "Contenedor padre",
    outsideContainer: "Fuera de un contenedor",
    hierarchy: "Jerarquía",
    addChild: "Añadir elemento hijo",
    containerHint: "Este contenedor agrupa otras tarjetas. Abre Tarjetas para añadir un hijo o arrastra una tarjeta a esta área.",
    containerFull: "No hay suficiente espacio dentro del contenedor. Auméntalo o reorganiza sus elementos.",
    invalidHierarchy: "Este cambio crearía una jerarquía no válida.",
    cardNames: {
      heading: "Título", paragraph: "Texto", list: "Lista", image: "Imagen", video: "Vídeo",
      code: "Código", quiz: "Cuestionario", exercise: "Ejercicio", callout: "Destacado", divider: "Separador", embed: "Incrustación", start: "Inicio", certificate: "Certificado", container: "Contenedor",
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

function nextSiblingOrder(nodes: CanvasNode[], parentId: string | null, excludedIds = new Set<string>()): number {
  const siblingOrders = nodes
    .filter((node) => !excludedIds.has(node.id) && (node.parentId ?? null) === parentId)
    .map((node) => typeof node.order === "number" && Number.isFinite(node.order) ? node.order : 0);
  return Math.max(0, ...siblingOrders) + 1;
}

function maxNodeX(width: number): number {
  return Math.max(GRID, Math.floor((CANVAS_WIDTH - width - GRID) / GRID) * GRID);
}

function getText(node: CanvasNode, key: string, fallback = ""): string {
  const value = node.props?.[key];
  return typeof value === "string" ? value : fallback;
}

function nodeDimensions(type: CanvasNodeType, parent?: CanvasNode, parentDepth = 0): { width: number; height: number } {
  if (type === "container") {
    if (!parent) return { width: 520, height: 420 };
    const preferred = parentDepth === 1
      ? { width: 360, height: 300 }
      : { width: 220, height: 220 };
    const bounds = getContainerContentBounds(parent);
    return {
      width: Math.max(160, Math.min(preferred.width, bounds.right - bounds.left)),
      height: Math.max(128, Math.min(preferred.height, bounds.bottom - bounds.top)),
    };
  }

  let dimensions: { width: number; height: number };
  switch (type) {
    case "divider": dimensions = { width: 600, height: 72 }; break;
    case "quiz":
    case "exercise": dimensions = { width: 384, height: 216 }; break;
    case "image":
    case "video": dimensions = { width: 288, height: 216 }; break;
    case "list": dimensions = { width: 288, height: 168 }; break;
    case "code":
    case "embed": dimensions = { width: 336, height: 192 }; break;
    case "start":
    case "certificate": dimensions = { width: 288, height: 120 }; break;
    case "heading": dimensions = { width: 288, height: 96 }; break;
    case "callout": dimensions = { width: 288, height: 144 }; break;
    default: dimensions = { width: 288, height: 144 }; break;
  }

  if (!parent) return dimensions;
  const bounds = getContainerContentBounds(parent);
  return {
    width: Math.max(80, Math.min(dimensions.width, bounds.right - bounds.left)),
    height: Math.max(60, Math.min(dimensions.height, bounds.bottom - bounds.top)),
  };
}

function defaultProps(type: CanvasNodeType): Record<string, unknown> {
  switch (type) {
    case "start": return { title: "Início", content: "Ponto inicial do fluxo." };
    case "certificate": return { title: "Certificado", content: "Certificado de conclusão." };
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
    case "container": return { title: "Novo container", content: "Agrupe elementos relacionados nesta área." };
  }
}

function defaultPorts(type: CanvasNodeType): Pick<CanvasNode, "inputs" | "outputs"> {
  const inputs = type === "start" ? [] : [{ id: "enter", label: "Entrada" }];
  const outputs = type === "certificate" ? [] : type === "quiz"
    ? [{ id: "success", label: "Aprovado" }, { id: "failed", label: "Reprovado" }]
    : [{ id: "complete", label: type === "start" ? "Iniciar" : "Concluído" }];
  return { inputs, outputs };
}

function getPortAnchor(node: CanvasNode, direction: "input" | "output", portId: string): { x: number; y: number } {
  const ports = direction === "input" ? node.inputs : node.outputs;
  const foundIndex = ports.findIndex((port) => port.id === portId);
  const index = Math.max(0, foundIndex);
  return {
    x: node.x + ((index + 1) / (ports.length + 1)) * node.width,
    y: direction === "input" ? node.y : node.y + node.height,
  };
}

function connectionPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const horizontalDistance = Math.abs(dx);
  const verticalDistance = Math.abs(dy);
  const handle = Math.min(180, Math.max(36, verticalDistance * 0.42 + horizontalDistance * 0.08));
  const horizontalHandle = Math.sign(dx) * Math.min(72, horizontalDistance * 0.12);

  // Output ports leave the bottom of a node and input ports approach its top.
  // The control points follow those tangents and scale with the actual gap.
  let control1 = { x: from.x + horizontalHandle * 0.5, y: from.y + handle };
  let control2 = { x: to.x - horizontalHandle * 0.5, y: to.y - handle };

  // When the destination is above the source, route the curve around the
  // side facing the destination instead of forcing a fixed left-to-right bend.
  if (dy < 0) {
    const side = dx >= 0 ? 1 : -1;
    const lateralHandle = Math.min(180, Math.max(48, horizontalDistance * 0.22 + verticalDistance * 0.12));
    control1 = { x: from.x + side * lateralHandle, y: from.y + handle };
    control2 = { x: to.x + side * lateralHandle, y: to.y - handle };
  }

  return `M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`;
}

function overlaps(a: Pick<CanvasNode, "x" | "y" | "width" | "height">, b: Pick<CanvasNode, "x" | "y" | "width" | "height">): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function findFreePosition(nodes: CanvasNode[], width: number, height: number): { x: number; y: number } {
  const possibleX = [...new Set([GRID, GRID * 14, GRID * 27, maxNodeX(width)])];
  for (let y = GRID; y < 12000; y += GRID) {
    for (const x of possibleX) {
      const candidate = { x, y, width, height };
      if (x + width <= CANVAS_WIDTH - GRID && !nodes.some((node) => overlaps(candidate, node))) {
        return { x, y };
      }
    }
  }
  return { x: GRID, y: Math.max(GRID, ...nodes.map((node) => snapToGrid(node.y + node.height + GRID))) };
}

function createCanvasNode(
  type: CanvasNodeType,
  x: number,
  y: number,
  order = 1,
  parentId: string | null = null,
  dimensions?: { width: number; height: number }
): CanvasNode {
  const size = dimensions ?? nodeDimensions(type);
  return {
    id: createId("card"),
    type,
    x,
    y,
    width: size.width,
    height: size.height,
    props: defaultProps(type),
    order,
    parentId,
    layout: { width: "auto", align: "start" },
    style: {},
    ...defaultPorts(type),
  };
}

function findFreePositionInContainer(nodes: CanvasNode[], container: CanvasNode, width: number, height: number): { x: number; y: number } | null {
  const bounds = getContainerContentBounds(container);
  if (width > bounds.right - bounds.left || height > bounds.bottom - bounds.top) return null;
  const siblings = nodes.filter((node) => node.parentId === container.id);
  for (let y = snapToGrid(bounds.top); y + height <= bounds.bottom; y += GRID) {
    for (let x = snapToGrid(bounds.left); x + width <= bounds.right; x += GRID) {
      const candidate = { x, y, width, height };
      if (!siblings.some((node) => overlaps(candidate, node))) return { x, y };
    }
  }
  return null;
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
    contentSchemaVersion: 2,
    presentation: { contentWidth: "medium", fontFamily: "sans", fontSize: 16, textAlign: "left", padding: 24 },
    nodes: [],
    connections: [],
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


function hasUnsupportedContentSchema(course?: Course): boolean {
  return Boolean(course?.modules?.some((module) =>
    module.lessons?.some((lesson) => Number(lesson.contentSchemaVersion ?? 1) > 2)
  ));
}

function prepareModules(course: Course): Module[] {
  const received: Module[] = (course.modules ?? []).map((module, moduleIndex) => ({
    ...module,
    order: moduleIndex + 1,
    lessons: (module.lessons ?? []).map((lesson, lessonIndex) => {
      // This is the new contract: legacy "blocks" are not translated into canvas nodes.
      const {
        blocks: discardedLegacyBlocks,
        elements: discardedLegacyElements,
        ...lessonWithoutLegacyContent
      } = lesson as Lesson & { blocks?: unknown; elements?: unknown };
      void discardedLegacyBlocks;
      void discardedLegacyElements;
      const legacyReadingOrder = new Map(
        [...(Array.isArray(lesson.nodes) ? lesson.nodes : [])]
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .map((node, index) => [node.id, index + 1] as const)
      );
      const nodes = Array.isArray(lesson.nodes) ? lesson.nodes.map((node) => ({
        ...node,
        order: typeof node.order === "number" && Number.isFinite(node.order) ? node.order : legacyReadingOrder.get(node.id) ?? 1,
        layout: node.layout ?? { width: "auto" as const, align: "start" as const },
        style: node.style ?? {},
        inputs: Array.isArray(node.inputs) ? node.inputs : defaultPorts(node.type).inputs,
        outputs: Array.isArray(node.outputs) ? node.outputs : defaultPorts(node.type).outputs,
      })) : [];
      return {
        ...lessonWithoutLegacyContent,
        contentSchemaVersion: 2,
        presentation: lesson.presentation ?? { contentWidth: "medium", fontFamily: "sans", fontSize: 16, textAlign: "left", padding: 24 },
        nodes,
        connections: Array.isArray(lesson.connections) ? lesson.connections : [],
        order: lessonIndex + 1,
        moduleId: module.id,
      };
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

function NodePreview({ node }: { node: CanvasNode }) {
  const props = node.props ?? {};
  const text = (key: string, fallback = "") => getText(node, key, fallback);
  const safeUrl = (value: string) => {
    if (!value.trim()) return "";
    try {
      const url = new URL(value.trim(), window.location.origin);
      return url.protocol === "https:" || url.origin === window.location.origin ? url.href : "";
    } catch {
      return "";
    }
  };

  switch (node.type) {
    case "start":
      return <div className="lesson-editor-workspace__preview-flow"><strong>{text("title", "Início")}</strong><p>{text("content", "Ponto inicial do fluxo.")}</p></div>;
    case "container":
      return <div className="lesson-editor-workspace__preview-container"><strong>{text("title", "Novo container")}</strong><p>{text("content", "Agrupe elementos relacionados nesta área.")}</p><small>Área para cards filhos</small></div>;
    case "certificate":
      return <div className="lesson-editor-workspace__preview-flow"><strong>{text("title", "Certificado")}</strong><p>{text("content", "Certificado de conclusão.")}</p></div>;
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

type WorkspacePanel = "cards" | "canvas" | "properties" | "preview";
type PreviewDevice = "mobile" | "tablet" | "desktop";


function validateLessonModules(modules: Module[]): string | null {
  for (const module of modules) {
    for (const lesson of module.lessons ?? []) {
      const nodes = lesson.nodes ?? [];
      if (nodes.length > 500) return `A aula "${lesson.title}" excede o limite de 500 elementos.`;
      const hierarchy = validateNodeHierarchy(nodes);
      if (!hierarchy.valid) return `A aula "${lesson.title}": ${hierarchy.error ?? "hierarquia inválida"}`;
      const byId = new Map<string, CanvasNode>();
      for (const node of nodes) {
        if (!node.id || byId.has(node.id)) return `A aula "${lesson.title}" possui identificadores de elementos duplicados.`;
        byId.set(node.id, node);
        const invalidContainerSize = node.type === "container" && (node.width < 160 || node.height < 128);
        if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width < 80 || node.height < 60 || node.width > 5000 || node.height > 5000 || invalidContainerSize) {
          return `O elemento "${node.id}" possui posição ou dimensões inválidas.`;
        }
      }
      const targets = new Set<string>();
      for (const connection of lesson.connections ?? []) {
        const source = byId.get(connection.sourceNode);
        const target = byId.get(connection.targetNode);
        if (!source || !target) return `A aula "${lesson.title}" possui uma conexão apontando para um elemento inexistente.`;
        if (!source.outputs.some((port) => port.id === connection.sourcePort) || !target.inputs.some((port) => port.id === connection.targetPort)) {
          return `A aula "${lesson.title}" possui uma conexão com porta inválida.`;
        }
        const targetKey = `${connection.targetNode}:${connection.targetPort}`;
        if (targets.has(targetKey)) return `A aula "${lesson.title}" conecta mais de uma origem à mesma entrada.`;
        targets.add(targetKey);
      }
    }
  }
  return null;
}

function LessonEditorPage() {
  const navigate = useNavigate();
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const cachedCourse = courseSlug ? getCourseBySlugStore(courseSlug) : undefined;
  const dirty = useRef(false);

  const [course, setCourse] = useState<Course | undefined>(() => cachedCourse);
  const [modules, setModules] = useState<Module[]>(() => cachedCourse && !hasUnsupportedContentSchema(cachedCourse) ? prepareModules(cachedCourse) : []);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [loading, setLoading] = useState(!cachedCourse);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ clientX: number; clientY: number; anchorId: string; allowReparent: boolean; moved: boolean; origins: Array<{ id: string; x: number; y: number; width: number }> } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [camera, setCamera] = useState<CanvasCamera>({ x: 0, y: 0, zoom: 0.75 });
  const cameraRef = useRef<CanvasCamera>(camera);
  const cameraDragRef = useRef<CameraDrag | null>(null);
  const spacePressedRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<WorkspacePanel>("canvas");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("mobile");
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!courseSlug) return;
    let cancelled = false;
    refreshCourses()
      .then(() => {
        if (cancelled) return;
        const loaded = getCourseBySlugStore(courseSlug);
        setCourse(loaded);
        if (hasUnsupportedContentSchema(loaded)) {
          setError(copy.unsupportedSchema);
          setLoading(false);
          return;
        }
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
          if (hasUnsupportedContentSchema(local)) {
            setError(copy.unsupportedSchema);
            setLoading(false);
            return;
          }
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
  }, [courseSlug, copy.notFound, copy.unsupportedSchema]);

  const lessonEntries = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ module, lesson }))
  );
  const activeEntry = lessonEntries.find((entry) => entry.lesson.id === selectedLessonId) ?? lessonEntries[0] ?? null;
  const activeLesson = activeEntry?.lesson ?? null;
  const activeModule = activeEntry?.module ?? modules[0] ?? null;
  const nodes = activeLesson?.nodes ?? [];
  const connections = activeLesson?.connections ?? [];
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const canvasHeight = Math.max(CANVAS_MIN_HEIGHT, ...nodes.map((node) => node.y + node.height + GRID * 2));
  const isDraft = Boolean(course && getDraftCourses().some((draft) => draft.slug === course.slug));

  const setCameraPosition = (next: CanvasCamera) => {
    cameraRef.current = next;
    setCamera(next);
  };

  const getViewportMetrics = () => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    const styles = window.getComputedStyle(viewport);
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    return {
      viewport,
      rect,
      paddingLeft,
      paddingTop,
      contentWidth: Math.max(1, viewport.clientWidth - paddingLeft - paddingRight),
      contentHeight: Math.max(1, viewport.clientHeight - paddingTop - paddingBottom),
    };
  };

  const canvasPoint = (clientX: number, clientY: number) => {
    const metrics = getViewportMetrics();
    const current = cameraRef.current;
    if (!metrics) return { x: 0, y: 0 };
    return {
      x: (clientX - metrics.rect.left - metrics.viewport.clientLeft - metrics.paddingLeft - current.x) / current.zoom,
      y: (clientY - metrics.rect.top - metrics.viewport.clientTop - metrics.paddingTop - current.y) / current.zoom,
    };
  };

  const zoomAt = (requestedZoom: number, clientX?: number, clientY?: number) => {
    const metrics = getViewportMetrics();
    if (!metrics) return;
    const current = cameraRef.current;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requestedZoom));
    const pointX = clientX == null
      ? metrics.contentWidth / 2
      : clientX - metrics.rect.left - metrics.viewport.clientLeft - metrics.paddingLeft;
    const pointY = clientY == null
      ? metrics.contentHeight / 2
      : clientY - metrics.rect.top - metrics.viewport.clientTop - metrics.paddingTop;
    const worldX = (pointX - current.x) / current.zoom;
    const worldY = (pointY - current.y) / current.zoom;
    setCameraPosition({
      x: pointX - worldX * zoom,
      y: pointY - worldY * zoom,
      zoom,
    });
  };

  const zoomBy = (direction: -1 | 1) => {
    const current = cameraRef.current;
    zoomAt(current.zoom + direction * ZOOM_STEP);
  };

  const fitCamera = () => {
    const metrics = getViewportMetrics();
    if (!metrics) return;
    const gap = 40;
    const minX = nodes.length ? Math.min(...nodes.map((node) => node.x)) : 0;
    const minY = nodes.length ? Math.min(...nodes.map((node) => node.y)) : 0;
    const maxX = nodes.length ? Math.max(...nodes.map((node) => node.x + node.width)) : CANVAS_WIDTH;
    const maxY = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) : CANVAS_MIN_HEIGHT;
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (metrics.contentWidth - gap * 2) / contentWidth, (metrics.contentHeight - gap * 2) / contentHeight));
    setCameraPosition({
      x: (metrics.contentWidth - contentWidth * zoom) / 2 - minX * zoom,
      y: (metrics.contentHeight - contentHeight * zoom) / 2 - minY * zoom,
      zoom,
    });
  };

  const resetCamera = () => {
    const metrics = getViewportMetrics();
    if (!metrics) return;
    const zoom = 1;
    setCameraPosition({
      x: (metrics.contentWidth - CANVAS_WIDTH) / 2,
      y: (metrics.contentHeight - canvasHeight) / 2,
      zoom,
    });
  };

  const handleCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const current = cameraRef.current;
      zoomAt(current.zoom * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
      return;
    }
    const current = cameraRef.current;
    setCameraPosition({
      ...current,
      x: current.x - (event.shiftKey ? event.deltaY : event.deltaX),
      y: current.y - (event.shiftKey ? 0 : event.deltaY),
    });
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isEditableTarget(event.target)) return;
      spacePressedRef.current = true;
      event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spacePressedRef.current = false;
    };
    const handleBlur = () => {
      spacePressedRef.current = false;
      cameraDragRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    // Frame the active lesson on open/switch, while allowing the user to pan freely afterwards.
    const frame = window.requestAnimationFrame(() => fitCamera());
    return () => window.cancelAnimationFrame(frame);
  // Intentionally frame only when the lesson changes, not whenever node coordinates change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

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

  const updateNodes = (transform: (current: CanvasNode[]) => CanvasNode[]) => {
    if (!activeLesson) return;
    updateLesson({ nodes: transform(activeLesson.nodes ?? []) });
  };

  const reparentNode = (nodeId: string, requestedParentId: string | null) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const nextParentId = requestedParentId || null;
    if ((node.parentId ?? null) === nextParentId) return;

    const hierarchy = canAssignNodeParent(nodes, nodeId, nextParentId);
    if (!hierarchy.valid) {
      setError(hierarchy.error ?? copy.invalidHierarchy);
      return;
    }

    let nextX = node.x;
    let nextY = node.y;
    if (nextParentId) {
      const parent = nodes.find((item) => item.id === nextParentId);
      if (!isContainerNode(parent)) {
        setError(copy.invalidHierarchy);
        return;
      }
      if (!fitsInsideContainer(node, parent)) {
        const free = findFreePositionInContainer(nodes, parent, node.width, node.height);
        if (!free) {
          setError(copy.containerFull);
          return;
        }
        nextX = free.x;
        nextY = free.y;
      }
    }

    const deltaX = nextX - node.x;
    const deltaY = nextY - node.y;
    const descendants = getNodeDescendantIds(nodes, nodeId);
    const subtreeIds = new Set([nodeId, ...descendants]);
    const siblingOrder = nextSiblingOrder(nodes, nextParentId, subtreeIds);

    updateNodes((current) => current.map((item) => {
      if (item.id === nodeId) {
        return { ...item, x: nextX, y: nextY, parentId: nextParentId, order: siblingOrder };
      }
      if (descendants.has(item.id)) {
        return { ...item, x: item.x + deltaX, y: item.y + deltaY };
      }
      return item;
    }));
    setError(null);
  };

  const addNode = (type: CanvasNodeType, requestedX?: number, requestedY?: number, requestedParentId?: string | null) => {
    if (!activeLesson) return;
    const selectedContainer = selectedNode && isContainerNode(selectedNode)
      ? selectedNode
      : selectedNode?.parentId
        ? nodes.find((node) => node.id === selectedNode.parentId && isContainerNode(node)) ?? null
        : null;
    const parentId = requestedParentId !== undefined
      ? requestedParentId
      : requestedX == null && requestedY == null ? selectedContainer?.id ?? null : null;
    const parent = parentId ? nodes.find((item) => item.id === parentId) : null;
    if (parentId && !isContainerNode(parent)) {
      setError(copy.invalidHierarchy);
      return;
    }
    const parentDepth = parent ? getNodeHierarchyDepth(nodes, parent.id) : 0;
    if (parent && parentDepth + 1 > MAX_NODE_HIERARCHY_DEPTH) {
      setError(copy.invalidHierarchy);
      return;
    }
    // A fourth-level container would have no room for a child within the
    // four-level tree. Keep the fourth level for leaf learning elements.
    if (type === "container" && parent && parentDepth >= MAX_NODE_HIERARCHY_DEPTH - 1) {
      setError(copy.invalidHierarchy);
      return;
    }
    const size = nodeDimensions(type, parent ?? undefined, parentDepth);

    let x: number;
    let y: number;
    if (parent) {
      const requested = requestedX != null && requestedY != null
        ? { x: snapToGrid(requestedX), y: snapToGrid(requestedY) }
        : null;
      const bounds = getContainerContentBounds(parent);
      const requestedFits = Boolean(requested
        && requested.x >= bounds.left
        && requested.y >= bounds.top
        && requested.x + size.width <= bounds.right
        && requested.y + size.height <= bounds.bottom
        && !nodes.some((node) => node.parentId === parent.id && overlaps(
          { ...requested, width: size.width, height: size.height },
          node
        )));
      const position = requestedFits
        ? requested
        : findFreePositionInContainer(nodes, parent, size.width, size.height);
      if (!position) {
        setError(copy.containerFull);
        return;
      }
      x = position.x;
      y = position.y;
    } else {
      const free = requestedX == null || requestedY == null
        ? findFreePosition(nodes, size.width, size.height)
        : { x: requestedX, y: requestedY };
      x = Math.max(GRID, Math.min(maxNodeX(size.width), snapToGrid(free.x)));
      y = Math.max(GRID, snapToGrid(free.y));
    }

    const siblingOrder = nextSiblingOrder(nodes, parent?.id ?? null);
    const node = createCanvasNode(type, x, y, siblingOrder, parent?.id ?? null, size);
    updateNodes((current) => [...current, node]);
    setError(null);
    setMobilePanel("canvas");
    setSelectedNodeId(node.id);
    setSelectedNodeIds([node.id]);
  };

  const handlePaletteDragStart = (event: ReactDragEvent<HTMLButtonElement>, type: CanvasNodeType) => {
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
    event.dataTransfer.setData("text/plain", type);
    event.dataTransfer.effectAllowed = "copy";

    // Provide a consistent card-shaped drag ghost instead of the browser's button snapshot.
    const preview = document.createElement("div");
    preview.className = "lesson-editor-workspace__drag-preview";
    const mark = document.createElement("span");
    mark.className = "lesson-editor-workspace__drag-preview-mark";
    mark.textContent = "⠿";
    const label = document.createElement("strong");
    label.textContent = copy.cardNames[type];
    preview.append(mark, label);
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 28, 28);
    window.setTimeout(() => preview.remove(), 0);
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(PALETTE_DRAG_TYPE) as CanvasNodeType;
    if (!NODE_TYPES.includes(type)) return;
    const point = canvasPoint(event.clientX, event.clientY);
    const maxParentDepth = type === "container" ? MAX_NODE_HIERARCHY_DEPTH - 2 : MAX_NODE_HIERARCHY_DEPTH - 1;
    const target = findContainerAtPosition(nodes, snapToGrid(point.x), snapToGrid(point.y), 80, 60, maxParentDepth);
    addNode(type, snapToGrid(point.x), snapToGrid(point.y), target?.id ?? null);
  };

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLElement>, node: CanvasNode) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, a")) return;

    // Space + drag or the middle mouse button pans the camera even when
    // the gesture starts over a node, as expected from a canvas editor.
    if (event.button === 1 || spacePressedRef.current) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const current = cameraRef.current;
      cameraDragRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        originX: current.x,
        originY: current.y,
      };
      setIsPanning(true);
      return;
    }

    if (event.button !== 0) return;
    event.preventDefault();

    // Ctrl/Cmd + click toggles membership in the multi-selection without starting a drag.
    if (event.ctrlKey || event.metaKey) {
      const nextSelection = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
      setSelectedNodeIds(nextSelection);
      setSelectedNodeId(nextSelection[nextSelection.length - 1] ?? null);
      dragRef.current = null;
      return;
    }

    const explicitGroupIds = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id];
    const groupIds = new Set(explicitGroupIds);
    for (const selectedId of explicitGroupIds) {
      for (const descendantId of getNodeDescendantIds(nodes, selectedId)) groupIds.add(descendantId);
    }
    const origins = nodes
      .filter((candidate) => groupIds.has(candidate.id))
      .map((candidate) => ({ id: candidate.id, x: candidate.x, y: candidate.y, width: candidate.width }));
    setSelectedNodeIds(explicitGroupIds);
    setSelectedNodeId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      anchorId: node.id,
      allowReparent: explicitGroupIds.length === 1,
      moved: false,
      origins,
    };
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".lesson-editor-workspace__element")) return;
    if (target?.closest("button, input, textarea, select, a")) return;

    const overCanvas = Boolean(target?.closest(".lesson-editor-workspace__canvas"));
    const shouldPan = event.button === 1 || spacePressedRef.current || event.pointerType === "touch" || !overCanvas;
    if (shouldPan) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const current = cameraRef.current;
      cameraDragRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        originX: current.x,
        originY: current.y,
      };
      setIsPanning(true);
      return;
    }

    if (event.button !== 0 || !overCanvas) return;
    const point = canvasPoint(event.clientX, event.clientY);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionRect({ startX: point.x, startY: point.y, currentX: point.x, currentY: point.y });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const cameraDrag = cameraDragRef.current;
    if (cameraDrag && cameraDrag.pointerId === event.pointerId) {
      setCameraPosition({
        ...cameraRef.current,
        x: cameraDrag.originX + event.clientX - cameraDrag.clientX,
        y: cameraDrag.originY + event.clientY - cameraDrag.clientY,
      });
      return;
    }

    const point = canvasPoint(event.clientX, event.clientY);
    if (pendingConnection) {
      setPendingConnection({ ...pendingConnection, x2: point.x, y2: point.y });
    }

    if (selectionRect) {
      setSelectionRect({ ...selectionRect, currentX: point.x, currentY: point.y });
      return;
    }

    const drag = dragRef.current;
    if (!drag || !activeLesson) return;
    const zoom = cameraRef.current.zoom;
    const deltaX = snapToGrid((event.clientX - drag.clientX) / zoom);
    const deltaY = snapToGrid((event.clientY - drag.clientY) / zoom);

    // Clamp the group translation as a whole so selected nodes keep their relative layout
    // when any edge of the group reaches the canvas boundary.
    const minDeltaX = Math.max(...drag.origins.map((origin) => GRID - origin.x));
    const maxDeltaX = Math.min(...drag.origins.map((origin) => maxNodeX(origin.width) - origin.x));
    const minDeltaY = Math.max(...drag.origins.map((origin) => GRID - origin.y));
    const appliedDeltaX = Math.min(maxDeltaX, Math.max(minDeltaX, deltaX));
    const appliedDeltaY = Math.max(minDeltaY, deltaY);
    const positions = drag.origins.map((origin) => ({
      id: origin.id,
      x: origin.x + appliedDeltaX,
      y: origin.y + appliedDeltaY,
    }));
    if (positions.every((position) => {
      const current = nodes.find((node) => node.id === position.id);
      return current && current.x === position.x && current.y === position.y;
    })) return;
    drag.moved = true;
    updateNodes((current) => current.map((item) => {
      const position = positions.find((candidate) => candidate.id === item.id);
      return position ? { ...item, x: position.x, y: position.y } : item;
    }));
  };

  const handleOutputPortPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, node: CanvasNode, portId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const anchor = getPortAnchor(node, "output", portId);
    setSelectedNodeId(node.id);
    setSelectedNodeIds([node.id]);
    setPendingConnection({ sourceNode: node.id, sourcePort: portId, x1: anchor.x, y1: anchor.y, x2: anchor.x, y2: anchor.y });
  };

  const handleInputPortPointerUp = (event: ReactPointerEvent<HTMLButtonElement>, targetNode: CanvasNode, targetPort: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!pendingConnection) return;
    if (pendingConnection.sourceNode === targetNode.id) {
      setPendingConnection(null);
      return;
    }
    const sourceNode = nodes.find((node) => node.id === pendingConnection.sourceNode);
    if (!sourceNode?.outputs.some((port) => port.id === pendingConnection.sourcePort)
      || !targetNode.inputs.some((port) => port.id === targetPort)) {
      setPendingConnection(null);
      return;
    }
    const nextConnection: CanvasConnection = {
      id: createId("connection"),
      sourceNode: pendingConnection.sourceNode,
      sourcePort: pendingConnection.sourcePort,
      targetNode: targetNode.id,
      targetPort,
    };
    const nextConnections = connections.filter((connection) =>
      !(connection.targetNode === targetNode.id && connection.targetPort === targetPort)
    );
    updateLesson({ connections: [...nextConnections, nextConnection] });
    setPendingConnection(null);
  };

  const handleCanvasPointerUp = () => {
    const drag = dragRef.current;
    if (drag?.moved && drag.allowReparent) {
      const anchor = nodes.find((node) => node.id === drag.anchorId);
      if (anchor) {
        const centerX = anchor.x + anchor.width / 2;
        const centerY = anchor.y + anchor.height / 2;
        const target = findContainerDropTarget(nodes, anchor.id, centerX, centerY);
        const nextParentId = target?.id ?? null;
        const currentParentId = anchor.parentId ?? null;
        if (nextParentId !== currentParentId || (target && !fitsInsideContainer(anchor, target))) {
          const validation = canAssignNodeParent(nodes, anchor.id, nextParentId);
          if (!validation.valid) {
            setError(validation.error ?? copy.invalidHierarchy);
          } else {
            let nextX = anchor.x;
            let nextY = anchor.y;
            let canPlace = true;
            if (target) {
              const bounds = getContainerContentBounds(target);
              if (anchor.width > bounds.right - bounds.left || anchor.height > bounds.bottom - bounds.top) {
                canPlace = false;
                setError(copy.containerFull);
              } else {
                nextX = Math.max(bounds.left, Math.min(bounds.right - anchor.width, anchor.x));
                nextY = Math.max(bounds.top, Math.min(bounds.bottom - anchor.height, anchor.y));
              }
            }
            if (canPlace) {
              const deltaX = nextX - anchor.x;
              const deltaY = nextY - anchor.y;
              const descendants = getNodeDescendantIds(nodes, anchor.id);
              const subtree = new Set([anchor.id, ...descendants]);
              const order = nextSiblingOrder(nodes, nextParentId, subtree);
              updateNodes((current) => current.map((node) => {
                if (node.id === anchor.id) return { ...node, parentId: nextParentId, order, x: nextX, y: nextY };
                if (descendants.has(node.id)) return { ...node, x: node.x + deltaX, y: node.y + deltaY };
                return node;
              }));
              setError(null);
            }
          }
        }
      }
    }
    if (cameraDragRef.current) {
      cameraDragRef.current = null;
      setIsPanning(false);
      return;
    }
    if (selectionRect) {
      const left = Math.min(selectionRect.startX, selectionRect.currentX);
      const top = Math.min(selectionRect.startY, selectionRect.currentY);
      const right = Math.max(selectionRect.startX, selectionRect.currentX);
      const bottom = Math.max(selectionRect.startY, selectionRect.currentY);
      const selected = nodes.filter((node) =>
        node.x < right && node.x + node.width > left &&
        node.y < bottom && node.y + node.height > top
      );
      setSelectedNodeIds(selected.map((node) => node.id));
      setSelectedNodeId(selected[selected.length - 1]?.id ?? null);
    }
    dragRef.current = null;
    setSelectionRect(null);
    setPendingConnection(null);
  };

  const handleCanvasPointerCancel = () => {
    dragRef.current = null;
    cameraDragRef.current = null;
    setIsPanning(false);
    setSelectionRect(null);
    setPendingConnection(null);
  };

  const handleAddModule = () => {
    if (!course) return;
    const module = createModule(course, modules.length + 1);
    commitModules([...modules, module]);
    setSelectedLessonId(module.lessons[0]?.id ?? "");
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  const handleAddLesson = () => {
    if (!course || !activeModule) return;
    const nextOrder = activeModule.lessons.length + 1;
    const lesson = createLesson(course, activeModule.id, nextOrder, `Aula ${nextOrder}`);
    commitModules(modules.map((module) => module.id === activeModule.id
      ? { ...module, lessons: [...module.lessons, lesson] }
      : module));
    setSelectedLessonId(lesson.id);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  const handleRemoveNode = () => {
    if (!selectedNode) return;
    const selectedRoots = selectedNodeIds.includes(selectedNode.id) ? selectedNodeIds : [selectedNode.id];
    const idsToRemove = new Set(selectedRoots);
    for (const rootId of selectedRoots) {
      for (const descendantId of getNodeDescendantIds(nodes, rootId)) idsToRemove.add(descendantId);
    }
    updateLesson({
      nodes: nodes.filter((node) => !idsToRemove.has(node.id)),
      connections: connections.filter((connection) =>
        !idsToRemove.has(connection.sourceNode) && !idsToRemove.has(connection.targetNode)
      ),
    });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  const handleDuplicateNode = () => {
    if (!selectedNode) return;
    const subtreeIds = new Set([selectedNode.id, ...getNodeDescendantIds(nodes, selectedNode.id)]);
    const originalSubtree = nodes.filter((node) => subtreeIds.has(node.id));
    let rootPosition: { x: number; y: number } | null;

    if (selectedNode.parentId) {
      const parent = nodes.find((node) => node.id === selectedNode.parentId);
      if (!isContainerNode(parent)) {
        setError(copy.invalidHierarchy);
        return;
      }
      rootPosition = findFreePositionInContainer(nodes, parent, selectedNode.width, selectedNode.height);
    } else {
      rootPosition = findFreePosition(nodes, selectedNode.width, selectedNode.height);
    }
    if (!rootPosition) {
      setError(copy.containerFull);
      return;
    }

    const deltaX = rootPosition.x - selectedNode.x;
    const deltaY = rootPosition.y - selectedNode.y;
    const ids = new Map(originalSubtree.map((node) => [node.id, createId("card")]));
    const copies = originalSubtree.map((node) => ({
      ...node,
      id: ids.get(node.id)!,
      parentId: node.id === selectedNode.id
        ? selectedNode.parentId ?? null
        : ids.get(node.parentId ?? "") ?? node.parentId ?? null,
      x: node.x + deltaX,
      y: node.y + deltaY,
      order: node.id === selectedNode.id
        ? nextSiblingOrder(nodes, selectedNode.parentId ?? null)
        : node.order,
      props: { ...node.props },
      inputs: node.inputs.map((port) => ({ ...port })),
      outputs: node.outputs.map((port) => ({ ...port })),
      style: node.style ? { ...node.style } : {},
      layout: node.layout ? { ...node.layout } : {},
    }));
    const copiedConnections = connections
      .filter((connection) => ids.has(connection.sourceNode) && ids.has(connection.targetNode))
      .map((connection) => ({
        ...connection,
        id: createId("connection"),
        sourceNode: ids.get(connection.sourceNode)!,
        targetNode: ids.get(connection.targetNode)!,
      }));
    updateLesson({
      nodes: [...nodes, ...copies],
      connections: [...connections, ...copiedConnections],
    });
    const duplicatedRootId = ids.get(selectedNode.id)!;
    setSelectedNodeId(duplicatedRootId);
    setSelectedNodeIds([duplicatedRootId]);
    setError(null);
  };

  const reparentSelectedNode = (parentId: string | null) => {
    if (!selectedNode) return;
    reparentNode(selectedNode.id, parentId);
  };

  const patchSelectedProps = (patch: Record<string, unknown>) => {
    if (!selectedNode) return;
    updateNodes((current) => current.map((node) => node.id === selectedNode.id
      ? { ...node, props: { ...node.props, ...patch } }
      : node));
  };

  const patchSelectedStyle = (patch: Partial<CanvasNodeStyle>) => {
    if (!selectedNode) return;
    updateNodes((current) => current.map((node) => node.id === selectedNode.id
      ? { ...node, style: { ...(node.style ?? {}), ...patch } }
      : node));
  };

  const patchSelectedLayout = (patch: Partial<CanvasNodeLayout>) => {
    if (!selectedNode) return;
    updateNodes((current) => current.map((node) => node.id === selectedNode.id
      ? { ...node, layout: { ...(node.layout ?? {}), ...patch } }
      : node));
  };

  const patchLessonPresentation = (patch: Partial<LessonPresentation>) => {
    if (!activeLesson) return;
    updateLesson({ presentation: { ...(activeLesson.presentation ?? {}), ...patch } });
  };

  const patchSelectedSize = (key: "width" | "height", value: number) => {
    if (!selectedNode) return;
    const directChildren = selectedNode.type === "container"
      ? nodes.filter((node) => node.parentId === selectedNode.id)
      : [];
    const requiredWidth = selectedNode.type === "container"
      ? Math.max(160, ...directChildren.map((node) => node.x + node.width - selectedNode.x + CONTAINER_CONTENT_INSET))
      : GRID * 4;
    const requiredHeight = selectedNode.type === "container"
      ? Math.max(128, ...directChildren.map((node) => node.y + node.height - selectedNode.y + CONTAINER_CONTENT_INSET))
      : GRID * 4;
    const parent = selectedNode.parentId ? nodes.find((node) => node.id === selectedNode.parentId) : null;
    const parentBounds = isContainerNode(parent) ? getContainerContentBounds(parent) : null;
    const maxAllowed = key === "width"
      ? parentBounds ? parentBounds.right - selectedNode.x : CANVAS_WIDTH - selectedNode.x - GRID
      : parentBounds ? parentBounds.bottom - selectedNode.y : 5000;
    const minRequired = key === "width" ? requiredWidth : requiredHeight;
    if (maxAllowed < minRequired) {
      setError(copy.containerFull);
      return;
    }
    const nextValue = Math.max(minRequired, Math.min(maxAllowed, snapToGrid(value)));
    updateNodes((current) => current.map((node) => node.id === selectedNode.id
      ? { ...node, [key]: nextValue, x: key === "width" ? Math.min(node.x, CANVAS_WIDTH - nextValue - GRID) : node.x }
      : node));
    setError(null);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!courseSlug || !course || saving) return false;
    const validationError = validateLessonModules(modules);
    if (validationError) {
      setError(validationError);
      setNotice(null);
      return false;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const sanitizedModules = modules.map((module, moduleIndex) => ({
        ...module,
        order: moduleIndex + 1,
        lessons: module.lessons.map((lesson, lessonIndex) => {
          const { blocks: discardedLegacyBlocks, elements: discardedLegacyElements, ...lessonData } = lesson as Lesson & { blocks?: unknown; elements?: unknown };
          void discardedLegacyBlocks;
          void discardedLegacyElements;
          return {
            ...lessonData,
            contentSchemaVersion: 2,
            presentation: lesson.presentation ?? { contentWidth: "medium", fontFamily: "sans", fontSize: 16, textAlign: "left", padding: 24 },
            nodes: Array.isArray(lesson.nodes) ? lesson.nodes : [],
            connections: Array.isArray(lesson.connections) ? lesson.connections : [],
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
    setMobilePanel("canvas");
    setSelectedLessonId(lessonId);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectionRect(null);
  };

  if (loading) {
    return <main className="lesson-editor-workspace lesson-editor-workspace--status"><p role="status">{copy.loading}</p></main>;
  }

  if (course && hasUnsupportedContentSchema(course)) {
    return (
      <main className="lesson-editor-workspace lesson-editor-workspace--status">
        <p role="alert">{copy.unsupportedSchema}</p>
        <Link to="/admin/courses" className="lesson-editor-workspace__primary">{copy.back}</Link>
      </main>
    );
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
    <main className="lesson-editor-workspace" data-mobile-panel={mobilePanel}>
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
        <button type="button" className="lesson-editor-workspace__secondary lesson-editor-workspace__desktop-preview-toggle" onClick={() => setMobilePanel((current) => current === "preview" ? "canvas" : "preview")} aria-pressed={mobilePanel === "preview"}>{mobilePanel === "preview" ? copy.backToCanvas : copy.preview}</button>
        <span className="lesson-editor-workspace__grid-scale">Grid · 20 px</span>
      </div>

      <nav className="lesson-editor-workspace__mobile-tabs" aria-label={copy.canvas}>
        <button type="button" className="lesson-editor-workspace__mobile-tab" aria-pressed={mobilePanel === "cards"} onClick={() => setMobilePanel("cards")}>{copy.cardsTab}</button>
        <button type="button" className="lesson-editor-workspace__mobile-tab" aria-pressed={mobilePanel === "canvas"} onClick={() => setMobilePanel("canvas")}>{copy.canvasTab}</button>
        <button type="button" className="lesson-editor-workspace__mobile-tab" aria-pressed={mobilePanel === "properties"} onClick={() => setMobilePanel("properties")}>{copy.propertiesTab}</button>
        <button type="button" className="lesson-editor-workspace__mobile-tab" aria-pressed={mobilePanel === "preview"} onClick={() => setMobilePanel("preview")}>{copy.preview}</button>
      </nav>

      <div className="lesson-editor-workspace__body">
        <aside className="lesson-editor-workspace__palette" aria-label={copy.palette}>
          <div className="lesson-editor-workspace__panel-heading">
            <h2>{copy.palette}</h2>
            <p>{copy.paletteHint}</p>
          </div>
          <div className="lesson-editor-workspace__palette-list">
            {NODE_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                className="lesson-editor-workspace__palette-card"
                draggable
                onDragStart={(event) => handlePaletteDragStart(event, type)}
                onClick={() => addNode(type)}
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
            <span>{nodes.length} cards</span>
          </div>
          <div className="lesson-editor-workspace__preview" hidden={mobilePanel !== "preview"}>
            <div className="lesson-editor-workspace__preview-toolbar">
              <strong>{copy.preview}</strong>
              <div role="group" aria-label={copy.preview}>
                <button type="button" aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>{copy.previewMobile}</button>
                <button type="button" aria-pressed={previewDevice === "tablet"} onClick={() => setPreviewDevice("tablet")}>{copy.previewTablet}</button>
                <button type="button" aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>{copy.previewDesktop}</button>
              </div>
            </div>
            <div className="lesson-editor-workspace__preview-viewport">
              <article className={`lesson-editor-workspace__preview-page lesson-editor-workspace__preview-page--${previewDevice} student-lesson__article`} style={getLessonPresentationStyle(activeLesson?.presentation)}>
                {activeLesson && (
                  <>
                    <header className="lesson-editor-workspace__preview-lesson-heading">
                      <p>{activeModule?.title}</p>
                      <h1>{activeLesson.title}</h1>
                      {activeLesson.description && <p>{activeLesson.description}</p>}
                    </header>
                    <LessonContentTree nodes={nodes} />
                  </>
                )}
              </article>
            </div>
          </div>

          <div
            ref={canvasViewportRef}
            className={`lesson-editor-workspace__canvas-scroll${isPanning ? " lesson-editor-workspace__canvas-scroll--panning" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDrop}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerCancel}
            onWheel={handleCanvasWheel}
          >
            {activeLesson ? (
              <div
                className="lesson-editor-workspace__canvas"
                style={{ height: canvasHeight, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
              >
                {nodes.length === 0 && <div className="lesson-editor-workspace__empty-canvas"><span>＋</span><strong>{copy.emptyCanvas}</strong><p>{copy.dropHere}</p></div>}
                <svg
                  className="lesson-editor-workspace__connections-layer"
                  width={CANVAS_WIDTH}
                  height={canvasHeight}
                  viewBox={"0 0 " + CANVAS_WIDTH + " " + canvasHeight}
                  preserveAspectRatio="none"
                  aria-label="Conexões do fluxo pedagógico"
                >
                  <defs>
                    <marker id="corseweb-flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#8daaf0" />
                    </marker>
                  </defs>
                  {connections.map((connection) => {
                    const source = nodes.find((node) => node.id === connection.sourceNode);
                    const target = nodes.find((node) => node.id === connection.targetNode);
                    if (!source || !target) return null;
                    const from = getPortAnchor(source, "output", connection.sourcePort);
                    const to = getPortAnchor(target, "input", connection.targetPort);
                    return <path key={connection.id} className="lesson-editor-workspace__connection-path" d={connectionPath(from, to)} markerEnd="url(#corseweb-flow-arrow)" />;
                  })}
                  {pendingConnection && (
                    <path
                      className="lesson-editor-workspace__connection-path lesson-editor-workspace__connection-path--pending"
                      d={connectionPath({ x: pendingConnection.x1, y: pendingConnection.y1 }, { x: pendingConnection.x2, y: pendingConnection.y2 })}
                    />
                  )}
                </svg>
                {nodes.map((node) => (
                  <article
                    key={node.id}
                    className={`lesson-editor-workspace__element${node.type === "container" ? " lesson-editor-workspace__element--container" : ""}${node.parentId ? " lesson-editor-workspace__element--nested" : ""}${selectedNodeIds.includes(node.id) ? " lesson-editor-workspace__element--selected" : ""}`}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      zIndex: Math.max(0, getNodeHierarchyDepth(nodes, node.id) - 1) * 2 + (node.type === "container" ? 0 : 1),
                    } as CSSProperties}
                    role="group"
                    tabIndex={0}
                    aria-label={copy.cardNames[node.type]}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedNodeId(node.id);
                        setSelectedNodeIds([node.id]);
                        if (window.matchMedia("(max-width: 899px)").matches) setMobilePanel("properties");
                      }
                    }}
                    onPointerDown={(event) => handleCardPointerDown(event, node)}
                    onDragOver={(event) => {
                      if (node.type !== "container") return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(event) => {
                      if (node.type !== "container") return;
                      event.preventDefault();
                      event.stopPropagation();
                      const type = event.dataTransfer.getData(PALETTE_DRAG_TYPE) as CanvasNodeType;
                      if (NODE_TYPES.includes(type)) {
                        const point = canvasPoint(event.clientX, event.clientY);
                        addNode(type, snapToGrid(point.x), snapToGrid(point.y), node.id);
                      }
                    }}
                    onClick={() => {
                      if (window.matchMedia("(max-width: 899px)").matches) setMobilePanel("properties");
                    }}
                    title={copy.cardNames[node.type]}
                  >
                    {node.inputs.map((port, index) => (
                      <div
                        key={port.id}
                        className="lesson-editor-workspace__port-wrap lesson-editor-workspace__port-wrap--input"
                        style={{ left: ((index + 1) / (node.inputs.length + 1)) * 100 + "%" }}
                      >
                        <button
                          type="button"
                          className="lesson-editor-workspace__port"
                          aria-label={"Entrada " + port.label + " — " + copy.cardNames[node.type]}
                          title={"Entrada: " + port.label}
                          onPointerUp={(event) => handleInputPortPointerUp(event, node, port.id)}
                        />
                        <span className="lesson-editor-workspace__port-label">{port.label}</span>
                      </div>
                    ))}
                    {node.outputs.map((port, index) => (
                      <div
                        key={port.id}
                        className="lesson-editor-workspace__port-wrap lesson-editor-workspace__port-wrap--output"
                        style={{ left: ((index + 1) / (node.outputs.length + 1)) * 100 + "%" }}
                      >
                        <button
                          type="button"
                          className="lesson-editor-workspace__port"
                          aria-label={"Saída " + port.label + " — " + copy.cardNames[node.type]}
                          title={"Saída: " + port.label}
                          onPointerDown={(event) => handleOutputPortPointerDown(event, node, port.id)}
                        />
                        <span className="lesson-editor-workspace__port-label">{port.label}</span>
                      </div>
                    ))}
                    <div className="lesson-editor-workspace__element-toolbar">
                      <span>{copy.cardNames[node.type]}</span>
                      <span aria-hidden="true">⠿</span>
                    </div>
                    <div className="lesson-editor-workspace__element-content">
                      <NodePreview node={node} />
                    </div>
                  </article>
                ))}
                {selectionRect && (
                  <div
                    className="lesson-editor-workspace__selection-rectangle"
                    style={{
                      left: Math.min(selectionRect.startX, selectionRect.currentX),
                      top: Math.min(selectionRect.startY, selectionRect.currentY),
                      width: Math.abs(selectionRect.currentX - selectionRect.startX),
                      height: Math.abs(selectionRect.currentY - selectionRect.startY),
                    }}
                  />
                )}
              </div>
            ) : <p className="lesson-editor-workspace__empty-canvas">{copy.notFound}</p>}
            <div className="lesson-editor-workspace__camera-controls" role="group" aria-label={copy.cameraControls}>
              <button type="button" aria-label={copy.zoomOut} title={copy.zoomOut} onClick={() => zoomBy(-1)} disabled={camera.zoom <= MIN_ZOOM}>−</button>
              <span aria-live="off">{Math.round(camera.zoom * 100)}%</span>
              <button type="button" aria-label={copy.zoomIn} title={copy.zoomIn} onClick={() => zoomBy(1)} disabled={camera.zoom >= MAX_ZOOM}>+</button>
              <button type="button" onClick={fitCamera} title={copy.fitView}>{copy.fitView}</button>
              <button type="button" onClick={resetCamera} title={copy.resetView}>{copy.resetView}</button>
            </div>
          </div>
        </section>

        <aside className="lesson-editor-workspace__inspector" aria-label={copy.inspector}>
          <div className="lesson-editor-workspace__panel-heading">
            <h2>{copy.inspector}</h2>
            <p>{selectedNode ? copy.cardNames[selectedNode.type] : copy.inspectorHint}</p>
          </div>

          {selectedNode ? (
            <div className="lesson-editor-workspace__inspector-form">
              {["start", "certificate", "container"].includes(selectedNode.type) && (
                <>
                  <label><span>{copy.title}</span><input value={getText(selectedNode, "title")} onChange={(event) => patchSelectedProps({ title: event.target.value })} /></label>
                  <label><span>{copy.content}</span><textarea rows={4} value={getText(selectedNode, "content")} onChange={(event) => patchSelectedProps({ content: event.target.value })} /></label>
                </>
              )}
              {["heading", "paragraph"].includes(selectedNode.type) && (
                <label><span>{copy.content}</span><textarea rows={5} value={getText(selectedNode, "content")} onChange={(event) => patchSelectedProps({ content: event.target.value })} /></label>
              )}
              {selectedNode.type === "list" && (
                <>
                  <label><span>{copy.content}</span><textarea rows={6} value={Array.isArray(selectedNode.props.items) ? selectedNode.props.items.map(String).join("\n") : ""} onChange={(event) => patchSelectedProps({ items: event.target.value.split("\n") })} /></label>
                  <label className="lesson-editor-workspace__checkbox"><input type="checkbox" checked={Boolean(selectedNode.props.ordered)} onChange={(event) => patchSelectedProps({ ordered: event.target.checked })} /><span>{copy.ordered}</span></label>
                </>
              )}
              {selectedNode.type === "image" && (
                <>
                  <label><span>{copy.url}</span><input value={getText(selectedNode, "url")} onChange={(event) => patchSelectedProps({ url: event.target.value })} placeholder="https://…" /></label>
                  <label><span>{copy.alt}</span><input value={getText(selectedNode, "alt")} onChange={(event) => patchSelectedProps({ alt: event.target.value })} /></label>
                  <label><span>{copy.caption}</span><input value={getText(selectedNode, "caption")} onChange={(event) => patchSelectedProps({ caption: event.target.value })} /></label>
                </>
              )}
              {selectedNode.type === "video" && (
                <>
                  <label><span>{copy.url}</span><input value={getText(selectedNode, "url")} onChange={(event) => patchSelectedProps({ url: event.target.value })} placeholder="https://…" /></label>
                  <label><span>{copy.caption}</span><input value={getText(selectedNode, "caption")} onChange={(event) => patchSelectedProps({ caption: event.target.value })} /></label>
                </>
              )}
              {selectedNode.type === "code" && (
                <>
                  <label><span>{copy.language}</span><input value={getText(selectedNode, "language", "text")} onChange={(event) => patchSelectedProps({ language: event.target.value })} /></label>
                  <label><span>{copy.code}</span><textarea rows={7} value={getText(selectedNode, "code")} onChange={(event) => patchSelectedProps({ code: event.target.value })} /></label>
                </>
              )}
              {selectedNode.type === "quiz" && (
                <>
                  <label><span>{copy.question}</span><textarea rows={3} value={getText(selectedNode, "question")} onChange={(event) => patchSelectedProps({ question: event.target.value })} /></label>
                  <label><span>{copy.options}</span><textarea rows={4} value={Array.isArray(selectedNode.props.options) ? selectedNode.props.options.map(String).join("\n") : ""} onChange={(event) => patchSelectedProps({ options: event.target.value.split("\n") })} /></label>
                  <label><span>{copy.correctAnswer}</span><input type="number" min={0} value={Number(selectedNode.props.correctIndex ?? 0)} onChange={(event) => patchSelectedProps({ correctIndex: Math.max(0, Number(event.target.value) || 0) })} /></label>
                </>
              )}
              {selectedNode.type === "exercise" && (
                <>
                  <label><span>{copy.instruction}</span><textarea rows={3} value={getText(selectedNode, "instruction")} onChange={(event) => patchSelectedProps({ instruction: event.target.value })} /></label>
                  <label><span>{copy.starterCode}</span><textarea rows={5} value={getText(selectedNode, "starterCode")} onChange={(event) => patchSelectedProps({ starterCode: event.target.value })} /></label>
                  <label><span>{copy.solution}</span><textarea rows={4} value={getText(selectedNode, "solution")} onChange={(event) => patchSelectedProps({ solution: event.target.value })} /></label>
                </>
              )}
              {selectedNode.type === "callout" && (
                <>
                  <label><span>{copy.title}</span><input value={getText(selectedNode, "title")} onChange={(event) => patchSelectedProps({ title: event.target.value })} /></label>
                  <label><span>{copy.content}</span><textarea rows={4} value={getText(selectedNode, "content")} onChange={(event) => patchSelectedProps({ content: event.target.value })} /></label>
                </>
              )}
              {selectedNode.type === "embed" && (
                <>
                  <label><span>{copy.title}</span><input value={getText(selectedNode, "title")} onChange={(event) => patchSelectedProps({ title: event.target.value })} /></label>
                  <label><span>{copy.url}</span><input value={getText(selectedNode, "url")} onChange={(event) => patchSelectedProps({ url: event.target.value })} placeholder="https://…" /></label>
                </>
              )}
              {selectedNode.type !== "start" && (
                <section className="lesson-editor-workspace__hierarchy-fields">
                  <h3>{copy.hierarchy}</h3>
                  <label>
                    <span>{copy.parentContainer}</span>
                    <select value={selectedNode.parentId ?? ""} onChange={(event) => reparentSelectedNode(event.target.value || null)}>
                      <option value="">{copy.outsideContainer}</option>
                      {getEligibleContainerParents(nodes, selectedNode.id).map((container) => (
                        <option value={container.id} key={container.id}>
                          {getText(container, "title", copy.cardNames.container) || copy.cardNames.container}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedNode.type === "container" && (
                    <div className="lesson-editor-workspace__container-actions">
                      <p>{copy.containerHint}</p>
                      <span>{nodes.filter((node) => node.parentId === selectedNode.id).length} elementos filhos diretos</span>
                      <button type="button" className="lesson-editor-workspace__secondary" onClick={() => setMobilePanel("cards")}>{copy.addChild}</button>
                    </div>
                  )}
                </section>
              )}
              <div className="lesson-editor-workspace__size-fields">
                <label><span>{copy.width}</span><input type="number" step={GRID} min={GRID * 4} max={CANVAS_WIDTH - GRID * 2} value={selectedNode.width} onChange={(event) => patchSelectedSize("width", Number(event.target.value))} /></label>
                <label><span>{copy.height}</span><input type="number" step={GRID} min={GRID * 4} max={2400} value={selectedNode.height} onChange={(event) => patchSelectedSize("height", Number(event.target.value))} /></label>
              </div>
              <section className="lesson-editor-workspace__presentation-fields">
                <h3>{copy.presentation}</h3>
                <label><span>{copy.contentWidth}</span>
                  <select value={selectedNode.layout?.width ?? "auto"} onChange={(event) => patchSelectedLayout({ width: event.target.value as CanvasNodeLayout["width"] })}>
                    <option value="auto">Automático</option><option value="narrow">Estreito</option><option value="medium">Médio</option><option value="wide">Largo</option><option value="full">Total</option>
                  </select>
                </label>
                <label><span>Alinhamento do elemento</span>
                  <select value={selectedNode.layout?.align ?? "start"} onChange={(event) => patchSelectedLayout({ align: event.target.value as CanvasNodeLayout["align"] })}>
                    <option value="start">Início</option><option value="center">Centro</option><option value="end">Fim</option><option value="stretch">Esticar</option>
                  </select>
                </label>
                <label><span>Espaço antes (px)</span><input type="number" min={0} max={96} value={selectedNode.layout?.spacingBefore ?? 0} onChange={(event) => patchSelectedLayout({ spacingBefore: Math.max(0, Math.min(96, Number(event.target.value) || 0)) })} /></label>
                <label><span>Espaço depois (px)</span><input type="number" min={0} max={96} value={selectedNode.layout?.spacingAfter ?? 0} onChange={(event) => patchSelectedLayout({ spacingAfter: Math.max(0, Math.min(96, Number(event.target.value) || 0)) })} /></label>
                <label><span>{copy.textColor}</span><input type="color" value={selectedNode.style?.color ?? "#202734"} onChange={(event) => patchSelectedStyle({ color: event.target.value })} /></label>
                <label><span>{copy.backgroundColor}</span><input type="color" value={selectedNode.style?.backgroundColor ?? "#ffffff"} onChange={(event) => patchSelectedStyle({ backgroundColor: event.target.value })} /></label>
                <label><span>{copy.fontFamily}</span>
                  <select value={selectedNode.style?.fontFamily ?? "sans"} onChange={(event) => patchSelectedStyle({ fontFamily: event.target.value as CanvasNodeStyle["fontFamily"] })}>
                    <option value="sans">Sans-serif</option><option value="serif">Serif</option><option value="mono">Monoespaçada</option>
                  </select>
                </label>
                <label><span>{copy.fontSize}</span><input type="number" min={12} max={48} value={selectedNode.style?.fontSize ?? 16} onChange={(event) => patchSelectedStyle({ fontSize: Math.max(12, Math.min(48, Number(event.target.value) || 16)) })} /></label>
                <label><span>{copy.textAlign}</span>
                  <select value={selectedNode.style?.textAlign ?? "left"} onChange={(event) => patchSelectedStyle({ textAlign: event.target.value as CanvasNodeStyle["textAlign"] })}>
                    <option value="left">Esquerda</option><option value="center">Centralizado</option><option value="right">Direita</option>
                  </select>
                </label>
                <label><span>Espessura da fonte</span>
                  <select value={selectedNode.style?.fontWeight ?? 400} onChange={(event) => patchSelectedStyle({ fontWeight: Number(event.target.value) as CanvasNodeStyle["fontWeight"] })}>
                    <option value={400}>Normal</option><option value={500}>Média</option><option value={600}>Seminegrito</option><option value={700}>Negrito</option>
                  </select>
                </label>
                <label><span>Arredondamento (px)</span><input type="number" min={0} max={32} value={selectedNode.style?.borderRadius ?? 0} onChange={(event) => patchSelectedStyle({ borderRadius: Math.max(0, Math.min(32, Number(event.target.value) || 0)) })} /></label>
                <label><span>Espaçamento interno (px)</span><input type="number" min={0} max={48} value={selectedNode.style?.padding ?? 0} onChange={(event) => patchSelectedStyle({ padding: Math.max(0, Math.min(48, Number(event.target.value) || 0)) })} /></label>
              </section>
              <div className="lesson-editor-workspace__element-actions">
                <button type="button" className="lesson-editor-workspace__secondary" onClick={handleDuplicateNode}>{copy.duplicate}</button>
                <button type="button" className="lesson-editor-workspace__danger" onClick={handleRemoveNode}>{copy.remove}</button>
              </div>
            </div>
          ) : activeLesson ? (
            <div className="lesson-editor-workspace__lesson-properties">
              <label><span>{copy.lessonName}</span><input value={activeLesson.title} maxLength={120} onChange={(event) => updateLesson({ title: event.target.value })} /></label>
              <label><span>{copy.content}</span><textarea rows={4} value={activeLesson.description ?? ""} onChange={(event) => updateLesson({ description: event.target.value })} /></label>
              <label><span>{copy.duration}</span><input type="number" min={1} max={600} value={activeLesson.estimatedMinutes} onChange={(event) => updateLesson({ estimatedMinutes: Math.max(1, Math.min(600, Number(event.target.value) || 1)) })} /></label>
              <section className="lesson-editor-workspace__presentation-fields">
                <h3>{copy.presentation}</h3>
                <label><span>{copy.contentWidth}</span>
                  <select value={activeLesson.presentation?.contentWidth ?? "medium"} onChange={(event) => patchLessonPresentation({ contentWidth: event.target.value as LessonPresentation["contentWidth"] })}>
                    <option value="narrow">Estreito</option><option value="medium">Médio</option><option value="wide">Largo</option>
                  </select>
                </label>
                <label><span>{copy.backgroundColor}</span><input type="color" value={activeLesson.presentation?.backgroundColor ?? "#ffffff"} onChange={(event) => patchLessonPresentation({ backgroundColor: event.target.value })} /></label>
                <label><span>{copy.textColor}</span><input type="color" value={activeLesson.presentation?.textColor ?? "#202734"} onChange={(event) => patchLessonPresentation({ textColor: event.target.value })} /></label>
                <label><span>{copy.fontFamily}</span>
                  <select value={activeLesson.presentation?.fontFamily ?? "sans"} onChange={(event) => patchLessonPresentation({ fontFamily: event.target.value as LessonPresentation["fontFamily"] })}>
                    <option value="sans">Sans-serif</option><option value="serif">Serif</option><option value="mono">Monoespaçada</option>
                  </select>
                </label>
                <label><span>{copy.fontSize}</span><input type="number" min={12} max={24} value={activeLesson.presentation?.fontSize ?? 16} onChange={(event) => patchLessonPresentation({ fontSize: Math.max(12, Math.min(24, Number(event.target.value) || 16)) })} /></label>
                <label><span>{copy.textAlign}</span>
                  <select value={activeLesson.presentation?.textAlign ?? "left"} onChange={(event) => patchLessonPresentation({ textAlign: event.target.value as LessonPresentation["textAlign"] })}>
                    <option value="left">Esquerda</option><option value="center">Centralizado</option><option value="right">Direita</option>
                  </select>
                </label>
                <label><span>Espaçamento interno (px)</span><input type="number" min={12} max={64} value={activeLesson.presentation?.padding ?? 24} onChange={(event) => patchLessonPresentation({ padding: Math.max(12, Math.min(64, Number(event.target.value) || 24)) })} /></label>
              </section>
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
