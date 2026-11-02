// Error envelope per design spec 3.3: { error: { code, message, details? } }
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
const unauthorized = (message = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', message);
const forbidden = (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);
const conflict = (message) => new AppError(409, 'CONFLICT', message);
const locked = (message = 'Account temporarily locked') => new AppError(423, 'LOCKED', message);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, locked };
