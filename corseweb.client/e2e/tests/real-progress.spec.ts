import { expect, test } from "@playwright/test";

const appOrigin = "http://127.0.0.1:49189";

test("E2E-001 · API real: aluno atualiza e conclui progresso persistido", async ({ page }) => {
  await page.goto("/");

  const api = page.context().request;
  const email = `aluno-${Date.now()}@corseweb.e2e`;
  const password = "StrongPassword123!";

  const registration = await api.post(`${appOrigin}/api/auth/register`, {
    data: {
      name: "Aluno E2E Real",
      email,
      password,
    },
  });
  expect(registration.status(), "registration must create an authenticated test student").toBe(200);

  const coursePayload = {
    title: "Curso E2E de progresso real",
    description: "Curso isolado para verificar o progresso no banco de dados.",
    category: "Testes automatizados",
    tags: [],
    level: "Iniciante",
    language: "pt-BR",
    thumbnail: null,
    modules: [{
      id: "module-e2e-real",
      title: "Módulo de teste",
      isPublished: true,
      lessons: [{
        id: "lesson-e2e-real",
        slug: "aula-progresso-real",
        title: "Aula de progresso real",
        description: "Aula criada pelo teste ponta a ponta com backend real.",
        order: 0,
        isPublished: true,
        estimatedMinutes: 5,
        nodes: [],
        connections: [],
      }],
    }],
    allowComments: false,
    allowFork: false,
  };

  const createdCourseResponse = await api.post(`${appOrigin}/api/courses`, {
    data: coursePayload,
  });
  expect(createdCourseResponse.status(), "authenticated student must create the test course").toBe(201);
  const course = await createdCourseResponse.json() as { id: string; slug: string };

  const enrollmentResponse = await api.post(`${appOrigin}/api/enrollments/${course.slug}`);
  expect(enrollmentResponse.status(), "student must enroll in the published test course").toBe(201);

  const progressResponsePromise = page.waitForResponse(response =>
    response.url().includes(`/api/enrollments/${course.slug}/progress`)
    && response.request().method() === "PUT",
  );

  await page.goto(`/app/courses/${course.slug}/lessons/aula-progresso-real`);

  const progressResponse = await progressResponsePromise;
  expect(progressResponse.status(), "opening a lesson must persist navigation progress").toBe(200);
  await expect(page.getByRole("heading", { name: "Aula de progresso real" })).toBeVisible();

  const completeButton = page.getByRole("button", { name: /marcar aula como concluída/i });
  await expect(completeButton).toBeEnabled();

  const completionResponsePromise = page.waitForResponse(response =>
    response.url().includes(`/api/enrollments/${course.slug}/lessons/lesson-e2e-real/complete`)
    && response.request().method() === "POST",
  );
  await completeButton.click();

  const completionResponse = await completionResponsePromise;
  expect(completionResponse.status(), "lesson completion must be accepted by the real API").toBe(200);
  await expect(page.getByRole("button", { name: /aula concluída/i })).toBeDisabled();

  const enrollmentList = await api.get(`${appOrigin}/api/enrollments`);
  expect(enrollmentList.status()).toBe(200);
  const enrollments = await enrollmentList.json() as Array<{
    courseId: string;
    overallPercent: number;
    modulesProgress: Array<{
      lessons: Array<{ lessonId: string; status: string }>;
    }>;
  }>;
  const persisted = enrollments.find(item => item.courseId === course.id);

  expect(persisted, "server must return the created enrollment").toBeDefined();
  expect(persisted?.overallPercent).toBe(100);
  expect(
    persisted?.modulesProgress.flatMap(module => module.lessons)
      .find(lesson => lesson.lessonId === "lesson-e2e-real")?.status,
  ).toBe("concluido");

  await page.reload();
  await expect(page.getByRole("button", { name: /aula concluída/i })).toBeDisabled();
});
