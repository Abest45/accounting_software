import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('UI - Sidebar toggle (vitest + jsdom)', () => {
  it('toggles sidebar and aria attributes', async () => {
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    const { window } = dom;

    // Provide minimal globals used by finance.js (Chart dependencies will be ignored for this test)
    window.matchMedia = window.matchMedia || function() { return { matches: false, addListener: () => {}, removeListener: () => {} }; };

    // Load the script content and execute in JSDOM window context
    const scriptPath = path.resolve(__dirname, '..', 'finance.js');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = script;
    window.document.head.appendChild(scriptEl);

    // Simulate mobile width so clicking outside closes the sidebar
    window.innerWidth = 500;

    // Wait for listeners to register
    await new Promise(r => setTimeout(r, 50));

    const hamburger = window.document.querySelector('.hamburger');
    const sidebar = window.document.querySelector('.sidebar');

    expect(hamburger).toBeTruthy();
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');

    // open
    hamburger.click();
    await new Promise(r => setTimeout(r, 20));

    expect(sidebar.classList.contains('active')).toBe(true);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    expect(window.document.body.classList.contains('no-scroll')).toBe(true);

    // close via click outside (no overlay)
    window.document.body.click();
    await new Promise(r => setTimeout(r, 20));

    expect(sidebar.classList.contains('active')).toBe(false);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    expect(window.document.body.classList.contains('no-scroll')).toBe(false);
  });
});
