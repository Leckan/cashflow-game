import { expect, test } from "@playwright/test";

test("the table stays usable on a small screen", async ({ page }) => {
  await page.goto("/play/solo/new?challenge=duplex-on-the-table");
  await expect(page.getByRole("heading", { name: "The duplex is on the table" })).toBeVisible();
  await page.getByTestId("start-game").click();
  await expect(page.getByTestId("roll-dice")).toBeVisible();
  await expect(page.getByTestId("cash-balance")).toBeVisible();

  await page.getByTestId("flat-toggle").click();
  await expect(page.getByTestId("board-flat")).toBeVisible();

  await page.keyboard.press("r");
  await expect(page.getByRole("heading", { name: "Maple Street Duplex" })).toBeVisible();
  await page.getByTestId("option-decline").click();
  await expect(page.getByTestId("cash-balance")).toHaveText("$50,000.00");
  await page.getByTestId("end-turn").click();
  await expect(page.getByTestId("roll-dice")).toBeVisible();
});
