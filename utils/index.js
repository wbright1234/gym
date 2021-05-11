const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

exports.validateRequest = (body, requiredFields) => {
  return new Promise((res) => {
    if (requiredFields.length > 0) {
      _.forEach(requiredFields, field => {
        if (body[field] === null || body[field] === undefined) {
          res({ success: false, message: `${field} is required field`, error_field: field });
        }
        if (field === 'email' && !validator.isEmail(body[field])) {
          res({ success: false, message: 'Invalid email address', error_field: field });
        }
        if (field === 'countryCode' && !validator.isISO31661Alpha2(body[field])) {
          res({ success: false, message: 'Invalid country code', error_field: field });
        }
        if (field === 'postalCode' && body['countryCode'] && !validator.isPostalCode(body[field], body['countryCode'])) {
          res({ success: false, message: 'Invalid postal code', error_field: field });
        }
      });
      res({ success: true });
    }
  });
}

exports.generateAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
}

exports.dateDiffInDays = (date1, date2) => {
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24)); // milliseconds for one day
}