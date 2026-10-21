// src/lib/api.ts — thin fetch wrapper with credentials and JSON handling
export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  // API callers pass JSON.stringify(...) strings. Fetch does not infer their
  // media type, so ASP.NET [FromBody] actions may reject them without this.
  const body = init.body;
  const isJsonObjectOrArray =
    typeof body === "string" && /^\s*[\[{]/.test(body);
  if (isJsonObjectOrArray && !Object.keys(headers).some(key => key.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}

export async function apiJson<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    throw Object.assign(new Error(`API ${res.status}`), { status: res.status, body, response: res });
  }
  // 204 no content
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

export function isUnauthorized(err: unknown): boolean {
  return !!(err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401);
}
