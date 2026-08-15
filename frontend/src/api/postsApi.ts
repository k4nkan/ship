import type { PostInput, PostResult, PostSummary } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4173";

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "API request failed");
  }

  return body;
}

export function fetchPostSummary(): Promise<PostSummary> {
  return requestJson<PostSummary>("/api/posts");
}

export function createPost(input: PostInput): Promise<PostSummary> {
  return requestJson<PostSummary>("/api/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generatePostResult(input: PostInput): Promise<PostResult> {
  return requestJson<PostResult>("/api/gyan/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function clearPosts(): Promise<PostSummary> {
  return requestJson<PostSummary>("/api/posts", { method: "DELETE" });
}
