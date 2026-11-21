// Test de fumée : chaque module s'ouvre sans erreur JavaScript.
// Les services externes (cartes, polices, bibliothèques) peuvent être indisponibles : seules les erreurs du site comptent.
const { test, expect } = require("@playwright/test");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("dialog", d => d.accept("Test"));
  await page.goto(URL);
  await page.evaluate(() => { localStorage.setItem("osh.terms", '"1.0"'); localStorage.setItem("osh.tourDone", "true"); });
  await page.reload();
  await page.waitForTimeout(1200);
});

test("chaque module s'ouvre sans erreur", async ({ page }) => {
  for (const v of ["dashboard", "search", "map", "photo", "training", "cases", "about", "home"]) {
    await page.evaluate(h => { location.hash = h; }, v);
    await page.waitForTimeout(900);
    await expect(page.locator(`#v-${v}`)).toBeVisible();
  }
  for (const t of ["drills", "gg", "memo", "program"]) {
    await page.evaluate(() => { location.hash = "training"; });
    await page.click(`[data-ttab="${t}"]`);
  }
  expect(page.errors, page.errors.join("\n")).toEqual([]);
  await expect(page.locator("#errBar")).toHaveCount(0);
});

test("créer un dossier, ajouter puis modifier une fiche", async ({ page }) => {
  await page.evaluate(() => { location.hash = "cases"; });
  await page.waitForTimeout(900);
  await page.fill("#newCase", "Dossier de test");
  await page.click("#addCase");
  await expect(page.locator("#caseTitle")).toHaveText("Dossier de test");
  await page.fill("#rClue", "Panneau bleu");
  await page.click("#rAdd");
  await expect(page.locator(".pin-card")).toHaveCount(1);
  await page.click("[data-edit-card]");
  await page.fill("#rClue", "Panneau bleu — A43");
  await page.click("#rAdd");
  await expect(page.locator(".pin-card")).toContainText("A43");
  await page.fill("#caseSearch", "A43");
  await expect(page.locator(".cs-res")).toHaveCount(1);
  expect(page.errors).toEqual([]);
});

test("quiz : une partie complète au clavier", async ({ page }) => {
  await page.evaluate(() => { location.hash = "training"; });
  await page.waitForTimeout(900);
  await page.click('[data-ttab="drills"]');
  await page.click('[data-start="france"]');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".qz-score")).toBeVisible();
  expect(page.errors).toEqual([]);
});
