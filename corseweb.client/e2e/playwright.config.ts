import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(configDirectory, "..");
const repositoryRoot = resolve(clientRoot, "..");
const serverProject = join(repositoryRoot, "CorseWeb.Server", "CorseWeb.Server.csproj");

const apiPort = 51089;
const webPort = 49189;
const databasePath = join(tmpdir(), `corseweb-e2e-${randomUUID()}.db`);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `dotnet run --project "${serverProject}" --configuration Release --no-launch-profile`,
      cwd: repositoryRoot,
      url: `http://127.0.0.1:${apiPort}/api/auth/config`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: "Testing",
        ASPNETCORE_URLS: `http://127.0.0.1:${apiPort}`,
        ConnectionStrings__DefaultConnection: `Data Source=${databasePath};Foreign Keys=True`,
        Logging__LogLevel__Default: "Warning",
        Logging__LogLevel__Microsoft_AspNetCore: "Warning",
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort}`,
      cwd: clientRoot,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_DEV_HTTPS: "false",
        VITE_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
