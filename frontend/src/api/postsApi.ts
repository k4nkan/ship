import type {
  JourneyState,
  PostInput,
  PostResult,
  PostSummary,
} from "../types";
import { requestJson } from "./client";

export function fetchPostSummary(): Promise<PostSummary> {
  return requestJson<PostSummary>("/api/posts");
}

export function fetchJourney(): Promise<JourneyState> {
  return requestJson<JourneyState>("/api/journey");
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
