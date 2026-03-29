import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// Helper markup for the 2FA modal
const modalMarkup = `
  <div id="twoFALoginModal" style="display:block">
    <input id="twoFALoginToken" type="text" inputmode="numeric" maxlength="12">
    <div>
      <span id="twoFALoginStatus"></span>
      <span id="twoFALoginSpinner" style="display:none"></span>
    </div>
    <button id="verify2FALogin">Verify</button>
    <button id="close2FALogin">Close</button>
    <div id="modalBackdrop"></div>
  </div>
`;

describe('TwoFALogin frontend behavior', () => {
  let TwoFALogin;

  beforeEach(async () => {
    // Prepare DOM
    document.body.innerHTML = modalMarkup;

    // Import the component (executes file and hooks into DOM)
    await import('../components-2fa-reports.js');
    TwoFALogin = window.TwoFALogin;
    TwoFALogin.init();

    // Ensure storage is clean
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows error when token is empty', async () => {
    // Ensure input is empty
    const tokenEl = document.getElementById('twoFALoginToken');
    tokenEl.value = '';

    await TwoFALogin.verifyLogin();

    const status = document.getElementById('twoFALoginStatus');
    expect(status.textContent).toContain('Please enter a code');
  });

  it('stores session token and redirects on successful verification', async () => {
    // Mock fetch to return success
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'abc123', user: { id: 1, email: 'test@example.com' } })
    }));

    const tokenEl = document.getElementById('twoFALoginToken');
    tokenEl.value = '123456';

    // Set userId as if set by login flow
    TwoFALogin.userId = '1';

    // Override location to a writable value for tests
    delete window.location;
    window.location = { href: '/' };

    await TwoFALogin.verifyLogin();

    expect(localStorage.getItem('sessionToken')).toBe('abc123');
    const user = JSON.parse(localStorage.getItem('user'));
    expect(user).toMatchObject({ id: 1, email: 'test@example.com' });
    expect(window.location.href).toBe('/dashboard');
  });
});
