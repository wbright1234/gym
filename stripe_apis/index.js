const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const utils = require('../utils');
const pool = require('../db_connection').pool;

exports.getSubscriptionInfo = async ( req, res ) => {
  const validateRes = await utils.validateRequest(req.body, ['userId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { userId } = req.body;
  var sql = 'SELECT * FROM users WHERE id=?';
  pool.query(sql, [userId], async (err, results) => {
    if ( results[0].subscriptionId ) {
      if (err) throw err;
      const subscription = await stripe.subscriptions.retrieve(results[0].subscriptionId);
      var endDate = subscription.current_period_end;
      return res.json({ success: true, billCycleEnd: endDate });
    } else {
      return res.json({ success: false, message: 'No subscription' });
    }
  });  
}

exports.createStripeCustomer = async (req, res) => {
  try {
    const validateRes = await utils.validateRequest(req.body, ['userId', 'name', 'email']);
    if (!validateRes.success) {
      return res.status(400).json(validateRes);
    }

    const { userId, email, name } = req.body;
    var sql = 'SELECT * FROM users WHERE id=?';
    const customer = await stripe.customers.create({ email, name });    
    sql = 'UPDATE users SET stripeCustomerId=? WHERE id=?';
    pool.query(sql, [customer.id, userId], (err) => {
        if (err) throw err;
        return res.json({ success: true, data: customer });
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

exports.deleteStripeCustomer_api = async (req, res) => {
  try {
    const validateRes = await utils.validateRequest(req.body, ['stripeCustomerId']);
    if (!validateRes.success) {
      return res.status(400).json(validateRes);
    }
    const { stripeCustomerId } = req.body;
    const deleted = await stripe.customers.del(stripeCustomerId);
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

exports.deleteStripeCustomer = (stripeCustomerId) => {
  return new Promise(async (res, rej) => {
    try {
      const deleted = await stripe.customers.del(stripeCustomerId);
      res(deleted);
    } catch (e) {
      rej(e);
    }
  })
}

exports.createStripeSubscription = async (req, res) => {
  try {
    const validateRes = await utils.validateRequest(req.body, ['stripeCustomerId', 'paymentMethodId', 'plan']);
    if (!validateRes.success) {
      return res.status(400).json(validateRes);
    }
    const { stripeCustomerId, paymentMethodId, plan, price } = req.body;
    var sql = 'SELECT * FROM users WHERE stripeCustomerId=?';
    pool.query(sql, [stripeCustomerId], async (err, results) => {
      if (err) throw err;
      if (results.length == 0) {
        return res.status(400).json({ success: false, message: 'No user with stripeCustomerId' });
      }
      const user = results[0];
      if ( user.subscribedPlan == plan ){
        return res.status(400).json({ success: false, message: 'You already subscribed this plan' });
      }
      var interval_count = 1;
      if ( plan == 'quarterly') {
        interval_count = 3;
      } else if ( plan == 'biyearly') {
        interval_count = 6;
      }
      sql = 'SELECT * FROM prices WHERE amount=? AND intervalCount=?';
      pool.query(sql, [price, interval_count], async (err, results) => {
        if (err) throw err;
        await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
        // Change the default invoice settings on the customer to the new payment method
        await stripe.customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });
        try {
          if (results.length == 0) {
            const product_name = price + ' ' + plan;
            const product = await stripe.products.create( {name: product_name} );
            const sprice = await stripe.prices.create({
              unit_amount: price*100, currency: 'usd',  recurring: {interval: 'month', interval_count: interval_count}, product: product.id,
            });
            const subscription = await stripe.subscriptions.create({ customer: stripeCustomerId, items: [{ price: sprice.id }], expand: ['latest_invoice.payment_intent'] });
            const sql = 'INSERT INTO prices (priceId, amount, intervalCount) VALUES (?, ?, ?)';
            pool.query(sql, [sprice.id, price, interval_count], async (err, results) => {
              if (err) console.log(err);
              else console.log('insert to prices success');
              return res.json({ success: true, data: subscription });
            });
          }else {
            const priceId = results[0].priceId;
            const subscription = await stripe.subscriptions.create({ customer: stripeCustomerId, items: [{ price: priceId }], expand: ['latest_invoice.payment_intent'] });
            return res.json({ success: true, data: subscription });
          }
        } catch (e) {
          console.log(e);
          return res.status(400).json({ success: false, message: e.message });
        }        
      });      
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

exports.updateStripeSubscription = async (req, res) => {
  try {
    const validateRes = await utils.validateRequest(req.body, ['userId', 'interval', 'price']);
    if (!validateRes.success) {
      return res.status(400).json(validateRes);
    }
    const { userId, interval, price, plan } = req.body;
    var sql = 'SELECT subscriptionId FROM users WHERE id=?';
    pool.query(sql, [userId], async (err, results) => {
      if (err) throw err;
      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'Subscription id not found' });
      }
      try {
        const { subscriptionId, stripeCustomerId } = results[0];
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        sql = 'SELECT * FROM prices WHERE amount=? AND intervalCount=?';
        pool.query(sql, [price, interval], async (err, results) => {
          if (err) throw err;
          var priceId = '';
          if ( results.length == 0 ) {
            const product_name = price + ' ' + plan;
            const product = await stripe.products.create( {name: product_name} );
            const sprice = await stripe.prices.create({
              unit_amount: price*100, currency: 'usd',  recurring: {interval: 'month', interval_count: interval}, product: product.id,
            });
            priceId = sprice.id;
            const sql = 'INSERT INTO prices (priceId, amount, intervalCount) VALUES (?, ?, ?)';
            pool.query(sql, [priceId, price, interval], async (err, results) => {
              if (err) console.log(err);
              else console.log('insert to prices success');
            });
          } else {
            priceId = results[0].priceId;
          }
          const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false, items: [ { id: subscription.items.data[0].id, price: priceId } ]
          });
          var endDate = updatedSubscription.current_period_end;
          return res.json({ success: true, billCycleEnd: endDate });
        });        
      } catch (e) {
        return res.status(400).json({ success: true, message: e.message });
      }
    });
  } catch (e) {
    return res.status(400).json({ success: true, message: e.message });
  }
}

exports.retrySubscriptionInvoice = async (req, res) => {
  try {
    const validateRes = await utils.validateRequest(req.body, ['stripeCustomerId', 'paymentMethodId', 'invoiceId']);
    if (!validateRes.success) {
      return res.status(400).json(validateRes);
    }
    const { stripeCustomerId, paymentMethodId, invoiceId } = req.body;
    // Set the default payment method on the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });
    await stripe.customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
    return res.json({ success: true, data: invoice });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

exports.cancelSubscription_api = async (req, res) => {
  try {
    const validateRes = await utils.validateRequest(req.body, ['subscriptionId']);
    if (!validateRes.success) {
      return res.status(400).json(validateRes);
    }
    const { subscriptionId } = req.body;
    await stripe.subscriptions.del(subscriptionId);
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

exports.cancelSubscription = (subscriptionId) => {
  return new Promise(async (res, rej) => {
    try {
      const result = await stripe.subscriptions.del(subscriptionId);
      res(result);
    } catch (e) {
      rej(e);
    }
  });
}

exports.updateSubscriptionStatus = async (req, res) => {
  const validateRes = await utils.validateRequest(req.body, ['userId', 'stripeCustomerId']);
  if (!validateRes.success) {
    return res.status(400).json(validateRes);
  }
  const { userId, stripeCustomerId, subscriptionId, plan } = req.body;
  const sql = 'UPDATE users SET subscriptionId=?, subscribedPlan=?, subscribedAt=NOW() WHERE id=? AND stripeCustomerId=?';
  pool.query(sql, [subscriptionId, plan, userId, stripeCustomerId], (err) => {
    if (err) throw err;
    return res.json({ success: true });
  })
}

exports.stripeWebhook = (req, res) => {
  const type = req.body.type;
  if (!type) {
    return res.status(400).send('Webhook type is not set properly');
  }
  console.log('Stripe webhook: ', req.body);
  if (type === 'invoice.paid') {
    const invoice = req.body.data.object;
    if (invoice.paid) {
      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;
      const interval_count = invoice.lines.data[0].price.recurring.interval_count;
      var plan = 'monthly';
      if ( interval_count === 6 ) {
        plan = 'biyearly';
      } else if ( interval_count === 12 ){
        plan = 'yearly';
      }
      const sql = 'UPDATE users SET subscriptionId=?, subscribedPlan=?, subscribedAt=NOW() WHERE stripeCustomerId=?';
      pool.query(sql, [subscriptionId, plan, customerId]);
    }
  } else if (type === 'customer.subscription.updated') {
    const subscription = req.body.data.object;    
    const subscriptionId = subscription.id;
    const interval_count = subscription.plan.interval_count;
    var plan = 'monthly';
    if ( interval_count === 6 ) {
      plan = 'biyearly';
    } else if ( interval_count === 12 ){
      plan = 'yearly';
    }
    const sql = 'UPDATE users SET subscribedPlan=? WHERE subscriptionId=?';
    pool.query(sql, [plan, subscriptionId], (err) => {
      if (err) throw err;
    }); 
  } else if (type === 'customer.subscription.deleted') {
    const subscriptionId = req.body.data.object.id;
    const sql = 'UPDATE users SET subscriptionId=NULL, subscribedPlan=NULL, subscribedAt=NULL WHERE subscriptionId=?'
    pool.query(sql, [subscriptionId], (err) => {
      if (err) throw err;
    })
  } else if (type === 'invoice.payment_succeeded') {

  } else if (type === 'payment_intent.succeeded') {
    const paymentIntent = req.body.data.object;
    const paymentIntentId = paymentIntent.id;
    const customerId = paymentIntent.customer;
    const invoiceId = paymentIntent.invoice;
    const paid = paymentIntent.status === 'succeeded';
    const paymentMethodId = paymentIntent.payment_method;
    const cardBrand = paymentIntent.charges.data[0].payment_method_details.card.brand;
    const cardLast4 = paymentIntent.charges.data[0].payment_method_details.card.last4;
    const amount = paymentIntent.amount_received / 100;
    const currency = paymentIntent.currency;

    const selectSQL = 'SELECT id FROM users WHERE stripeCustomerId=?';
    pool.query(selectSQL, [customerId], async (err, results) => {
      if (err) throw err;
      const userId = results[0].id;
      const invoiceObj = await stripe.invoices.retrieve(invoiceId);
      //const priceId = invoiceObj.lines.data[0].plan.id;
      const interval_count = invoiceObj.lines.data[0].price.recurring.interval_count;
      var plan = 'monthly';
      if ( interval_count === 6 ) {
        plan = 'biyearly';
      } else if ( interval_count === 12 ){
        plan = 'yearly';
      }
      const insertSQL = 'INSERT INTO payment_intents (userId, invoice, ' +
            'paymentMethod, cardBrand, cardLast4, paymentIntent, paid, amount, ' +
            'currency, plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      pool.query(insertSQL, [userId, invoiceId, paymentMethodId, cardBrand, cardLast4, paymentIntentId, paid, amount, currency, plan], (err) => {
        if (err) throw err;
      });
    });
  } else if (type === 'invoice.payment_failed') {

  }
  return res.json({ received: true });
}
