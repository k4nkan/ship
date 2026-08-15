const previousGyanKey = "adventure.previousGyan";

export function getPreviousGyan(): number {
  return Number(localStorage.getItem(previousGyanKey) ?? 0);
}

export function savePreviousGyan(totalGyan: number): void {
  localStorage.setItem(previousGyanKey, String(totalGyan));
}

export function clearPreviousGyan(): void {
  localStorage.removeItem(previousGyanKey);
}
