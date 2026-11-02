const { AppError } = require('../errors');

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') err = new AppError(400, 'BAD_REQUEST', 'Malformed JSON');
  if (!(err instanceof AppError)) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
  const body = { code: err.code, message: err.message };
  if (err.details) body.details = err.details;
  res.status(err.status).json({ error: body });
}

module.exports = { notFoundHandler, errorHandler };
