import { expect, test } from '@playwright/test';

/**
 * Hand-to-hand tests that drive the playground in a real browser. They are the
 * strongest confidence signal for the plugin because they exercise the full
 * parse → render → Chart.js pipeline against actual DOM.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('basic bar chart renders a canvas', async ({ page }) => {
  await page.getByTestId('sample-basic-bar').click();
  const block = page.getByTestId('chart-0');
  await expect(block).toHaveAttribute('data-chart-type', 'bar');
  await expect(block.locator('canvas')).toBeVisible();
});

test('multi-chart report renders three independent blocks', async ({ page }) => {
  await page.getByTestId('sample-multi-report').click();
  await expect(page.getByTestId('chart-0')).toHaveAttribute('data-chart-type', 'line');
  await expect(page.getByTestId('chart-1')).toHaveAttribute('data-chart-type', 'doughnut');
  await expect(page.getByTestId('chart-2')).toHaveAttribute('data-chart-type', 'bar');
});

test('print URL sample shows a drift warning (hash is intentionally stale)', async ({ page }) => {
  await page.getByTestId('sample-with-print').click();
  await expect(page.getByTestId('chart-0-drift')).toBeVisible();
});

test('invalid JSON sample renders the error state without killing the page', async ({ page }) => {
  await page.getByTestId('sample-invalid-json').click();
  const first = page.getByTestId('chart-0');
  await expect(first).toHaveClass(/chart-markup-invalid/);
  await expect(first.locator('.chart-markup-error')).toContainText('Invalid');
  // The valid chart below the broken one should still render.
  const second = page.getByTestId('chart-1');
  await expect(second).toHaveAttribute('data-chart-type', 'pie');
  await expect(second.locator('canvas')).toBeVisible();
});

test('editing the source textarea re-renders the chart type attribute', async ({ page }) => {
  await page.getByTestId('sample-basic-bar').click();
  const textarea = page.getByTestId('playground-source');
  const source = (await textarea.inputValue()).replace('"type": "bar"', '"type": "line"');
  await textarea.fill(source);
  await expect(page.getByTestId('chart-0')).toHaveAttribute('data-chart-type', 'line');
});

test('switching samples updates the preview panel', async ({ page }) => {
  await page.getByTestId('sample-basic-bar').click();
  await expect(page.getByTestId('chart-0')).toHaveAttribute('data-chart-type', 'bar');
  await page.getByTestId('sample-multi-report').click();
  await expect(page.getByTestId('chart-2')).toBeVisible();
});

test('chart toolbar is present on every rendered chart', async ({ page }) => {
  await page.getByTestId('sample-multi-report').click();
  for (let i = 0; i < 3; i += 1) {
    await expect(page.getByTestId(`chart-${i}`).getByTestId('chart-toolbar')).toBeVisible();
  }
});
