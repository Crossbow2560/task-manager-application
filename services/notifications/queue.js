// Message queue for notification delivery (design spec 2.1: decouples slow delivery from the
// request path). In-process FIFO with retries; the interface (enqueue / start / drain) is what a
// Redis/RabbitMQ-backed implementation would provide, so swapping it is local to this file.
const MAX_ATTEMPTS = 3;

function createQueue() {
  const jobs = [];
  let handler = null;
  let running = false;

  async function drain() {
    if (running || !handler) return;
    running = true;
    try {
      while (jobs.length) {
        const job = jobs.shift();
        try {
          await handler(job.payload);
        } catch (e) {
          job.attempts += 1;
          if (job.attempts < MAX_ATTEMPTS) jobs.push(job);
          else console.error('notification job dropped after retries:', e.message);
        }
      }
    } finally { running = false; }
  }

  return {
    enqueue(payload) { jobs.push({ payload, attempts: 0 }); setImmediate(drain); },
    start(fn) { handler = fn; return drain(); },
    drain,
    size: () => jobs.length,
  };
}

module.exports = { createQueue, MAX_ATTEMPTS };
