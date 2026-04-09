const { fail } = require('../utils/response');

// Express error handler (must have 4 params)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || 'Internal Server Error';

  // Avoid sending stack traces in production
  const payload = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err?.stack;
  }

  // If headers already sent, delegate to default handler
  if (res.headersSent) return next(err);

  return fail(res, status, payload.message);
}

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

module.exports = {
  errorHandler,
  notFound,
};
