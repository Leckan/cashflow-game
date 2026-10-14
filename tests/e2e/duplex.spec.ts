import { expect, test } from "@playwright/test";

test("a visitor can buy the Maple Street drill and resume it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "WealthQuest" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Put a paycheck on the table.");
  await page.getByTestId("start-solo").click();
  await page.getByTestId("duplex-drill").click();
  await expect(page.getByTestId("profile-select")).toBeDisabled();
  await page.getByTestId("start-game").click();

  await expect(page.getByTestId("roll-dice")).toBeVisible();
  await expect(page.getByTestId("board-region")).toBeVisible();
  await page.getByTestId("roll-dice").click();
  await expect(page.getByRole("heading", { name: "Maple Street Duplex" })).toBeVisible();
  await page.getByRole("button", { name: "Review details" }).click();
  await expect(page.getByText(/Hypothetical/i).first()).toBeVisible();
  await page.getByTestId("option-buy").click();
  await expect(page.getByTestId("cash-balance")).toHaveText("$10,000.00");

  await page.getByTestId("statement-tab").click();
  await expect(page.getByTestId("asset-maple-street-duplex")).toBeVisible();
  await expect(page.getByTestId("financial-statement")).toContainText("Rental income");

  await page.getByTestId("end-turn").click();
  await expect(page.getByTestId("game-ending")).toContainText(/challenge complete/i);

  await page.reload();
  await expect(page.getByTestId("game-ending")).toContainText(/challenge complete/i);
  await expect(page.getByTestId("cash-balance")).toBeVisible();
});
