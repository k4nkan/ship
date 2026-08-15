const { test, expect } = require("@playwright/test");

test("GYAN posting flow updates the map", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.request.delete("http://127.0.0.1:4173/api/posts");
  await page.goto("http://127.0.0.1:5173/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#current-gyan")).toHaveText("0");

  await page.goto("http://127.0.0.1:5173/post?team=A");
  await expect(page.locator("#team")).toHaveValue("A");
  await page.locator("#nickname").fill("kanta");
  await page.locator("#comment").fill("班で新しいプロトタイプを作った");
  await page.locator("#photo").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.locator("#photo-preview img")).toBeVisible();
  await page.getByRole("button", { name: "投稿する" }).click();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator("#result-content")).toContainText("獲得GYAN");
  await page.getByRole("button", { name: "マップに戻る" }).click();

  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await expect(page.locator("#current-gyan")).not.toHaveText("0");
  expect(errors).toEqual([]);
});
