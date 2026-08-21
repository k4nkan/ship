import type {
  JourneyState,
  PostInput,
  PostResult,
  PostSummary,
  TeamList,
} from "../types";
import { requestJson } from "./client";

export type AdminSession = {
  token: string;
};

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

export function fetchTeams(): Promise<TeamList> {
  return requestJson<TeamList>("/api/teams");
}

export function updateTeamCurrency(
  teamId: string,
  amount: number,
  adminToken: string,
): Promise<TeamList> {
  return requestJson<TeamList>(`/api/teams/${teamId}/currency`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ amount }),
  });
}

export function updateRace(
  action: "start" | "stop",
  adminToken: string,
): Promise<TeamList> {
  return requestJson<TeamList>(`/api/race/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

export function authenticateAdmin(password: string): Promise<AdminSession> {
  return requestJson<AdminSession>("/api/admin/auth", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}
