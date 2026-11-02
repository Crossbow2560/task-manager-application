const config = require('./config');
const { createApp } = require('./app');
const { createServer } = require('./tls');
const migrate = require('./db/migrate');
const { startScheduler } = require('../services/notifications/reminders');

migrate().then(() => {
  createServer(createApp()).listen(config.port, () => console.log(`API listening on ${config.port}`));
  startScheduler(); // FR-10: due-date reminders
}).catch((e) => { console.error(e); process.exit(1); });
