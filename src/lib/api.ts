import { auth } from "../firebase";

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
};

function resolveApiUrl(input: string) {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${input}`;
  }

  if (
    typeof window !== "undefined" &&
    input.startsWith("/api") &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return `http://127.0.0.1:5171${input}`;
  }

  return input;
}

function buildFetchErrorMessage(requestUrl: string, error: unknown) {
  const fallback =
    error instanceof Error && error.message ? error.message : "Не удалось выполнить запрос.";

  if (typeof window !== "undefined") {
    const isLocalApi =
      /^https?:\/\/(127\.0\.0\.1|localhost):5171\/api/i.test(requestUrl) ||
      (requestUrl.startsWith("/api") &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname));

    if (isLocalApi) {
      return "Локальный API на 5171 не отвечает. Запустите `npm run dev:server`.";
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  input: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipAuth = false, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);
  const requestUrl = resolveApiUrl(input);

  if (!skipAuth) {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...rest,
      body,
      headers: requestHeaders,
    });
  } catch (error) {
    throw new Error(buildFetchErrorMessage(requestUrl, error));
  }

  const text = await response.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || text || "Ошибка запроса");
  }

  return payload as T;
}
