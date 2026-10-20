// ============================================================
// TIPOLOGIA DO CURSO — Estrutura genérica multi-curso
// ============================================================

/** Níveis de dificuldade padronizados */
export type CourseLevel = 'Iniciante' | 'Intermediário' | 'Avançado';

/** Status de publicação do curso */
export type CourseStatus = 'rascunho' | 'publicado' | 'arquivado';

/** Tipos de bloco disponíveis no editor */
export type BlockType = 
  | 'texto' 
  | 'imagem' 
  | 'video' 
  | 'codigo' 
  | 'quiz' 
  | 'exercicio' 
  | 'divisor' 
  | 'callout' 
  | 'embed';

/** Tipos de componente dentro de um bloco */
export type ComponentType = 
  | 'paragrafo'
  | 'titulo'
  | 'lista'
  | 'imagem'
  | 'video'
  | 'bloco-codigo'
  | 'quiz-multipla-escolha'
  | 'quiz-verdadeiro-falso'
  | 'exercicio-pratico'
  | 'divisor'
  | 'callout-info'
  | 'callout-aviso'
  | 'callout-sucesso'
  | 'callout-erro'
  | 'embed-youtube'
  | 'embed-github'
  | 'embed-figma';

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

/** Componente individual dentro de um bloco */
export interface Component {
  id: string;
  type: ComponentType;
  order: number;
  props: Record<string, unknown>;
  // Props específicas por tipo:
  // paragrafo: { content: string }
  // titulo: { content: string; level: 1 | 2 | 3 }
  // lista: { items: string[]; ordered: boolean }
  // imagem: { mediaId: string; alt: string; caption?: string }
  // video: { mediaId: string; autoplay?: boolean; controls?: boolean }
  // bloco-codigo: { code: string; language: string; filename?: string }
  // quiz-multipla-escolha: { question: string; options: string[]; correctIndex: number; explanation?: string }
  // quiz-verdadeiro-falso: { question: string; correct: boolean; explanation?: string }
  // exercicio-pratico: { instruction: string; starterCode?: string; solution?: string; tests?: string[] }
  // divisor: { style: 'solid' | 'dashed' | 'spaced' }
  // callout-*: { title?: string; content: string }
  // embed-*: { url: string; title?: string }
}

/** Bloco vertical (container de componentes) */
export interface Block {
  id: string;
  type: BlockType;
  order: number;
  components: Component[];
  // Configuração visual do bloco
  layout?: {
    columns?: 1 | 2 | 3; // grid columns para componentes
    gap?: 'sm' | 'md' | 'lg';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    background?: 'transparent' | 'subtle' | 'accent';
  };
}

/** Aula individual */
export interface Lesson extends BaseEntity {
  courseId: string;
  moduleId: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  estimatedMinutes: number;
  blocks: Block[];
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

/** Configuração do grid de componentes no editor */
export interface GridConfig {
  columns: 1 | 2 | 3 | 4 | 6 | 12;
  rows: number;
  gap: number; // px
  breakpoints: {
    mobile: { columns: number; gap: number };
    tablet: { columns: number; gap: number };
    desktop: { columns: number; gap: number };
  };
}

/** Preset de bloco para o painel de autoria */
export interface BlockPreset {
  id: string;
  name: string;
  description: string;
  icon: string; // nome do ícone ou SVG
  category: 'conteudo' | 'media' | 'interativo' | 'layout' | 'avancado';
  blockType: BlockType;
  defaultComponents: Component[];
  defaultLayout?: Block['layout'];
}

/** Configuração do editor visual */
export interface EditorConfig {
  grid: GridConfig;
  availableBlocks: BlockPreset[];
  snapToGrid: boolean;
  showGuides: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // ms
}