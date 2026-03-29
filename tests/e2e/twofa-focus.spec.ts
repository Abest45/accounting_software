import { test, expect } from '@playwright/test';

test('Focus returns to password input after closing 2FA modal', async ({ page }) => {
  // Simulate server telling login requires 2FA
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, requires2FA: true, userId: '1' })
    });
  });

  await page.goto('http://localhost:3000/auth-forms.html');

  await page.fill('#userLoginEmail', 'test@example.com');
  await page.fill('#userLoginPassword', 'password');
  await page.click('#userLoginForm .submit-btn');

  // Wait for modal to appear
  await page.waitForSelector('#twoFALoginModal', { state: 'visible' });

  // Close modal via close button (simulate user cancel)
  await page.click('#close2FALogin');

  // Wait for focus to return to password input
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'userLoginPassword');
  const focused = await page.evaluate(() => document.activeElement.id);
  expect(focused).toBe('userLoginPassword');
});
