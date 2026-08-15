const nicknameKey = "adventure.nickname";

export function getSavedNickname(): string {
  return localStorage.getItem(nicknameKey) ?? "";
}

export function saveNickname(nickname: string): void {
  localStorage.setItem(nicknameKey, nickname);
}
