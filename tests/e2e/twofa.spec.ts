import { test, expect } from '@playwright/test';

test('Login requires 2FA and completes flow', async ({ page }) => {
  // Intercept login to simulate server response indicating 2FA is required
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, requires2FA: true, userId: '1' })
    });
  });

  // Intercept 2FA verify endpoint to return successful access token
  await page.route('**/api/2fa/verify-login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'abc123', user: { id: 1, email: 'test@example.com' } })
    });
  });

  // Open the auth page (serve locally using `npm run serve`)
  await page.goto('http://localhost:3000/auth-forms.html');

  // Fill login form
  await page.fill('#userLoginEmail', 'test@example.com');
  await page.fill('#userLoginPassword', 'password');
  await page.click('#userLoginForm .submit-btn');

  // Wait for 2FA modal to appear
  await page.waitForSelector('#twoFALoginModal', { state: 'visible' });

  // Enter 2FA code and verify
  await page.fill('#twoFALoginToken', '123456');
  await page.click('#verify2FALogin');

  // Ensure session token is stored and we were redirected
  await page.waitForTimeout(100); // give script time to set localStorage
  const session = await page.evaluate(() => localStorage.getItem('sessionToken'));
  expect(session).toBe('abc123');

  await expect(page).toHaveURL(/.*\/dashboard/);
});
