const { body, param } = require('express-validator');
const { SECTIONS, QUALITIES } = require('../constants/domain');

const validateSignup = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validateSessionCreate = [
  body('section').trim().toLowerCase().isIn(SECTIONS).withMessage('Invalid section'),
  body('duration').optional().isNumeric().withMessage('Duration must be a number'),
  body('quality')
    .optional({ values: 'falsy' })
    .trim()
    .toLowerCase()
    .isIn(QUALITIES)
    .withMessage('Invalid quality'),
];

const validateSessionUpdate = [
  param('id').isMongoId().withMessage('Invalid session id'),
  body('section')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(SECTIONS)
    .withMessage('Invalid section'),
  body('quality')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(QUALITIES)
    .withMessage('Invalid quality'),
];

const validateContractCreate = [
  body('weekStart').isISO8601().withMessage('weekStart must be a valid ISO date'),
  body('goals').isObject().withMessage('goals must be an object'),
  body('goals.dsa').optional().isNumeric().withMessage('dsa goal must be numeric'),
  body('goals.dev').optional().isNumeric().withMessage('dev goal must be numeric'),
  body('goals.semester').optional().isNumeric().withMessage('semester goal must be numeric'),
];

module.exports = {
  validateSignup,
  validateLogin,
  validateSessionCreate,
  validateSessionUpdate,
  validateContractCreate,
};
