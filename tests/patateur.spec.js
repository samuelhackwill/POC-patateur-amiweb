import { test, expect } from "@playwright/test";

// Let resize notifications, the scheduled drawing, and mutation delivery settle.
async function settle(page) {
  await page.evaluate(async () => {
    for (let i = 0; i < 4; i += 1) await new Promise(requestAnimationFrame);
  });
}

async function fixture(page, count = 1) {
  await page.goto("/");
  await page.evaluate(async (count) => {
    const { decoratePatateur } = await import("/src/patateur.js");
    const area = document.createElement("section");
    area.id = "fixtures";
    document.body.append(area);
    window.potatoes = Array.from({ length: count }, (_, seed) => {
      const element = document.createElement("div");
      element.style.cssText = "width:300px;padding:20px 30px;color:white;--patateur-fill:#151515";
      const copy = document.createElement("p");
      copy.style.margin = "0";
      copy.textContent = "Text controlled by the application.";
      element.append(copy);
      area.append(element);
      const before = element.getBoundingClientRect().toJSON();
      const controller = decoratePatateur(element, { seed });
      return { element, copy, controller, before };
    });
  }, count);
  await settle(page);
}

test("decoration preserves layout and follows caller content and width changes", async ({ page }) => {
  await fixture(page);
  const initial = await page.evaluate(() => {
    const { element, before } = window.potatoes[0];
    return { before, after: element.getBoundingClientRect().toJSON() };
  });
  expect(initial.after).toEqual(initial.before);
  const svg = page.locator("#fixtures svg");
  await expect(svg).toHaveAttribute("aria-hidden", "true");
  await expect(svg).toHaveCSS("pointer-events", "none");
  await expect(svg.locator("path")).toHaveAttribute("d", /^M .*Z$/);
  const oldBox = await svg.getAttribute("viewBox");
  await page.evaluate(() => {
    const { element, copy } = window.potatoes[0];
    element.style.width = "180px";
    copy.textContent = "Much longer content supplied by the caller. ".repeat(8);
  });
  await expect(svg).not.toHaveAttribute("viewBox", oldBox);
  expect(await svg.getAttribute("viewBox")).toBe(await page.evaluate(() => {
    const { element } = window.potatoes[0];
    return `0 0 ${element.clientWidth} ${element.clientHeight}`;
  }));
  const resizedBox = await svg.getAttribute("viewBox");
  await page.evaluate(() => {
    const { element, controller } = window.potatoes[0];
    element.style.transform = "scale(1.5)";
    controller.refresh();
  });
  await settle(page);
  await expect(svg).toHaveAttribute("viewBox", resizedBox);
});

test("20 instances skip unchanged outlines and coalesce option changes", async ({ page }) => {
  await fixture(page, 20);
  await page.evaluate(() => {
    window.pathWrites = 0;
    window.pathObserver = new MutationObserver((entries) => { window.pathWrites += entries.length; });
    window.pathObserver.observe(document.querySelector("#fixtures"), {
      subtree: true, attributes: true, attributeFilter: ["d"],
    });
    for (const { controller, element } of window.potatoes) {
      controller.refresh();
      controller.refresh();
      element.style.setProperty("--patateur-fill", "#3f5d4a");
    }
  });
  await settle(page);
  expect(await page.evaluate(() => window.pathWrites)).toBe(0);
  await page.evaluate(() => {
    for (const { controller } of window.potatoes) {
      controller.setOptions({ seed: "intermediate" });
      controller.setOptions({ seed: "final" });
      controller.refresh();
    }
  });
  await settle(page);
  expect(await page.evaluate(() => window.pathWrites)).toBe(20);
  // Updating one instance must not rewrite the other 19 outlines.
  await page.evaluate(() => window.potatoes[0].controller.setOptions({ seed: "only-one" }));
  await settle(page);
  expect(await page.evaluate(() => window.pathWrites)).toBe(21);
});

test("same-size padding changes can be refreshed and hidden elements recover", async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => {
    const { element } = window.potatoes[0];
    element.style.height = "160px";
  });
  await settle(page);
  const path = page.locator("#fixtures path");
  const original = await path.getAttribute("d");
  const box = await page.locator("#fixtures svg").getAttribute("viewBox");
  await page.evaluate(() => {
    const { element, controller } = window.potatoes[0];
    element.style.padding = "8px";
    controller.refresh();
  });
  await expect(path).not.toHaveAttribute("d", original);
  await expect(page.locator("#fixtures svg")).toHaveAttribute("viewBox", box);
  await page.evaluate(() => { window.potatoes[0].element.style.display = "none"; });
  await settle(page);
  await page.evaluate(() => {
    const { element } = window.potatoes[0];
    element.style.width = "210px";
    element.style.display = "block";
  });
  await expect(page.locator("#fixtures svg")).toHaveAttribute("viewBox", "0 0 210 160");
});

test("attachment is idempotent and destroy cancels pending work without removing content", async ({ page }) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const { decoratePatateur } = await import("/src/patateur.js");
    const { element, copy, controller } = window.potatoes[0];
    const same = decoratePatateur(element) === controller;
    const count = element.querySelectorAll("svg").length;
    const path = element.querySelector("path");
    const before = path.getAttribute("d");
    controller.setOptions({ seed: "pending" });
    controller.destroy();
    controller.destroy();
    controller.refresh();
    controller.setOptions({ seed: "ignored" });
    element.style.width = "150px";
    for (let i = 0; i < 4; i += 1) await new Promise(requestAnimationFrame);
    return {
      same, count, svgRemoved: !element.querySelector("svg"),
      contentPreserved: element.firstElementChild === copy,
      classRemoved: !element.classList.contains("patateur"),
      pendingCancelled: path.getAttribute("d") === before,
    };
  });
  expect(result).toEqual({
    same: true, count: 1, svgRemoved: true, contentPreserved: true,
    classRemoved: true, pendingCancelled: true,
  });
  await page.evaluate(async () => {
    const { decoratePatateur } = await import("/src/patateur.js");
    decoratePatateur(window.potatoes[0].element);
  });
  await expect(page.locator("#fixtures path")).toHaveAttribute("d", /^M .*Z$/);
});

test("demo controls and responsive drawing use the API", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".patateur-path")).toHaveCount(4);
  const path = page.locator(".is-main .patateur-path");
  await expect(path).toHaveAttribute("d", /^M .*Z$/);
  const before = await path.getAttribute("d");
  await page.locator("#mainSeedInput").fill("456");
  await expect(path).not.toHaveAttribute("d", before);
  await page.locator("#mainTextInput").fill("Short text");
  await expect(page.locator("#previewCopy")).toHaveText("Short text");
  await page.locator("#mainToneInput").selectOption("moss");
  await expect(path).toHaveCSS("fill", "rgb(63, 93, 74)");
  await page.locator("#resetButton").click();
  await page.setViewportSize({ width: 375, height: 812 });
  await settle(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  const sizesMatch = await page.locator("[data-blob-text]").evaluateAll((elements) =>
    elements.every((element) => element.querySelector("svg").getAttribute("viewBox") ===
      `0 0 ${element.clientWidth} ${element.clientHeight}`),
  );
  expect(sizesMatch).toBe(true);
  expect(errors).toEqual([]);
});
