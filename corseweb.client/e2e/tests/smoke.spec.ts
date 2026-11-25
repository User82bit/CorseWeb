import { expect, test, type Page } from "@playwright/test";

const student = {
  id: "e2e-student",
  name: "Aluno E2E",
  email: "aluno.e2e@example.test",
  role: "user" as const,
};

function courseFixture() {
  return {
    id: "course-e2e",
    slug: "e2e-course",
    title: "Curso de demonstração E2E",
    description: "Curso isolado usado nos testes de navegador.",
    category: "Tecnologia",
    level: "Iniciante",
    status: "publicado",
    language: "pt-BR",
    thumbnail: { id: "cover-e2e", type: "image", url: "/course-cover-placeholder.svg", alt: "Curso E2E" },
    tags: [],
    modules: [{
      id: "module-e2e",
      title: "Módulo E2E",
      order: 0,
      lessons: [{
        id: "lesson-e2e",
        slug: "lesson-one",
        title: "Aula de diagnóstico",
        description: "Aula usada para verificar a gravação de progresso.",
        order: 0,
        isPublished: true,
        estimatedMinutes: 5,
        nodes: [],
        connections: [],
      }],
    }],
    totalModules: 1,
    totalLessons: 1,
    totalMinutes: 5,
    allowComments: true,
    allowFork: false,
    isFeatured: false,
    authorId: "author-e2e",
    authorName: "Autor E2E",
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "author-e2e",
    updatedBy: "author-e2e",
  };
}

function enrollmentFixture() {
  return {
    courseId: "course-e2e",
    enrolledAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    overallPercent: 0,
    currentLessonId: null,
    lastAccessedAt: "2026-01-01T00:00:00.000Z",
    modulesProgress: [{
      moduleId: "module-e2e",
      percent: 0,
      lessons: [{
        lessonId: "lesson-e2e",
        status: "nao-iniciado",
        timeSpentMinutes: 0,
      }],
    }],
    quizAttempts: [],
    exerciseAttempts: [],
    certificate: null,
    scriptEffects: [],
  };
}

async function installStudentSession(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem("corseweb:user:v1", JSON.stringify(user));
  }, student);

  await page.route("**/api/auth/me", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(student),
  }));
}

test.describe("E2E-001 · fluxos essenciais", () => {
  test("catálogo público apresenta cursos em viewport mobile e desktop", async ({ page }) => {
    const course = courseFixture();

    await page.route("**/api/auth/me", route => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    }));
    await page.route("**/api/courses", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([course]),
    }));
    await page.route("**/api/drafts", route => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    }));

    await page.goto("/courses");

    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByText(course.title, { exact: true }).first()).toBeVisible();
    }
  });

  test("rota de aluno exige sessão autenticada", async ({ page }) => {
    await page.route("**/api/auth/me", route => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    }));

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("usuário comum não acessa rotas administrativas", async ({ page }) => {
    await installStudentSession(page);
    await page.route("**/api/courses", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }));
    await page.route("**/api/drafts", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }));

    await page.goto("/admin/courses/new");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("falha ao salvar progresso exibe o detalhe retornado pela API e permite tentar novamente", async ({ page }) => {
    const course = courseFixture();
    let progressRequests = 0;
    let lastProgressBody: unknown = null;

    await installStudentSession(page);
    await page.route("**/api/courses", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([course]),
    }));
    await page.route("**/api/drafts", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }));
    await page.route("**/api/enrollments", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([enrollmentFixture()]),
    }));
    await page.route("**/api/enrollments/e2e-course/progress", async route => {
      if (route.request().method() === "PUT") {
        progressRequests += 1;
        lastProgressBody = route.request().postDataJSON();
      }
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Aula não publicada ou não pertencente ao curso" }),
      });
    });

    await page.goto("/app/courses/e2e-course/lessons/lesson-one");

    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Não foi possível salvar seu progresso");
    await expect(alert).toContainText("Aula não publicada ou não pertencente ao curso");
    expect(lastProgressBody).toEqual({ currentLessonId: "lesson-e2e" });

    await page.getByRole("button", { name: /tentar novamente/i }).click();
    await expect.poll(() => progressRequests).toBeGreaterThanOrEqual(2);
  });
});
