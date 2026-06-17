const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = "http://127.0.0.1:4173/";
const outputDir = path.join(__dirname, "..", "artifacts");

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small", width: 320, height: 700 },
];

async function verifyViewport(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const metrics = await page.evaluate(() => ({
    projectCards: document.querySelectorAll(".project-card").length,
    projectImages: document.querySelectorAll(".project-image").length,
    yearSections: document.querySelectorAll(".year-section").length,
    heroHeight: Math.round(document.querySelector(".hero").getBoundingClientRect().height),
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    brokenImages: [...document.images].filter(
      (image) => image.complete && image.naturalWidth === 0,
    ).length,
  }));

  if (metrics.projectCards !== 43) {
    throw new Error(`${viewport.name}: expected 43 project cards`);
  }
  if (metrics.projectImages !== 71) {
    throw new Error(`${viewport.name}: expected 71 project images`);
  }
  if (metrics.yearSections !== 5) {
    throw new Error(`${viewport.name}: expected 5 year sections`);
  }
  if (Math.abs(metrics.heroHeight - metrics.viewportHeight) > 2) {
    throw new Error(`${viewport.name}: hero is not viewport height`);
  }
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    throw new Error(`${viewport.name}: horizontal overflow detected`);
  }
  if (metrics.brokenImages > 0) {
    throw new Error(`${viewport.name}: broken images detected`);
  }

  await page.screenshot({
    path: path.join(outputDir, `portfolio-${viewport.name}-hero.png`),
    fullPage: false,
  });

  const firstCard = page.locator(".project-image").first();
  const firstTitle = await firstCard
    .locator("xpath=ancestor::article[1]")
    .locator(".project-card__title")
    .textContent();
  await firstCard.click();
  await page.locator("#project-viewer[open]").waitFor();

  const viewerState = await page.evaluate(() => ({
    bodyLocked: document.body.classList.contains("viewer-open"),
    title: document.querySelector("#viewer-title").textContent,
    slides: document.querySelectorAll(".viewer__slide").length,
  }));
  if (!viewerState.bodyLocked || viewerState.title !== firstTitle) {
    throw new Error(`${viewport.name}: viewer did not open correctly`);
  }
  if (viewerState.slides < 1) {
    throw new Error(`${viewport.name}: viewer has no slides`);
  }

  if (viewport.name === "desktop") {
    await page.screenshot({
      path: path.join(outputDir, "portfolio-desktop-viewer.png"),
      fullPage: false,
    });
  }

  await page.keyboard.press("ArrowRight");
  const nextTitle = await page.locator("#viewer-title").textContent();
  if (nextTitle === firstTitle) {
    throw new Error(`${viewport.name}: keyboard project navigation failed`);
  }

  await page.keyboard.press("Escape");
  await page.locator("#project-viewer").waitFor({ state: "hidden" });

  if (viewport.name === "desktop") {
    const multiProjectIndex = await page.evaluate(() =>
      window.PORTFOLIO_PROJECTS.findIndex(
        (project) => project.year === 2025 && project.name === "VNA",
      ),
    );
    await page
      .locator(`[data-project-index="${multiProjectIndex}"]`)
      .first()
      .click();
    await page.locator("#project-viewer[open]").waitFor();

    const multiSlideCount = await page.locator(".viewer__slide").count();
    if (multiSlideCount !== 5) {
      throw new Error("desktop: expected five slides for 2025 VNA");
    }
    await page.locator(".viewer__slide").last().scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => document.querySelector("#viewer-current").textContent === "05",
    );
    await page.keyboard.press("Escape");
    await page.locator("#project-viewer").waitFor({ state: "hidden" });
  }

  await page.screenshot({
    path: path.join(outputDir, `portfolio-${viewport.name}.png`),
    fullPage: false,
  });

  await page.close();
  return { ...metrics, consoleErrors, failedRequests };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
  });

  try {
    const results = [];
    for (const viewport of viewports) {
      results.push({
        viewport: viewport.name,
        ...(await verifyViewport(browser, viewport)),
      });
    }

    const errors = results.flatMap((result) => result.consoleErrors);
    const failures = results.flatMap((result) => result.failedRequests);
    if (errors.length || failures.length) {
      throw new Error(
        `Browser errors: ${errors.join(" | ")}; failed requests: ${failures.join(" | ")}`,
      );
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
