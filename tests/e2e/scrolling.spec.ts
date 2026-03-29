import { test, expect } from '@playwright/test';

test('main content has mobile smooth scrolling styles', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 375, height: 812 }); // mobile viewport

  const main = page.locator('.main-content');
  await expect(main).toBeVisible();

  // Check computed styles
  const scrollBehavior = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('scroll-behavior');
  });

  const webkitOverflow = await page.evaluate(() => {
    const el = document.querySelector('.main-content');
    return el ? getComputedStyle(el).getPropertyValue('-webkit-overflow-scrolling') : '';
  });

  // The CSS unit test already ensures the rule exists in the stylesheet. Here we assert computed values where supported.
  expect(scrollBehavior.trim()).toBe('smooth');
  // Some browsers may not expose -webkit-overflow-scrolling; accept either 'touch' or empty string
  expect(['touch', '']).toContain(webkitOverflow.trim());
});
