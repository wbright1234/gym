require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db_connection').pool;
const restAPIs = require('./rest_apis');
const stripeAPIs = require('./stripe_apis');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { scheduleMidnightJobs } = require('./schedules');

const app = express();
const port = process.env.PORT || 30002;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

pool.getConnection((err, conn) => {
  if (err) throw err;
  console.log('DB connected successfully');
  scheduleMidnightJobs();
  conn.release();
});

process.on('warning', (e) => {
  console.log(e.stack);
});

process.on('error', (e) => {
  console.log(e.stack);
});

app.use(express.static(path.join(__dirname, 'build')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, POST, DELETE");
  next();
});

authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ success: false, message: 'Token cannot be null' });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: 'Invalid token detected' });
    req.user = user;
    next();
  })
}

if (process.env.NODE_ENV === 'production') {
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  app.get('/sign-in', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  app.get('/reset/:id/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  })
}

app.post('/getBuildings', (req, res) => {
  restAPIs.getBuildings(req, res);
});

app.post('/sendTestmail', (req, res) => {
  restAPIs.sendTestmail(req, res);
})

app.post('/shareholderRegister', (req, res) => {
  restAPIs.shareholderRegister(req, res);
});

app.post('/adminRegister', (req, res) => {
  restAPIs.adminRegister(req, res);
});

app.post('/userLogin', (req, res) => {
  restAPIs.userLogin(req, res);
});

app.post('/confirmPhoneVerification', (req, res) => {
  restAPIs.confirmPhoneVerification(req, res);
})

app.post('/getPendingRegistrations', authenticateToken, (req, res) => {
  restAPIs.getPendingRegistrations(req, res);
});

app.post('/token', (req, res) => {
  restAPIs.token(req, res);
});

app.get('/getUserInfo', authenticateToken, (req, res) => {
  restAPIs.getUserInfo(req, res);
});

app.post('/acceptRegistration', authenticateToken, (req, res) => {
  restAPIs.acceptRegistration(req, res);
});

app.post('/rejectRegistration', authenticateToken, (req, res) => {
  restAPIs.rejectRegistration(req, res);
});

app.post('/editApartment', authenticateToken, (req, res) => {
  restAPIs.editApartment(req, res);
});

app.delete('/deleteApartment', authenticateToken, (req, res) => {
  restAPIs.deleteApartment(req, res);
});

app.get('/getBookings', authenticateToken, (req, res) => {
  restAPIs.getBookings(req, res);
});

app.post('/saveBooking', authenticateToken, (req, res) => {
  restAPIs.saveBooking(req, res);
});

app.delete('/cancelBooking', authenticateToken, (req, res) => {
  restAPIs.cancelBooking(req, res);
})

app.get('/getBookingsAtMonth', authenticateToken, (req, res) => {
  restAPIs.getBookingsAtMonth(req, res);
});

app.get('/getBookedTimeSlots', authenticateToken, (req, res) => {
  restAPIs.getBookedTimeSlots(req, res);
});

app.post('/getDoormen', authenticateToken, (req, res) => {
  restAPIs.getDoormen(req, res);
})

app.post('/addDoorman', authenticateToken, (req, res) => {
  restAPIs.addDoorman(req, res);
});

app.delete('/cancelDoorman', authenticateToken, (req, res) => {
  restAPIs.cancelDoorman(req, res);
})

app.post('/getApartments', authenticateToken, (req, res) => {
  restAPIs.getApartments(req, res);
})

app.post('/uploadCertificate', authenticateToken, (req, res) => {
  restAPIs.uploadCertificate(req, res);
})

app.post('/resetPassword', (req, res) => {
  restAPIs.resetPassword(req, res);
})

app.post('/storePassword', (req, res) => {
  restAPIs.storePassword(req, res);
})

app.post('/saveBookDateLimit', authenticateToken, (req, res) => {
  restAPIs.saveBookDateLimit(req, res);
})

app.post('/saveTimeSlots', authenticateToken, (req, res) => {
  restAPIs.saveTimeSlots(req, res);
})

app.post('/getTimeSlots', authenticateToken, (req, res) => {
  restAPIs.getTimeSlots(req, res);
})

app.delete('/userSignout', authenticateToken, (req, res) => {
  restAPIs.userSignout(req, res);
})

app.post('/uploadBuildingsLinkUsers', authenticateToken, (req, res) => {
  restAPIs.uploadBuildingsLinkUsers(req, res);
})

app.get('/onGetUserEmails', authenticateToken, (req, res) => {
  restAPIs.onGetUserEmails(req, res);
});

app.post('/onResendCode', (req, res) => {
  restAPIs.onResendCode(req, res);
})

/****************************** Stripe APIs **********************************/

app.post('/createStripeCustomer', (req, res) => {
  stripeAPIs.createStripeCustomer(req, res);
})

app.delete('/deleteStripeCustomer', authenticateToken, (req, res) => {
  stripeAPIs.deleteStripeCustomer_api(req, res);
})

app.post('/createStripeSubscription', (req, res) => {
  stripeAPIs.createStripeSubscription(req, res);
});

app.post('/updateStripeSubscription', authenticateToken, (req, res) => {
  stripeAPIs.updateStripeSubscription(req, res);
})

app.post('/retrySubscriptionInvoice', (req, res) => {
  stripeAPIs.retrySubscriptionInvoice(req, res);
})

app.post('/cancelSubscription', authenticateToken, (req, res) => {
  stripeAPIs.cancelSubscription_api(req, res);
})

app.post('/updateSubscriptionStatus', (req, res) => {
  stripeAPIs.updateSubscriptionStatus(req, res);
})

app.post('/stripeWebhook', (req, res) => {
  stripeAPIs.stripeWebhook(req, res);
})

app.post('/getSubscriptionInfo', (req, res) => {
  stripeAPIs.getSubscriptionInfo(req, res);
})

app.listen(port, () => console.log(`Listening on port ${port}`));
