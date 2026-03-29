import { test, expect } from '@playwright/test';

test('hamburger opens and closes sidebar (no overlay)', async ({ page }) => {
  await page.goto('/');

  const hamburger = page.locator('.hamburger');
  const sidebar = page.locator('.sidebar');

  await expect(hamburger).toBeVisible();

  // open
  await hamburger.click();
  await expect(sidebar).toHaveClass(/active/);
  await expect(page.locator('body')).toHaveClass(/no-scroll/);

  // close using Escape key (no overlay present)
  await page.keyboard.press('Escape');
  await expect(sidebar).not.toHaveClass(/active/);
  await expect(page.locator('body')).not.toHaveClass(/no-scroll/);
});
