const config = require('./config');
const { createApp } = require('./app');
const { createServer } = require('./tls');
const migrate = require('./db/migrate');

migrate().then(() => {
  createServer(createApp()).listen(config.port, () => console.log(`API listening on ${config.port}`));
}).catch((e) => { console.error(e); process.exit(1); });
