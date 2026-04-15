import { expect, test } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Visual E2E proof: drives the playground in Chromium and captures one
 * screenshot per sample scenario into `e2e/tests/screenshots/`. The resulting
 * PNG files are referenced by `e2e-proof.md` so the proof document is actually
 * visual, not just prose.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(here, 'screenshots');

test.describe.configure({ mode: 'serial' });

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function screenshot(page: import('@playwright/test').Page, name: string) {
  // Let Chart.js finish its first animation frame before snapping.
  await page.waitForTimeout(250);
  await page.screenshot({
    path: `${SHOTS}/${name}.png`,
    fullPage: true,
  });
}

test('01 basic bar — canvas rendered', async ({ page }) => {
  await page.getByTestId('sample-basic-bar').click();
  await expect(page.getByTestId('chart-0').locator('canvas')).toBeVisible();
  await screenshot(page, '01-basic-bar');
});

test('02 multi-chart report — three charts in one document', async ({ page }) => {
  await page.getByTestId('sample-multi-report').click();
  await expect(page.getByTestId('chart-0')).toHaveAttribute('data-chart-type', 'line');
  await expect(page.getByTestId('chart-1')).toHaveAttribute('data-chart-type', 'doughnut');
  await expect(page.getByTestId('chart-2')).toHaveAttribute('data-chart-type', 'bar');
  await screenshot(page, '02-multi-chart-report');
});

test('03 print URL — drift badge visible', async ({ page }) => {
  await page.getByTestId('sample-with-print').click();
  await expect(page.getByTestId('chart-0-drift')).toBeVisible();
  await screenshot(page, '03-with-print-url-drift');
});

test('04 invalid JSON — error badge with valid chart below still rendering', async ({ page }) => {
  await page.getByTestId('sample-invalid-json').click();
  await expect(page.getByTestId('chart-0')).toHaveClass(/chart-markup-invalid/);
  await expect(page.getByTestId('chart-1').locator('canvas')).toBeVisible();
  await screenshot(page, '04-invalid-json-error-state');
});

test('05 live edit — changing source re-renders chart type', async ({ page }) => {
  await page.getByTestId('sample-basic-bar').click();
  const textarea = page.getByTestId('playground-source');
  const source = (await textarea.inputValue()).replace('"type": "bar"', '"type": "line"');
  await textarea.fill(source);
  await expect(page.getByTestId('chart-0')).toHaveAttribute('data-chart-type', 'line');
  await screenshot(page, '05-live-edit-bar-to-line');
});

test('06 annual dashboard — five charts interleaved with prose', async ({ page }) => {
  await page.getByTestId('sample-annual-dashboard').click();
  await expect(page.getByTestId('chart-0')).toHaveAttribute('data-chart-type', 'bar');
  await expect(page.getByTestId('chart-1')).toHaveAttribute('data-chart-type', 'line');
  await expect(page.getByTestId('chart-2')).toHaveAttribute('data-chart-type', 'doughnut');
  await expect(page.getByTestId('chart-3')).toHaveAttribute('data-chart-type', 'radar');
  await expect(page.getByTestId('chart-4')).toHaveAttribute('data-chart-type', 'bar');
  await screenshot(page, '06-annual-dashboard');
});
