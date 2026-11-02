// FR-10: due-date reminders. A scanner finds assignees of open tasks due within the lead window
// and enqueues one job per (task, assignee); the worker records an in-app notification and sends
// it through the provider. UNIQUE(task_id, user_id, kind) makes delivery idempotent.
//
// A task's due date is the day itself (00:00 UTC). With the default 48h lead and an hourly scan,
// reminders go out 47-48h before the due date, i.e. always at least 24h ahead. Tasks created or
// assigned later than that are reminded on the next scan (best effort).
const db = require('../../src/db');
const { createQueue } = require('./queue');
const provider = require('./provider');

const LEAD_HOURS = Number(process.env.REMINDER_LEAD_HOURS || 48);
const SCAN_INTERVAL_MS = Number(process.env.REMINDER_SCAN_MS || 60 * 60 * 1000);

const queue = createQueue();
const day = (d) => d.toISOString().slice(0, 10);

async function findPending(now = new Date()) {
  const from = day(now);
  const to = day(new Date(now.getTime() + LEAD_HOURS * 3600 * 1000));
  const { rows } = await db.query(
    `SELECT t.id AS task_id, t.title, t.due_date, u.id AS user_id, u.email
     FROM tasks t
     JOIN task_assignees a ON a.task_id = t.id
     JOIN users u ON u.id = a.user_id
     LEFT JOIN notifications n ON n.task_id = t.id AND n.user_id = u.id AND n.kind = 'due_reminder'
     WHERE t.status <> 'done' AND u.is_active = true
       AND t.due_date >= $1 AND t.due_date <= $2
       AND n.id IS NULL`,
    [from, to],
  );
  return rows;
}

async function scanAndEnqueue(now = new Date()) {
  const rows = await findPending(now);
  for (const r of rows) queue.enqueue({ taskId: r.task_id, userId: r.user_id, email: r.email, title: r.title, dueDate: r.due_date });
  return rows.length;
}

async function deliver({ taskId, userId, email, title, dueDate }) {
  const due = dueDate instanceof Date ? day(dueDate) : String(dueDate).slice(0, 10);
  const message = `Reminder: "${title}" is due on ${due}.`;
  const seen = await db.query("SELECT id FROM notifications WHERE task_id = $1 AND user_id = $2 AND kind = 'due_reminder'", [taskId, userId]);
  if (seen.rows.length) return;
  try {
    await db.query("INSERT INTO notifications (user_id, task_id, kind, message) VALUES ($1, $2, 'due_reminder', $3)", [userId, taskId, message]);
  } catch (e) {
    if (e.code === '23505' || /unique|duplicate/i.test(e.message)) return; // lost a race; already notified
    throw e;
  }
  await provider.send({ to: email, subject: `Task due soon: ${title}`, body: message });
}

function startScheduler() {
  queue.start(deliver);
  const scan = () => scanAndEnqueue().catch((e) => console.error('reminder scan failed:', e.message));
  scan();
  return setInterval(scan, SCAN_INTERVAL_MS).unref();
}

module.exports = { findPending, scanAndEnqueue, deliver, startScheduler, queue, LEAD_HOURS };
