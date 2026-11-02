// NFR-07: static portability checks for the web client. These catch the things that break
// across Chrome / Firefox / Safari; real-browser verification is the matrix in docs/BROWSER_SUPPORT.md.
const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'web');
const pages = fs.readdirSync(webDir).filter((f) => f.endsWith('.html'));
const css = fs.readFileSync(path.join(webDir, 'styles.css'), 'utf8');
const read = (f) => fs.readFileSync(path.join(webDir, f), 'utf8');

test('web client has pages', () => {
  expect(pages.length).toBeGreaterThanOrEqual(4);
});

describe.each(pages)('%s', (page) => {
  const html = read(page);
  test('standards mode, language, charset and viewport are declared', () => {
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<html lang="[a-z-]+"/);
    expect(html).toMatch(/<meta charset="utf-8">/i);
    expect(html).toMatch(/<meta name="viewport" content="width=device-width/);
  });
  test('no external resources (CDN scripts/fonts) that can be blocked or differ per browser', () => {
    expect(html).not.toMatch(/(src|href)="https?:\/\//i);
  });
  test('no legacy or browser-specific scripting APIs', () => {
    expect(html).not.toMatch(/document\.all|attachEvent|window\.event|ActiveXObject|-webkit-|-moz-/);
  });
  test('storage access is guarded (Safari private mode / blocked storage)', () => {
    if (/(session|local)Storage/.test(html)) expect(html).toMatch(/try\s*\{[^}]*Storage/);
  });
});

test('stylesheet uses only properties with standard cross-browser support', () => {
  expect(css).not.toMatch(/-webkit-|-moz-|-ms-/);
  expect(css).not.toMatch(/:has\(|@container|@scope|subgrid|text-wrap/);
});
