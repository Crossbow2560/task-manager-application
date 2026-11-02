#!/usr/bin/env node
// Scores the NFR-03 usability test. Usage: node docs/usability/score.js docs/usability/results.csv
const fs = require('fs');

const MIN_PARTICIPANTS = 5;
const LIMIT_SECONDS = 180;
const TARGET = 0.8;

function parse(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], (v || '').trim()])));
}

const yes = (v) => v.toLowerCase() === 'yes';

function score(rows) {
  const filled = rows.filter((r) => r.registered !== '' || r.seconds !== '');
  const results = filled.map((r) => {
    const seconds = Number(r.seconds);
    const completed = yes(r.registered) && yes(r.task_created) && yes(r.task_assigned)
      && Number.isFinite(seconds) && seconds > 0 && seconds <= LIMIT_SECONDS && !yes(r.help_needed);
    return { participant: r.participant, seconds, completed };
  });
  const done = results.filter((r) => r.completed);
  const times = done.map((r) => r.seconds).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor((times.length - 1) / 2)] : null;
  const rate = results.length ? done.length / results.length : 0;
  return { results, rate, median, pass: results.length >= MIN_PARTICIPANTS && rate >= TARGET };
}

module.exports = { score, parse };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node score.js results.csv'); process.exit(2); }
  const s = score(parse(fs.readFileSync(file, 'utf8')));
  for (const r of s.results) console.log(`${r.participant}: ${r.completed ? 'completed' : 'NOT completed'} (${r.seconds || '-'}s)`);
  console.log(`participants: ${s.results.length} (need ${MIN_PARTICIPANTS}+)`);
  console.log(`completion rate: ${(s.rate * 100).toFixed(0)}% (target ${TARGET * 100}%)`);
  console.log(`median time of completed runs: ${s.median === null ? 'n/a' : `${s.median}s`}`);
  console.log(s.pass ? 'PASS' : 'FAIL');
  process.exit(s.pass ? 0 : 1);
}
