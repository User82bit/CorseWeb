// ============================================================
// SISTEMA DE CONTEÚDO — Dados de curso genéricos e reutilizáveis
// ============================================================

import type { Course, Block, Component, ComponentType, Tag, Media } from '../types/course';

// ============================================================
// MÍDIAS PLACEHOLDER
// ============================================================

const placeholderImage: Media = {
  id: 'placeholder-image',
  type: 'image',
  url: '/hero.png',
  alt: 'Imagem do curso',
  width: 1280,
  height: 720,
};

const _placeholderVideo: Media = {
  id: 'placeholder-video',
  type: 'video',
  url: '/sample-video.mp4',
  duration: 300,
  thumbnailUrl: '/hero.png',
};
void _placeholderVideo;
void placeholderImage;

// ============================================================
// TAGS REUTILIZÁVEIS
// ============================================================

export const commonTags: Tag[] = [
  { id: 'tag-idioma', label: 'Idioma', category: 'idioma', color: '#7b66ff' },
  { id: 'tag-ingles', label: 'Inglês', category: 'idioma', color: '#7b66ff' },
  { id: 'tag-espanhol', label: 'Espanhol', category: 'idioma', color: '#7b66ff' },
  { id: 'tag-frances', label: 'Francês', category: 'idioma', color: '#7b66ff' },
  { id: 'tag-js', label: 'JavaScript', category: 'tecnologia', color: '#f59e0b' },
  { id: 'tag-ts', label: 'TypeScript', category: 'tecnologia', color: '#3b82f6' },
  { id: 'tag-react', label: 'React', category: 'tecnologia', color: '#06b6d4' },
  { id: 'tag-node', label: 'Node.js', category: 'tecnologia', color: '#10b981' },
  { id: 'tag-python', label: 'Python', category: 'tecnologia', color: '#3b82f6' },
  { id: 'tag-data', label: 'Data Science', category: 'area', color: '#8b5cf6' },
  { id: 'tag-ml', label: 'Machine Learning', category: 'tecnologia', color: '#ec4899' },
  { id: 'tag-dev', label: 'Desenvolvimento', category: 'area', color: '#6366f1' },
  { id: 'tag-design', label: 'Design', category: 'area', color: '#ec4899' },
  { id: 'tag-iniciante', label: 'Iniciante', category: 'nivel', color: '#10b981' },
  { id: 'tag-intermediario', label: 'Intermediário', category: 'nivel', color: '#f59e0b' },
  { id: 'tag-avancado', label: 'Avançado', category: 'nivel', color: '#ef4444' },
];

export const MODULE_META = {
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  createdBy: 'system',
  updatedBy: 'system',
} as const;

export const LESSON_META = {
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  createdBy: 'system',
  updatedBy: 'system',
} as const;

// ============================================================
// COMPONENTES REUTILIZÁVEIS (fábricas)
// ============================================================

/** Cria um componente de parágrafo */
export function createParagraphComponent(id: string, order: number, content: string): Component {
  return {
    id,
    type: 'paragrafo',
    order,
    props: { content },
  };
}

/** Cria um componente de título */
export function createHeadingComponent(id: string, order: number, content: string, level: 1 | 2 | 3 = 2): Component {
  return {
    id,
    type: 'titulo',
    order,
    props: { content, level },
  };
}

/** Cria um componente de lista */
export function createListComponent(id: string, order: number, items: string[], ordered = false): Component {
  return {
    id,
    type: 'lista',
    order,
    props: { items, ordered },
  };
}

/** Cria um componente de imagem */
export function createImageComponent(id: string, order: number, mediaId: string, alt: string, caption?: string): Component {
  return {
    id,
    type: 'imagem',
    order,
    props: { mediaId, alt, caption },
  };
}

/** Cria um componente de vídeo */
export function createVideoComponent(id: string, order: number, mediaId: string, autoplay = false, controls = true): Component {
  return {
    id,
    type: 'video',
    order,
    props: { mediaId, autoplay, controls },
  };
}

/** Cria um componente de bloco de código */
export function createCodeBlockComponent(id: string, order: number, code: string, language: string, filename?: string): Component {
  return {
    id,
    type: 'bloco-codigo',
    order,
    props: { code, language, filename },
  };
}

/** Cria um componente de quiz múltipla escolha */
export function createQuizMultipleChoiceComponent(
  id: string,
  order: number,
  question: string,
  options: string[],
  correctIndex: number,
  explanation?: string
): Component {
  return {
    id,
    type: 'quiz-multipla-escolha',
    order,
    props: { question, options, correctIndex, explanation },
  };
}

/** Cria um componente de exercício prático */
export function createExerciseComponent(
  id: string,
  order: number,
  instruction: string,
  starterCode?: string,
  solution?: string,
  tests?: string[]
): Component {
  return {
    id,
    type: 'exercicio-pratico',
    order,
    props: { instruction, starterCode, solution, tests },
  };
}

/** Cria um componente divisor */
export function createDividerComponent(id: string, order: number, style: 'solid' | 'dashed' | 'spaced' = 'solid'): Component {
  return {
    id,
    type: 'divisor',
    order,
    props: { style },
  };
}

/** Cria um componente callout */
export function createCalloutComponent(
  id: string,
  order: number,
  type: 'info' | 'aviso' | 'sucesso' | 'erro',
  content: string,
  title?: string
): Component {
  return {
    id,
    type: `callout-${type}` as ComponentType,
    order,
    props: { title, content },
  };
}

/** Cria um componente embed */
export function createEmbedComponent(
  id: string,
  order: number,
  type: 'youtube' | 'github' | 'figma',
  url: string,
  title?: string
): Component {
  return {
    id,
    type: `embed-${type}` as ComponentType,
    order,
    props: { url, title },
  };
}

// ============================================================
// BLOCOS REUTILIZÁVEIS (fábricas)
// ============================================================

/** Cria um bloco de texto simples */
export function createTextBlock(id: string, order: number, components: Component[], layout?: Block['layout']): Block {
  return {
    id,
    type: 'texto',
    order,
    components,
    layout: layout || { columns: 1, gap: 'md', padding: 'md', background: 'transparent' },
  };
}

/** Cria um bloco de mídia (imagem/vídeo) */
export function createMediaBlock(id: string, order: number, components: Component[], layout?: Block['layout']): Block {
  return {
    id,
    type: 'imagem',
    order,
    components,
    layout: layout || { columns: 1, gap: 'md', padding: 'none', background: 'transparent' },
  };
}

/** Cria um bloco interativo (quiz/exercício) */
export function createInteractiveBlock(id: string, order: number, components: Component[], layout?: Block['layout']): Block {
  return {
    id,
    type: 'quiz',
    order,
    components,
    layout: layout || { columns: 1, gap: 'lg', padding: 'lg', background: 'subtle' },
  };
}

/** Cria um bloco de código */
export function createCodeBlock(id: string, order: number, components: Component[], layout?: Block['layout']): Block {
  return {
    id,
    type: 'codigo',
    order,
    components,
    layout: layout || { columns: 1, gap: 'md', padding: 'md', background: 'subtle' },
  };
}

// ============================================================
// CATÁLOGO — vazio por padrão (sem mocks)
// Cursos são criados por usuários/admins e persistidos no
// courseStore (localStorage até o backend existir).
// ============================================================

export const courseCatalog: Course[] = [];

// ============================================================
// HELPERS DE BUSCA/FILTRO (operam sobre courseCatalog vazio)
// Substitua por courseStore.getAll() quando houver persistência
// ============================================================

export function getCourseBySlug(slug: string): Course | undefined {
  return courseCatalog.find(c => c.slug === slug);
}

export function getCoursesByCategory(category: string): Course[] {
  return courseCatalog.filter(c => c.category === category);
}

export function getCoursesByTag(tagId: string): Course[] {
  return courseCatalog.filter(c => c.tags.some(t => t.id === tagId));
}

export function getCoursesByLevel(level: Course['level']): Course[] {
  return courseCatalog.filter(c => c.level === level);
}

export function getFeaturedCourses(): Course[] {
  return courseCatalog.filter(c => c.isFeatured);
}

export function getAllCategories(): string[] {
  return [...new Set(courseCatalog.map(c => c.category))];
}

export function getAllTags(): Tag[] {
  return commonTags;
}
