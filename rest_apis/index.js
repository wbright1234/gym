const pool = require('../db_connection').pool;
const utils = require('../utils');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const _ = require('lodash');
const fs = require('fs-extra');
const multiparty = require('multiparty');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const { sendEmailSync, sendEmailAsync } = require('../mailer');
const stripeAPIs = require('../stripe_apis');

const s3  = new AWS.S3({
  accessKeyId: process.env.BUCKETEER_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKETEER_AWS_SECRET_ACCESS_KEY,
  region: process.env.BUCKETEER_AWS_REGION
});
const twilio = require('twilio');
const { result } = require('lodash');
const twilioclient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.shareholderRegister = async (req, res) => {
  console.log('shareholderRegister called');
  const validateRes = await utils.validateRequest(req.body, ['name', 'email', 'password', 'phoneNumber', 'aptNumber', 'role', 'buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { name, email, password, phoneNumber, aptNumber, role, buildingId } = req.body;
  var sql = 'SELECT * FROM users WHERE email=?';
  pool.query(sql, [email], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already taken by someone' });
    }
    sql = 'SELECT * FROM users WHERE buildingId=? AND aptNumber=?';
    pool.query(sql, [buildingId, aptNumber], (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        return res.status(400).json({ success: false, message: 'Apartment number is already taken by someone' });
      }
      sql = 'SELECT * FROM users WHERE buildingId=? AND role="admin"';
      pool.query(sql, [buildingId], (err, results) => {
        if (err) throw err;
        if (results.length == 0) {
          return res.status(400).json({ success: false, message: 'No building with that building code' });
        }
        const capacity = results[0].registrationCapacity;
        sql = 'SELECT * FROM apartments WHERE buildingId=?';
        pool.query(sql, [buildingId], (err, results) => {
          if (err) throw err;
          if ( results.length < capacity ) {
            var aptColorHex = '#'+Math.floor(Math.random() * 16777215).toString(16);
            var verifyCode = Math.floor(100000 + Math.random() * 900000);
            sql = 'INSERT INTO users (name, email, password, phoneNumber, aptNumber, aptColorHex, role, buildingId, verify_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            pool.query(sql, [name, email, md5(password), phoneNumber, aptNumber, aptColorHex, role, buildingId, verifyCode], (err, result) => {
              if (err) throw err;
              var userId = result.insertId;
              //send verification code with twilio
              //sendTwilioSMS(phoneNumber, verifyCode);
              return res.json({ success: true, userId: userId });
            });
          } else {
            return res.status(400).json({ success: false, message: 'Building capacity is full' });
          }
        });
      });
    });
  });
}

sendTwilioSMS = (phoneNumber, verifyCode) => {
  twilioclient.messages.create({
    body: 'Your verification code is ' + verifyCode,
    to: phoneNumber,  // Text this number
    from: '' // From a valid Twilio number
  })
  .then((message) => console.log(message));
}

exports.confirmPhoneVerification = async (req, res) => {
  console.log('confirmPhoneVerification called');
  const validateRes = await utils.validateRequest(req.body, ['userId', 'code']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { userId, code } = req.body;
  sql = 'SELECT * FROM users WHERE id=? AND verify_code=?';
  pool.query(sql, [userId, code], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      sql = 'UPDATE users SET phone_verify=1 WHERE id=?';
      pool.query(sql, [userId], (err, results) => {
        if (err) throw err;
        return res.json({ success: true });
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }
  });
}

exports.adminRegister = async (req, res) => {
  console.log('adminRegister called');
  const validateRes = await utils.validateRequest(req.body, ['name', 'email', 'password', 'phoneNumber', 'buildingName', 'registrationCapacity', 'role']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { name, email, password, phoneNumber, buildingName, registrationCapacity, role } = req.body;
  //check building duplicate
  var sql = 'SELECT * FROM buildings WHERE buildingName=?';
  pool.query(sql, [buildingName], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Building name is already taken by someone' });
    }
    //check email duplicate
    sql = 'SELECT * FROM users WHERE email=?';
    pool.query(sql, [email], (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
          return res.status(400).json({ success: false, message: 'Email is already taken by someone' });
      }
      //add admin to user table
      var aptColorHex = '#'+Math.floor(Math.random() * 16777215).toString(16);
      var verifyCode = Math.floor(100000 + Math.random() * 900000);
      sql = 'INSERT INTO users (name, email, password, phoneNumber, buildingName, registrationCapacity, aptColorHex, role, confirmed, verify_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      pool.query(sql, [name, email, md5(password), phoneNumber, buildingName, registrationCapacity, aptColorHex, role, 1, verifyCode], (err, result) => {
        if (err) throw err;
        var userId = result.insertId;
        //add building to building table
        sql = 'INSERT INTO buildings (adminId, buildingName) VALUES (?, ?)';
        pool.query(sql, [userId, buildingName], (err, result) => {
          if (err) throw err;
          var buildingId = result.insertId;
          //sendTwilioSMS(phoneNumber, verifyCode);
          sql = 'UPDATE users SET buildingId=? WHERE id=?';
          pool.query(sql, [buildingId, userId], (err, result) => {
            return res.json({ success: true, userId: userId });
          });
        });
      });
    });
  });
}

exports.userLogin = async (req, res) => {
  console.log('userLogin called');
  const validateRes = await utils.validateRequest(req.body, ['email', 'password']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { email, password } = req.body;
  var sql = 'SELECT * FROM users WHERE email=?';
  pool.query(sql, [email], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'User does not exist with this email' });
    }
    const { id, confirmed } = results[0];
    if (md5(password) !== results[0]['password']) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }
    // generate json web token
    const accessToken = utils.generateAccessToken({ email });
    const refreshToken = jwt.sign({ email }, process.env.REFRESH_TOKEN_SECRET);
    sql = 'INSERT INTO refresh_tokens (userId, refreshToken) VALUES (?, ?) ON DUPLICATE KEY UPDATE refreshToken=?';
    pool.query(sql, [id, refreshToken, refreshToken]);
    return res.json({ success: true, data: { accessToken, refreshToken, user: { ...results[0], password: null } } });
  });
}

exports.token = async (req, res) => {
  console.log('token called');
  const validateRes = await utils.validateRequest(req.body, ['refreshToken']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const refreshToken = req.body.refreshToken;
  const sql = 'SELECT * FROM refresh_tokens WHERE refreshToken=?';
  pool.query(sql, [refreshToken], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(405).json({ success: false, message: 'Invalid refresh token' });
    } else {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token verifying failed' });
        const accessToken = utils.generateAccessToken({ email: user.email });
        return res.json({ success: true, data: { accessToken } });
      });
    }
  });
}

exports.getUserInfo = (req, res) => {
  console.log('getUserInfo called');
  const email = req.user.email;
  const sql = 'SELECT * FROM users WHERE email=?';
  pool.query(sql, [email], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'User does not exist with that email' });
    }
    return res.json({
      success: true,
      data: {
        ...results[0],
        password: null
      }
    })
  })
}

exports.getPendingRegistrations = async (req, res) => {
  console.log('getPendingRegistrations called');
  const validateRes = await utils.validateRequest(req.body, ['buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { buildingId } = req.body;
  var sql = 'SELECT * FROM users WHERE buildingId=? AND confirmed=0';
  pool.query(sql, [buildingId], (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: results });
  })
}

exports.acceptRegistration = async (req, res) => {
  console.log('acceptRegistration called');
  const validateRes = await utils.validateRequest(req.body, ['regId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { regId } = req.body;
  var sql = 'UPDATE users SET confirmed=1 WHERE id=?';
  pool.query(sql, [regId], (err) => {
    if (err) throw err;
    sql = 'SELECT id, name, email, aptNumber, aptColorHex, buildingId FROM users WHERE id=?'
    pool.query(sql, [regId], (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        const { id, name, email, aptNumber, aptColorHex, buildingId } = results[0];
        sql = 'INSERT INTO apartments (userId, aptNumber, aptColorHex, aptNames, buildingId) VALUES (?, ?, ?, ?, ?)';
        pool.query(sql, [id, aptNumber, aptColorHex, _.last(_.split(name, ' ')), buildingId]);
        const htmlContent = '<p>Thank you for registering at E-Z Amenity Scheduler, your account is APPROVED, and you are now able to start booking gym time slots!</p>' +
                         '<br />' +
                         '<p>As a reminder, once you\'ve navigated your login email is: ' + email + '</p>' +
                         '<br />' +
                         '<p>We hope you enjoy your time booking experience!</p>' +
                         '<br />' +
                         'Thank you';
        sendEmailAsync({ to: email, subject: 'Your E-Z Amenity Scheduler registration has been approved!', htmlContent });
      }
    })
    return res.json({ success: true, data: { regId } });
  });
}

exports.rejectRegistration = async (req, res) => {
  console.log('rejectRegistration called');
  const validateRes = await utils.validateRequest(req.body, ['regId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { regId } = req.body;

  var sql = 'SELECT stripeCustomerId, subscriptionId FROM users WHERE id=?';
  pool.query(sql, [regId], async (err, results) => {
    if (err) throw err;
    if (results.length === 0) return;
    try {
      const { stripeCustomerId, subscriptionId } = results[0];
      if (subscriptionId) {
        await stripeAPIs.cancelSubscription(subscriptionId);
      }
      if (stripeCustomerId) {
        await stripeAPIs.deleteStripeCustomer(stripeCustomerId);
      }
      sql = 'DELETE FROM users WHERE id=?';
      pool.query(sql, [regId], (err, results) => {
        if (err) throw err;
        return res.json({ success: true, data: { regId } });
      });
    } catch (e) {
      console.log('Delete shareholder account err: ', e);
    }
  });
}

exports.editApartment = async (req, res) => {
  console.log('editApartment called');
  const validateRes = await utils.validateRequest(req.body, ['aptId', 'names', 'aptColorHex', 'aptNumber']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { aptId, names, aptColorHex, aptNumber } = req.body;

  var sql = 'UPDATE apartments SET aptNames=?, aptColorHex=? WHERE id=?';
  pool.query(sql, [names, aptColorHex, aptId], (err) => {
    if (err) throw err;
    var queryArr = [];
    var queryParams = [];
    queryArr.push('UPDATE bookings SET aptColorHex=? WHERE aptNumber=?');
    queryParams.push([aptColorHex, aptNumber]);
    queryArr.push('UPDATE users SET aptColorHex=? WHERE aptNumber=?');
    queryParams.push([aptColorHex, aptNumber]);
    pool.query(_.join(queryArr, ';'), _.flatten(queryParams));

    return res.json({ success: true, data: { aptId, aptNames: names, aptColorHex } });
  })
}

exports.deleteApartment = async (req, res) => {
  console.log('deleteApartment called');
  const validateRes = await utils.validateRequest(req.query, ['aptNumber']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { aptNumber, userId } = req.query;
  var queryArr = [];
  var queryParams = [];
  queryArr.push('DELETE FROM apartments WHERE aptNumber=?');
  queryParams.push([aptNumber]);
  queryArr.push('DELETE FROM users WHERE aptNumber=?');
  queryParams.push([aptNumber]);
  pool.query(_.join(queryArr, ';'), _.flatten(queryParams), (err) => {
    if (err) throw err;

    //for Test Purpose
    var sql = 'SELECT stripeCustomerId, subscriptionId FROM users WHERE id=?';
    pool.query(sql, [userId], async (err, results) => {
      if (err) throw err;
      if (results.length === 0) return;
      try {
        const { stripeCustomerId, subscriptionId } = results[0];
        if (subscriptionId) {
          await stripeAPIs.cancelSubscription(subscriptionId);
        }
        if (stripeCustomerId) {
          await stripeAPIs.deleteStripeCustomer(stripeCustomerId);
        }
      } catch (e) {
        console.log('Delete shareholder account err: ', e);
      }
    });
    return res.json({ success: true, data: { aptNumber } });
  });
}

exports.getBuildings = async(req, res) => {
  console.log('getBuildings called');
  const sql = 'SELECT * FROM buildings';
  pool.query(sql, [], (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: results });
  });
}

exports.getBookings = async (req, res) => {
  console.log('getBookings called');
  const validateRes = await utils.validateRequest(req.query, ['userId', 'role', 'offset', 'limit', 'buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  var { userId, role, offset, limit, showOldBooking, buildingId } = req.query;
  offset = parseInt(offset);
  limit = parseInt(limit);
  var queryArr = [];
  var queryParams = [];
  if (role === 'admin' || role === 'doorman') {
    if (showOldBooking === '1') {
      queryArr.push('SELECT * FROM bookings WHERE buildingId=? ORDER BY bookedDateTime DESC LIMIT ? OFFSET ?');
      queryParams.push([buildingId, limit, offset]);
      queryArr.push('SELECT COUNT(*) AS totalCount FROM bookings');
    } else {
      queryArr.push('SELECT * FROM bookings WHERE buildingId=? AND bookedDateTime>=DATE(NOW()) ORDER BY bookedDateTime DESC LIMIT ? OFFSET ?');
      queryParams.push([buildingId, limit, offset]);
      queryArr.push('SELECT COUNT(*) AS totalCount FROM bookings WHERE bookedDateTime>=DATE(NOW())');
    }
  } else {
    if (showOldBooking === '1') {
      queryArr.push('SELECT * FROM bookings WHERE userId=? AND buildingId=? ORDER BY bookedDateTime DESC LIMIT ? OFFSET ?');
      queryParams.push([userId, buildingId, limit, offset])
      queryArr.push('SELECT COUNT(*) FROM bookings WHERE userId=?');
      queryParams.push([userId]);
    } else {
      queryArr.push('SELECT * FROM bookings WHERE userId=? AND buildingId=? AND bookedDateTime>=DATE(NOW()) ORDER BY bookedDateTime DESC LIMIT ? OFFSET ?');
      queryParams.push([userId, buildingId, limit, offset]);
      queryArr.push('SELECT COUNT(*) FROM bookings WHERE userId=? AND bookedDateTime>=DATE(NOW())');
      queryParams.push([userId]);
    }
  }
  pool.query(_.join(queryArr, ';'), _.flatten(queryParams), (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: { data: results[0], offset, limit, totalCount: results[1][0]['totalCount'] } });
  });
}

exports.saveBooking = async (req, res) => {
  console.log('saveBooking called');
  const validateRes = await utils.validateRequest(req.body, ['userId', 'userName', 'userRole', 'bookedDateTime', 'aptNumber', 'aptColorHex', 'aptName', 'buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  var { bookingId, userId, userName, userRole, bookedDateTime, aptNumber, aptColorHex, aptName, bookingNote, buildingId } = req.body;
  bookedDateTime = new Date(bookedDateTime);
  const dateDiff = utils.dateDiffInDays(new Date(), bookedDateTime);
  var sql;
  sql = 'SELECT booking_limit FROM users WHERE id=?';
  pool.query(sql, [userId], (err, result) => {
    if (err) throw err;
    if ( result.length > 0 ) {
      const compareDate = result[0].booking_limit;

      if (dateDiff > compareDate || dateDiff < 0) {
        return res.status(400).json({ success: false, message: 'Booking date must be in ' + compareDate +' days' });
      }

      var queryParams = [];
      if (bookingId) {
        sql = 'UPDATE bookings SET userId=?, name=?, role=?, aptNumber=?, aptColorHex=?, aptName=?, bookedDateTime=?, note=?, buildingId=? WHERE id=?'
        queryParams = [userId, userName, userRole, aptNumber, aptColorHex, aptName, bookedDateTime, bookingNote, buildingId, bookingId];
      } else {
        sql = 'INSERT INTO bookings (userId, name, role, aptNumber, aptColorHex, aptName, ' +
              'bookedDateTime, note, buildingId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        queryParams = [userId, userName, userRole, aptNumber, aptColorHex, aptName, bookedDateTime, bookingNote, buildingId];
      }
      pool.query(sql, queryParams, (err, result) => {
        if (err) throw err;
        return res.json({
          success: true,
          data: {
            id: bookingId ? bookingId : result.insertId,
            userId,
            name: userName,
            role: userRole,
            aptNumber,
            aptColorHex,
            aptName,
            bookedDateTime,
            note: bookingNote,
            buildingId: buildingId
          }
        });
      });
    }
  });
}

exports.cancelBooking = async (req, res) => {
  console.log('cancelBooking called');
  const validateRes = await utils.validateRequest(req.query, ['bookingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { bookingId } = req.query;
  const sql = 'DELETE FROM bookings WHERE id=?';
  pool.query(sql, [bookingId], (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: { bookingId } });
  })
}

exports.getBookingsAtMonth = async (req, res) => {
  console.log('getBookingsAtMonth called');
  const validateRes = await utils.validateRequest(req.query, ['filterMonth', 'buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  var { filterMonth, buildingId } = req.query;
  filterMonth = new Date(filterMonth);
  const fullYear = filterMonth.getFullYear();
  const month = filterMonth.getMonth();
  const sql = 'SELECT * FROM bookings WHERE buildingId=? AND YEAR(bookedDateTime)=? AND MONTH(bookedDateTime)=?';
  pool.query(sql, [buildingId, fullYear, month + 1], (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: results });
  });
}

exports.saveTimeSlots = async ( req, res ) => {
  console.log('saveTimeSlots called');
    const validateRes = await utils.validateRequest(req.body, ['buildingId', 'timeSlots']);
    if (!validateRes.success) {
        return res.status(400).json(validateRes);
    }
    var { buildingId, timeSlots } = req.body;
    const sql = 'DELETE FROM timeslots WHERE buildingId=?';
    pool.query(sql, [buildingId], (err) => {
        if (err) throw err;

        var queryArr = [];
        var queryParams = [];
        _.forEach(timeSlots, slot => {
            queryArr.push('INSERT INTO timeslots (buildingId, localId, start, end) VALUES (?, ?, ?, ?)');
            queryParams.push([buildingId, slot.id, slot.start, slot.end]);
        })
        pool.query(_.join(queryArr, ';'), _.flatten(queryParams), (err, result) => {
            if (err) throw err;
            return res.json({ success: true });
        });
    });
}

exports.getTimeSlots = async ( req, res ) => {
  console.log('getTimeSlots called');
  const validateRes = await utils.validateRequest(req.body, ['buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { buildingId } = req.body;
  const sql = 'SELECT * FROM timeslots WHERE buildingId=? ORDER BY localId';
  pool.query(sql, [buildingId], (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: results });
  });
}

exports.getBookedTimeSlots = async (req, res) => {
  console.log('getBookedTimeSlots called');
  const validateRes = await utils.validateRequest(req.query, ['filterDate']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  var { filterDate } = req.query;
  filterDate = new Date(filterDate);
  const filterEndDateTime = filterDate.getTime() + 16 * 60 * 60 * 1000;
  const sql = 'SELECT * FROM bookings WHERE bookedDateTime >= ? AND bookedDateTime <= ?';
  pool.query(sql, [filterDate, new Date(filterEndDateTime)], (err, results) => {
    if (err) throw err;
    const bookedTimeSlots = _.map(results, booking => {
      const bookedDateTime = new Date(booking.bookedDateTime);
      return {
        bookedDateTime
      }
    });
    return res.json({ success: true, data: bookedTimeSlots });
  });
}

exports.addDoorman = async (req, res) => {
  console.log('addDoorman called');
  const validateRes = await utils.validateRequest(req.body, ['name', 'email', 'phoneNumber', 'password', 'role', 'buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { id, name, email, phoneNumber, password, role, buildingId } = req.body;
  var sql = 'SELECT * FROM users WHERE email=?';
  pool.query(sql, [email], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      if (results[0].id !== id) {
        return res.status(400).json({ success: false, message: 'Email is already taken by someone' });
      }
    }
    var queryParams = [];
    if (id) {
      sql = 'UPDATE users SET name=?, email=?, phoneNumber=?, buildingId=? WHERE id=?'
      queryParams = [name, email, phoneNumber, buildingId, id];
    } else {
      sql = 'INSERT INTO users (name, email, password, phoneNumber, role, confirmed, buildingId) VALUES (?, ?, ?, ?, ?, ?, ?)';
      queryParams = [name, email, md5(password), phoneNumber, role, 1, buildingId];
    }

    pool.query(sql, queryParams, (err, result) => {
      if (err) throw err;
      return res.json({
        success: true,
        data: {
          id: id ? id : result.insertId, name, email, phoneNumber, role, buildingId
        }
      });
    });
  });
}

exports.getDoormen = async (req, res) => {
  console.log('getDoormen called');
  const validateRes = await utils.validateRequest(req.body, ['role', 'buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { role, buildingId } = req.body;
  if (role !== 'admin') {
    return res.status(400).json({ success: false, message: 'Not Admin' });
  }
  const sql = 'SELECT * FROM users WHERE role=? AND buildingId=?';
  pool.query(sql, ['doorman', buildingId], (err, results) => {
    if (err) throw err;
    return res.json({ success: true, data: results });
  })
}

exports.cancelDoorman = async (req, res) => {
  console.log('cancelDoorman called');
  const validateRes = await utils.validateRequest(req.query, ['doormanId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { doormanId } = req.query;
  const sql = 'DELETE FROM users WHERE id=? AND role=?';
  pool.query(sql, [doormanId, 'doorman'], (err) => {
    if (err) throw err;
    return res.json({ success: true, data: { doormanId } });
  });
}

exports.getApartments = async (req, res) => {
  console.log('getApartments called');
  const validateRes = await utils.validateRequest(req.body, ['buildingId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { buildingId } = req.body;
  const sql = 'SELECT id, aptNumber, aptColorHex, aptNames FROM apartments WHERE buildingId=?';
  pool.query(sql, [buildingId], (err, results) => {
    if (err) throw err;
    var apartments = _.uniqBy(results, 'aptNumber');
    return res.json({ success: true, data: _.orderBy(apartments, ['aptNumber'], ['asc']) });
  });
}

exports.uploadCertificate = (req, res) => {
  const uploadDir = 'public/certs';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  var form = new multiparty.Form({ uploadDir });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(403).json({ success: false, message: err.message });
    if (files.file && files.file.length > 0) {
      const file = files.file[0];
      const bookingId = fields.bookingId[0];
      const filename = fields.filename ? fields.filename[0] : file.originalFilename;

      const params = {
        Key: `public/${process.env.MODE}/${bookingId}/${filename}`,
        ContentType: file.headers['content-type'],
        Bucket: process.env.BUCKETEER_BUCKET_NAME,
        Body: fs.readFileSync(file.path)
      };

      s3.putObject(params, (e, data) => {
        if (e) throw e;
        const certUrl = `https://s3.${process.env.BUCKETEER_AWS_REGION}.amazonaws.com/${process.env.BUCKETEER_BUCKET_NAME}/${params.Key}`;
        const sql = 'UPDATE bookings SET certUrl=? WHERE id=?';
        pool.query(sql, [certUrl, bookingId], (err) => {
          if (err) throw err;
          return res.json({ success: true, data: { bookingId, certUrl } });
        });
      });
    } else {
      return res.status(400).json({ success: false, message: 'File field cannot be empty' });
    }
  });
}

destoryResetPassword = (id) => {
  return new Promise((res, rej) => {
    var sql = 'DELETE FROM reset_password WHERE id=? AND status=0';
    pool.query(sql, [id], (err, results) => {
      if (err) throw err;
      res();
    });
  })
}

exports.resetPassword = async (req, res) => {
  console.log('resetPassword called');
  const validateRes = await utils.validateRequest(req.body, ['email']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { email } = req.body;
  var sql = 'SELECT users.id AS userId, reset_password.id AS resetPasswordId ' +
            'FROM users LEFT JOIN reset_password ON (users.id=reset_password.userId) ' +
            'WHERE users.email=?';
  pool.query(sql, [email], async (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Email address is not registered' });
    }
    const userId = results[0]['userId'];
    const resetPasswordId = results[0]['resetPasswordId'];
    if (resetPasswordId) {
      await destoryResetPassword(resetPasswordId);
    }
    const token = crypto.randomBytes(32).toString('hex'); // creating the token to be sent to the forgot password form
    bcrypt.hash(token, 10, (err2, hash) => {
      if (err2) throw err2;
      sql = 'INSERT INTO reset_password (userId, token, expire) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))';
      pool.query(sql, [userId, hash], async (err3, results3) => {
        if (err3) throw err3;
        const htmlContent = '<h4><b>Reset Password</b></h4>' +
                         '<p>To reset your password, complete this form:</p>' +
                         '<a href=' + process.env.CLIENT_URL + '/reset/' + userId + '/' + token + '>' + process.env.CLIENT_URL + '/reset/' + userId + '/' + token + '</a>' +
                         '<p>This link will expire in 1 hour.</p>'
                         '<br><br>' +
                         '<p>E-Z Amenity Scheduler</p>'
        try {
          await sendEmailSync({ to: email, subject: 'Reset your account password', htmlContent });
          return res.json({ success: true });
        } catch (e) {
          throw e;
          return res.status(400).json({ success: false, message: e.message });
        };
      });
    });
  });
}

exports.storePassword = async (req, res) => {
  console.log('storePassword called');
  const validateRes = await utils.validateRequest(req.body, ['userId', 'token', 'password']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { userId, token, password } = req.body;
  var sql = 'SELECT * FROM reset_password WHERE userId=? AND status=0';
  pool.query(sql, [userId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired. Reset token' });
    }
    const resetPassId = results[0]['id'];
    const resetToken = results[0]['token'];
    bcrypt.compare(token, resetToken, (errBcrypt, resBcrypt) => { // the token and the hashed token in the db are verified before updating the password
      const expireTime = new Date(results[0]['expire']);
      const currentTime = new Date();
      if (expireTime < currentTime) {
        // time is expired
        sql = 'DELETE FROM reset_password WHERE id=?';
        pool.query(sql, [resetPassId]);
        return res.status(400).json({ success: false, message: 'The reset password token has expired' });
      }
      sql = 'UPDATE users SET password=? WHERE id=?';
      pool.query(sql, [md5(password), userId], (err1) => {
        if (err1) throw err1;
        sql = 'UPDATE reset_password SET status=1 WHERE id=?';
        pool.query(sql, [resetPassId]);
        return res.json({ success: true });
      });
    });
  });
}

exports.userSignout = (req, res) => {
  console.log('userSignout called');
  const sql = 'DELETE FROM refresh_tokens WHERE refreshToken=?';
  pool.query(sql, [req.body.refreshToken], (err) => {
    if (err) throw err;
    return res.json({ success: true });
  });
}

exports.saveBookDateLimit = async (req, res) => {
  console.log('saveBookDateLimit called');
  const validateRes = await utils.validateRequest(req.body, ['userId', 'bookingDateLimit']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { userId, bookingDateLimit } = req.body;
  sql = 'UPDATE users SET booking_limit=? WHERE id=?';
  pool.query(sql, [bookingDateLimit, userId], (err1) => {
    if (err1) throw err1;
    return res.json({ success: true });
  });
}

exports.sendTestmail = async (req, res) => {
  console.log('sendTestmail called');
  try {
    const htmlContent = '<h4><b>Reset Password</b></h4>' +
                     '<p>To reset your password, complete this form:</p>' +
                     '<p>This link will expire in 1 hour.</p>'
                     '<br><br>' +
                     '<p>E-Z Amenity Scheduler</p>'
    await sendEmailSync({ to: 'devkinggod@gmail.com', subject: 'Reset your account password', htmlContent });
    return res.json({ success: true });
  } catch (e) {
    console.log('Send Test email err: ', e);
    return res.status(400).json({ success: false });
  }
}

exports.uploadBuildingsLinkUsers = async (req, res) => {
  const validateRes = await utils.validateRequest(req.body, ['buildingId', 'userArr']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { buildingId, userArr } = req.body;
  var queryArr = [];
  var queryParams = [];
  _.forEach(userArr, user => {
    var aptColorHex = '#'+Math.floor(Math.random() * 16777215).toString(16);
    var sql = 'INSERT INTO users (buildingId, name, email, password, aptNumber, aptColorHex, role, confirmed, phone_verify) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    queryArr.push(sql);
    queryParams.push([buildingId, user.name, user.email, md5(user.password), user.aptNumber, aptColorHex, 'shareholder', 0, 1]);
  })
  pool.query(_.join(queryArr, ';'), _.flatten(queryParams), (err, result) => {
      if( err & err != "ER_DUP_ENTRY" ){
        // do normal error handling
        throw err;
      }

      _.forEach(userArr, user => {
        const htmlContent = '<h4><b>E-Z Amenity Scheduler has invited you to join their account</b></h4>' +
        '<br>' +
        '<p>Your temporary password for login E-Z Amentiy Scheduler is ' + user.password + '</p>' +
        '<br>Sincerely,' +
        '<p>E-Z Amenity Scheduler</p>'
        try {
          console.log('sending email: ', user.email);
          sendEmailSync({ to: user.email, subject: 'Invitation from E-Z Amenity Scheduler', htmlContent });
        } catch (e) {
          throw e;
        };
      });

      return res.json({ success: true });
  });
}

exports.onGetUserEmails = (req, res) => {
  console.log('onGetUserEmails called');
  const sql = 'SELECT email FROM users';
  pool.query(sql, (err, results) => {
    if (err) throw err;
    return res.json({
      success: true,
      data: results
    })
  });
}

exports.onResendCode = async (req, res) => {
  console.log('onResendCode called');
  const validateRes = await utils.validateRequest(req.body, ['userId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { userId } = req.body;
  const sql = 'SELECT phoneNumber, verify_code FROM users WHERE id=?';
  pool.query(sql, [userId], (err, results) => {
    if (err) throw err;
    if ( results.length == 0 ) {
      return res.status(400).json({ success: false, message: 'That user not exists' });
    }
    const { phoneNumber, verify_code }  = results[0];
    sendTwilioSMS(phoneNumber, verify_code);
    return res.json({ success: true });
  })
}
