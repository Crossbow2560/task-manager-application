const express = require('express');
const path = require('path');
const { buildRouter } = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(buildRouter());
  app.get('/', (req, res) => res.redirect('/dashboard.html'));
  app.use(express.static(path.join(__dirname, '..', 'web'), { index: false }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
