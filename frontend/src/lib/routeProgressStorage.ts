const previousProgressKey = "adventure.previousProgress";

export function getPreviousProgress(): number {
  return Number(localStorage.getItem(previousProgressKey) ?? 0);
}

export function savePreviousProgress(progress: number): void {
  localStorage.setItem(previousProgressKey, String(progress));
}
