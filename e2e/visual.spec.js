const { test, expect } = require("@playwright/test");

function formatCurrency(amount) {
  const value = Math.abs(Math.trunc(amount));
  if (value < 10000) return `${amount < 0 ? "-" : ""}${value}`;
  if (value === 10000) return `${amount < 0 ? "-" : ""}10000`;
  return `${amount < 0 ? "-" : ""}${Math.floor(value / 10000)} ${String(
    value % 10000,
  ).padStart(4, "0")}`;
}

test("Adminの配布と使用がレース画面・チーム詳細へ反映される", async ({
  page,
}) => {
  const beforeResponse = await page.request.get(
    "http://127.0.0.1:8010/api/teams",
  );
  expect(beforeResponse.ok()).toBeTruthy();
  const before = await beforeResponse.json();
  const teamBefore = before.teams.find((team) => team.id === "A");

  await page.goto("http://127.0.0.1:5174/");
  await expect(page.getByLabel("読み込み中")).toBeHidden();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator(".race-team-row")).toHaveCount(6);
  await expect(page.getByText("A班", { exact: false }).first()).toBeVisible();

  await page.goto("http://127.0.0.1:5174/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.locator("#admin-password").fill("test-admin-password");
  await page.getByRole("button", { name: "管理画面に入る" }).click();
  await expect(page.getByRole("heading", { name: "通貨を配布・使用する" })).toBeVisible();

  const firstTeamCard = page.locator(".admin-team-card").filter({ hasText: "A班" });
  await firstTeamCard.getByRole("button", { name: "+10000" }).click();
  await expect(firstTeamCard).toContainText(
    `残高 ${formatCurrency(teamBefore.balance + 10000)} 通貨`,
  );
  await firstTeamCard.getByRole("button", { name: "-10000", exact: true }).click();
  await expect(firstTeamCard).toContainText(
    `残高 ${formatCurrency(teamBefore.balance)} 通貨`,
  );

  await page.getByRole("button", { name: "スタート" }).click();
  await expect(page.getByText("レース運航中")).toBeVisible();
  await page.getByRole("button", { name: "ストップ" }).click();
  await expect(page.getByText("レース停止中")).toBeVisible();

  await page.getByRole("link", { name: "全体画面へ" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(page.locator(".race-team-row").filter({ hasText: "A班" })).toContainText(
    `${formatCurrency(teamBefore.earnedCurrency + 10000)}`,
  );

  const selectedTeamRow = page.locator(".race-team-row").filter({ hasText: "A班" });
  await selectedTeamRow.click();
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(selectedTeamRow).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "全体を見る" }).click();
  await expect(selectedTeamRow).toHaveAttribute("aria-pressed", "false");

  await page.goto("http://127.0.0.1:5174/teams/A");
  await expect(page.getByText("現在順位")).toBeVisible();
  await expect(page.getByText("現在残高")).toBeVisible();
  await expect(page.getByText("使用済み")).toBeVisible();
});
