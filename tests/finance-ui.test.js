// Minimal UI integration test using jsdom
// Run: npm i jsdom --save-dev
// Then: node tests/finance-ui.test.js

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const vm = require('vm');

(async function run() {
  try {
    const html = `<!doctype html><html><head></head><body>
      <aside id="sidebar" class="sidebar"></aside>
      <button class="hamburger" aria-label="Toggle navigation" aria-expanded="false" aria-controls="sidebar" type="button"></button>
    </body></html>`;

    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost' });
    const { window } = dom;
    const { document } = window;

    // Expose globals for script execution
    const context = vm.createContext({ window, document, navigator: window.navigator, console, setTimeout, clearTimeout });

    // Load finance.js and run it in the jsdom context
    const scriptPath = path.resolve(__dirname, '..', 'finance.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    vm.runInContext(scriptContent, context);

    // Simulate mobile width so click-outside closes the sidebar
    context.window.innerWidth = 500;

    // Fire DOMContentLoaded so listeners run
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');

    assert.ok(hamburger, 'Hamburger exists');
    assert.strictEqual(hamburger.getAttribute('aria-expanded'), 'false', 'Initial aria-expanded is false');

    // Simulate click to open
    hamburger.click();

    assert.ok(sidebar.classList.contains('active'), 'Sidebar gained active class after click');
    assert.strictEqual(hamburger.getAttribute('aria-expanded'), 'true', 'aria-expanded toggled to true');
    assert.ok(document.body.classList.contains('no-scroll'), 'Body no-scroll when open');

    // Click outside to close (no overlay)
    document.body.click();

    assert.ok(!sidebar.classList.contains('active'), 'Sidebar removed active class after outside click');
    assert.strictEqual(hamburger.getAttribute('aria-expanded'), 'false', 'aria-expanded toggled back to false');
    assert.ok(!document.body.classList.contains('no-scroll'), 'Body scroll restored');

    console.log('✅ UI test passed: sidebar toggle and aria attributes behave as expected.');
    process.exit(0);
  } catch (err) {
    console.error('❌ UI test failed:', err);
    process.exit(1);
  }
})();