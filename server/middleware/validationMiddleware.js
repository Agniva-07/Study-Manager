const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return fail(res, 400, result.array()[0].msg);
}

module.exports = {
  handleValidation,
};
