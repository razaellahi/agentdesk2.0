import { expect, test } from "@playwright/test";
import { expectShell, login } from "./helpers";

test("recording audio loads authenticated PCM, seeks, changes speed and audits successful play and WAV download", async ({
  page,
}) => {
  await login(page, "supervisor");
  await expectShell(page);
  await page.goto("./recordings");
  const playAudit = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/recording/rec-1/logAction"),
  );
  await page.getByRole("button", { name: "Play", exact: true }).first().click();
  expect((await playAudit).postDataJSON()).toMatchObject({ username: "supervisor", action: "PLAY" });
  const audio = page.locator("audio");
  await expect(audio).toBeVisible();
  await expect
    .poll(() => audio.evaluate((node) => (node as unknown as { duration: number }).duration))
    .toBe(12);
  await audio.evaluate((node) => (node as unknown as { pause: () => void }).pause());
  const waveform = page.getByRole("slider", { name: "waveform", exact: true });
  await waveform.focus();
  await waveform.press("Home");
  await waveform.press("ArrowRight");
  await expect
    .poll(() => audio.evaluate((node) => (node as unknown as { currentTime: number }).currentTime))
    .toBe(5);
  await page.getByRole("button", { name: "1.5×", exact: true }).click();
  expect(await audio.evaluate((node) => (node as unknown as { playbackRate: number }).playbackRate)).toBe(
    1.5,
  );
  const downloadAudit = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/recording/rec-1/logAction"),
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).first().click();
  expect((await downloadEvent).suggestedFilename()).toBe("rec-1.wav");
  expect((await downloadAudit).postDataJSON()).toMatchObject({ username: "supervisor", action: "DOWNLOAD" });
  const failed = page.waitForRequest((request) => request.url().includes("/recording/download/rec-2"));
  await page.getByRole("button", { name: "Play", exact: true }).nth(1).click();
  await failed;
  await expect(page.getByText(/Recording media unavailable/).last()).toBeVisible();
});

test("recordings preserve grouped legs, archive restrictions and user columns", async ({ page }) => {
  await login(page, "supervisor");
  await expectShell(page);
  await page.goto("./recordings");
  const group = page.getByRole("button", { name: "Call CX-1042 · 2 legs" });
  await expect(group).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Play", exact: true }).last()).toBeDisabled();
  await group.click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toHaveCount(1);
  await group.click();
  await page.getByRole("button", { name: "Columns", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Call variable 1", exact: true }).check();
  await dialog.getByRole("button", { name: "Move Call variable 1 up", exact: true }).click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Case 1042", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("cell", { name: "Case 1042", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Duration", exact: true }).click();
  await expect(
    page
      .getByRole("columnheader")
      .filter({ has: page.getByRole("button", { name: "Duration", exact: true }) }),
  ).toHaveAttribute("aria-sort", "ascending");
  const resize = page.getByRole("slider", { name: "Resize Duration column", exact: true });
  const width = Number(await resize.getAttribute("aria-valuenow"));
  await resize.focus();
  await resize.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", String(width + 10));
  const play = page.getByRole("button", { name: "Play", exact: true }).first();
  const box = await play.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("archival creates, updates and isolates EFCX tenant settings", async ({ page }) => {
  await login(page, "admin");
  await expectShell(page);
  await page.goto("./recordings/archival");
  await expect(page.getByText("No existing setting.", { exact: false })).toBeVisible();
  await page.getByRole("switch", { name: "Archiving enabled", exact: true }).check();
  await page.getByLabel("Server", { exact: true }).fill("192.168.1.20");
  await page.getByLabel("Folder", { exact: true }).fill("/root/vrs-archive/support");
  await page.getByLabel("Username", { exact: true }).fill("archive_user");
  await page.getByLabel("Password", { exact: true }).fill("secret123");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved values", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Mode", exact: true }).selectOption("copy_and_archive");
  await page.getByLabel("Copy time").fill("03:30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved values", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Media Recordings", exact: true }).click();
  await page.getByRole("link", { name: "Archival Configuration", exact: true }).click();
  await expect(page.getByLabel("Copy time")).toHaveValue("03:30");
  await page.getByLabel("Tenant ID").fill("another-tenant");
  await page.getByRole("button", { name: "Load tenant" }).click();
  await expect(page.getByText("No existing setting.", { exact: false })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Archiving enabled", exact: true })).not.toBeChecked();
});
