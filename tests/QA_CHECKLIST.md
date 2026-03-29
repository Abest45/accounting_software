# Mobile Sidebar QA Checklist ✅

Manual test steps (quick):

1. Open app in mobile viewport (≤ 768px) using browser devtools or real device. 📱
2. Verify hamburger appears in the header and is keyboard-focusable (Tab to it) — should show focus outline. ⌨️
3. Click/tap hamburger:
   - Sidebar should slide in smoothly.
   - A subtle shadow should appear on the left edge of the sidebar.
   - Page body must not scroll while menu is open.
   - `aria-expanded` on the hamburger should be `true`.
4. Click outside the sidebar or press `Esc`:
   - Sidebar should slide out smoothly.
   - Body scrolling is restored.
   - `aria-expanded` should be `false`.
5. Test outside click: from open state, tap outside the sidebar and ensure it closes.
6. Resize to desktop (> 768px) while menu is open — the menu must close and scrolling should be restored.
7. Accessibility checks: verify keyboard support (Enter/Space toggles the menu) and correct aria attributes.

Automated smoke test (node + jsdom):

1. Install dev dep: `npm i jsdom --save-dev` (or `npm i jsdom -D`).
2. Run the test: `node tests/finance-ui.test.js`.

Vitest unit test (fast):

1. Install dev deps: `npm i -D vitest jsdom @testing-library/dom`
2. Run: `npm run test:unit` or `npm test`

Playwright e2e (integration):

1. Install dev deps: `npm i -D playwright http-server`
2. Install Playwright browsers: `npx playwright install`
3. Run: `npm run test:e2e`

Notes:
- I added `package.json` scripts: `serve`, `test`, `test:unit`, `test:ui`, and `test:e2e` to make runs simple.
- If you'd like, I can convert the Node script to a Vitest-only test or add Cypress instead of Playwright.