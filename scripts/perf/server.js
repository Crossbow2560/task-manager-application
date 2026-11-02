// API process for the load tests (started by lib.startServer). Reports its base URL to the parent.
const { startEmbedded } = require('./lib');

startEmbedded().then(({ baseUrl }) => process.send({ baseUrl }));
