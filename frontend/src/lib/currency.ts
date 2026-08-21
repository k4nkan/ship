export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const value = Math.abs(Math.trunc(amount));

  if (value < 10_000) return `${sign}${value}`;
  if (value === 10_000) return `${sign}10000`;

  const high = Math.floor(value / 10_000);
  const low = value % 10_000;
  return `${sign}${high} ${String(low).padStart(4, "0")}`;
}
