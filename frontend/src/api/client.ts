import { env } from "../lib/env";

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch (error) {
    throw new Error("API接続に失敗しました", { cause: error });
  }

  const body = (await response.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.detail ?? body.error ?? "API request failed");
  }

  return body as T;
}
