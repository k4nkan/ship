const { test, expect } = require("@playwright/test");

test("GYAN posting flow updates the map", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "canShare", { value: undefined });
    window.__downloadRequest = null;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        window.__downloadRequest = {
          filename: this.download,
          href: this.href,
        };
      }
    };
  });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.request.delete("http://127.0.0.1:8010/api/posts");
  await page.goto("http://127.0.0.1:5174/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await expect(page.getByLabel("読み込み中")).toBeHidden();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#current-gyan")).toHaveText("0");
  await expect(page.locator("#current-area")).toBeVisible();
  await expect(page.locator("#current-coordinate")).toBeVisible();
  await expect(page.locator("#remaining-distance")).toBeVisible();
  await expect(page.locator("#arrival-time")).toBeVisible();
  const statusPanelBox = await page.locator(".map-status-panel").boundingBox();
  expect(statusPanelBox.width).toBeLessThan(340);
  const currentLocationButton = page.getByRole("button", {
    name: "現在地へ移動",
  });
  await expect(currentLocationButton).toBeVisible();
  await currentLocationButton.click();
  await expect(currentLocationButton).toHaveAttribute("aria-pressed", "true");
  await expect(currentLocationButton).toBeDisabled();
  await expect(currentLocationButton).toBeEnabled({ timeout: 2000 });
  await page.mouse.move(300, 180);
  await page.mouse.down();
  await page.mouse.move(340, 220);
  await page.mouse.up();
  await expect(currentLocationButton).toHaveAttribute("aria-pressed", "false");
  await currentLocationButton.click();
  await expect(currentLocationButton).toBeEnabled({ timeout: 2000 });
  await expect(page.getByRole("button", { name: "GYANを送る" })).toBeVisible();

  await page.route("**/api/posts", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "GYANを送る" }).click();
  await expect(page.locator("#team")).toHaveValue("A");
  await expect(
    page.getByRole("button", { name: "カメラを起動" }),
  ).toBeVisible();
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
  await expect(page.getByLabel("GYANを生成中…")).toBeVisible();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator("#result-content")).toContainText("レポート");
  await expect(page.getByLabel("投稿画像プレビュー")).toBeVisible();
  const saveButton = page.getByRole("button", { name: "投稿画像を保存" });
  await expect(saveButton).toBeVisible();
  await saveButton.click();
  await expect
    .poll(() => page.evaluate(() => window.__downloadRequest?.filename))
    .toMatch(/^gyan-.+\.png$/);
  await page.getByRole("button", { name: "マップに戻る" }).click();

  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  const scrollMetrics = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement.scrollHeight,
    clientHeight: document.scrollingElement.clientHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeLessThanOrEqual(
    scrollMetrics.clientHeight,
  );
  await expect(page.locator("#current-gyan")).not.toHaveText("0");
  expect(errors).toEqual([]);
});

test("mobile upload falls back when WebP encoding is unavailable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      return originalToBlob.call(
        this,
        callback,
        type === "image/webp" ? "image/png" : type,
        quality,
      );
    };
  });

  await page.goto("http://127.0.0.1:5174/");
  const mobileMapScrollMetrics = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement.scrollHeight,
    clientHeight: document.scrollingElement.clientHeight,
  }));
  expect(mobileMapScrollMetrics.scrollHeight).toBeLessThanOrEqual(
    mobileMapScrollMetrics.clientHeight,
  );

  await page.goto("http://127.0.0.1:5174/post");
  await expect(page.locator("#camera")).toHaveAttribute(
    "capture",
    "environment",
  );
  const formBounds = await page.locator(".form-screen").boundingBox();
  expect(formBounds.y + formBounds.height).toBeLessThanOrEqual(844);

  const photoInput = page.locator("#photo");
  await expect(photoInput).not.toHaveAttribute("capture", /.+/);
  await photoInput.setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  });

  const preview = page.locator("#photo-preview img");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("src", /^data:image\/jpeg/);
});
