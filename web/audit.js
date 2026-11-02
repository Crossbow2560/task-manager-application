// NFR-08: automated WCAG 2.1 AA audit (axe-core) of the core pages. Fails on any critical or serious violation.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const PAGES = ['login.html', 'board.html', 'task.html'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function auditPage(file) {
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(axeSource);
  // color-contrast needs real layout, which jsdom lacks; contrast is checked by hand against styles.css.
  const results = await dom.window.axe.run(dom.window.document, { runOnly: { type: 'tag', values: TAGS }, rules: { 'color-contrast': { enabled: false } } });
  return results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

(async () => {
  let failed = 0;
  for (const page of PAGES) {
    const bad = await auditPage(page);
    console.log(`${page}: ${bad.length} critical/serious violations`);
    bad.forEach((v) => { failed += 1; console.log(`  [${v.impact}] ${v.id}: ${v.help}`); });
  }
  process.exit(failed ? 1 : 0);
})();
