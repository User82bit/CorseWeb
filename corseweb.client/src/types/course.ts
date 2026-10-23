// ============================================================
// TIPOLOGIA DO CURSO — Estrutura genérica multi-curso
// ============================================================

/** Níveis de dificuldade padronizados */
export type CourseLevel = 'Iniciante' | 'Intermediário' | 'Avançado';

/** Status de publicação do curso */
export type CourseStatus = 'rascunho' | 'publicado' | 'arquivado';

/** Metadados base para qualquer entidade */
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy: string; // userId
  updatedBy: string; // userId
}

/** Tag categorizada */
export interface Tag {
  id: string;
  label: string;
  category: 'idioma' | 'tecnologia' | 'area' | 'nivel' | 'custom';
  color?: string; // hex ou token de cor
}

/** Mídia (imagem, vídeo, arquivo) */
export interface Media {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  duration?: number; // para vídeo/áudio em segundos
  thumbnailUrl?: string;
}

/** Tipos de nós disponíveis no canvas pedagógico. */
export type CanvasNodeType =
  | "start"
  | "heading"
  | "paragraph"
  | "list"
  | "image"
  | "video"
  | "code"
  | "quiz"
  | "exercise"
  | "callout"
  | "divider"
  | "embed"
  | "certificate";

export interface CanvasPort {
  id: string;
  label: string;
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
  inputs: CanvasPort[];
  outputs: CanvasPort[];
}

export interface CanvasConnection {
  id: string;
  sourceNode: string;
  sourcePort: string;
  targetNode: string;
  targetPort: string;
}

/** Aula individual: nós posicionados e conexões dirigidas que descrevem o fluxo pedagógico. */
export interface Lesson extends BaseEntity {
  courseId: string;
  moduleId: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  estimatedMinutes: number;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  // Progresso
  isPublished: boolean;
  isFree: boolean; // aula gratuita para preview
}

/** Módulo do curso */
export interface Module extends BaseEntity {
  courseId: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  // Progresso agregado
  totalLessons: number;
  totalMinutes: number;
}

/** Curso completo */
export interface Course extends BaseEntity {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  shortDescription?: string; // para cards
  thumbnail: Media;
  category: string; // ex: 'Desenvolvimento', 'Idiomas', 'Data Science'
  tags: Tag[];
  level: CourseLevel;
  status: CourseStatus;
  language: string; // código do idioma principal
  modules: Module[];
  // Metadados agregados
  totalModules: number;
  totalLessons: number;
  totalMinutes: number;
  // SEO / Social
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: Media;
  // Configurações
  allowComments: boolean;
  allowFork: boolean; // permitir cópia/remix
  isFeatured: boolean;
  // Autor
  authorId: string;
  authorName: string;
  authorAvatar?: Media;
  // Versionamento
  version: number;
  changelog?: string;
}

/** Progresso do aluno em um curso */
export interface CourseProgress {
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
  overallPercent: number; // 0-100
  modules: ModuleProgress[];
  currentLessonId?: string;
  lastAccessedAt: string;
}

/** Progresso em um módulo */
export interface ModuleProgress {
  moduleId: string;
  completedAt?: string;
  percent: number;
  lessons: LessonProgress[];
}

/** Progresso em uma aula */
export interface LessonProgress {
  lessonId: string;
  status: 'nao-iniciado' | 'em-andamento' | 'concluido';
  startedAt?: string;
  completedAt?: string;
  timeSpentMinutes: number;
  // Para quizzes/exercícios
  quizScore?: number; // 0-100
  exerciseCompleted?: boolean;
}

/** Dados para criação de curso (formulário) */
export interface CourseCreateInput {
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  tags: Tag[];
  level: CourseLevel;
  language: string;
  thumbnail?: Media;
  allowComments: boolean;
  allowFork: boolean;
}

/** Dados para criação de módulo */
export interface ModuleCreateInput {
  courseId: string;
  title: string;
  description?: string;
  order?: number;
}

/** Dados para criação de aula */
export interface LessonCreateInput {
  courseId: string;
  moduleId: string;
  title: string;
  description?: string;
  order?: number;
  estimatedMinutes: number;
  isFree: boolean;
}
