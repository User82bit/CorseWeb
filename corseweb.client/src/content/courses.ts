// ============================================================
// SISTEMA DE CONTEÚDO — Dados de curso genéricos e reutilizáveis
// ============================================================

import type { Course, Tag } from '../types/course';

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
