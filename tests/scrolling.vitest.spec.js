import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CSS - Smooth scrolling', () => {
  it('finance.css contains global scroll-behavior: smooth', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '..', 'finance.css'), 'utf8');
    expect(css).toMatch(/html,\s*body\s*\{[\s\S]*?scroll-behavior:\s*smooth/);
  });

  it('finance.css contains -webkit-overflow-scrolling: touch for .main-content', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '..', 'finance.css'), 'utf8');
    expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
  });
});
