import React from 'react';
import { Alert, Row, Col, Form } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import APIs from 'APIs';
import { InjectedCardSection } from 'components/InjectedCardSection';
import ls from 'local-storage';
import AdminSignUpDoneModal from 'modals/AdminSignUpDoneModal';

export default class SubscriptionPayment extends React.Component {

    constructor(props) {
      super(props);

      this.state = {
        plan: 'monthly',
        payment_method: 'card',
        monthly_price: 14.99,
        yearly_price: 42.99,
        biyearly_price: 80.99,
        stripe: undefined,
        cardElement: undefined,
        subscribing: false,
        alert: {
          type: '',
          message: ''
        },
        doneSubscribe: false
      }
    }

    componentDidMount() {
      const { registrationCapacity } = this.props.location.state;
      this.setState({monthly_price: registrationCapacity*2, biyearly_price: registrationCapacity*1.5*3, yearly_price: registrationCapacity*1.25*6});
    }

    handlePaymentThatRequiresCustomerAction = ({ subscription, invoice, priceId, stripeCustomerId, paymentMethodId, plan, isRetry }) => {
      if (subscription && subscription.status === 'active') {
        // Subscription is active, no customer actions required.
        return { subscription, priceId, paymentMethodId, plan, stripeCustomerId };
      }
      // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
      // If it's a retry, the payment intent will be on the invoice itself.
      console.log('Invoice: ', invoice);
      let paymentIntent = invoice ? invoice.payment_intent : subscription.latest_invoice.payment_intent;
  
      if (paymentIntent.status === 'requires_action' || (isRetry === true && paymentIntent.status === 'requires_payment_method')) {
        return this.state.stripe.confirmCardPayment(paymentIntent.client_secret, {
          payment_method: paymentMethodId,
        })
        .then((result) => {
          if (result.error) {
            // Start code flow to handle updating the payment details.
            // Display error message in your UI.
            // The card was declined (i.e. insufficient funds, card has expired, etc).
            throw new Error(result.error.message);
          } else {
            if (result.paymentIntent.status === 'succeeded') {
              // Show a success message to your customer.
              // There's a risk of the customer closing the window before the callback.
              // We recommend setting up webhook endpoints later in this guide.
              return {
                priceId,
                subscription,
                invoice,
                paymentMethodId,
                plan,
                stripeCustomerId
              };
            }
          }
        })
        .catch(err => {
          throw err;
        })
      } else {
        // No customer action needed.
        return { subscription, priceId, paymentMethodId, stripeCustomerId, plan };
      }
    }
  
    handleRequiresPaymentMethod = ({ subscription, paymentMethodId, priceId, plan, stripeCustomerId }) => {
      if (subscription && subscription.status === 'active') {
        // subscription is active, no customer actions required.
        return { subscription, priceId, paymentMethodId, plan, stripeCustomerId };
      } else if (subscription.latest_invoice.payment_intent.status === 'requires_payment_method') {
        // Using localStorage to manage the state of the retry here,
        // feel free to replace with what you prefer.
        // Store the latest invoice ID and status.
        ls.set('latestStripeCustomerId', stripeCustomerId);
        ls.set('latestPlan', plan);
        ls.set('latestPriceId', priceId);
        ls.set('latestInvoiceId', subscription.latest_invoice.id);
        ls.set('latestInvoicePaymentIntentStatus', subscription.latest_invoice.payment_intent.status);
        throw new Error('Your card was declined')
      } else {
        return { subscription, priceId, paymentMethodId, plan, stripeCustomerId };
      }
    }
  
    retryInvoiceWithNewPaymentMethod = ({ stripeCustomerId, paymentMethodId, invoiceId, priceId, plan }) => {
      const params = {
        stripeCustomerId,
        paymentMethodId,
        invoiceId,
      };
  
      APIs.retrySubscriptionInvoice(params).then(resp => {
        console.log('Retry subscription: ', resp.data);
        const invoice = resp.data.data;
        return {
          // Use the Stripe 'object' property on the
          // returned result to understand what object is returned.
          invoice,
          stripeCustomerId,
          paymentMethodId,
          priceId,
          plan,
          isRetry: true,
        };
      })
      .then(this.handlePaymentThatRequiresCustomerAction)
      .then(this.onSubscriptionComplete)
      .catch(err => {
        this.setState({ alert: { type: 'danger', message: err.message }, subscribing: false });
      });
    }

    onSubscriptionComplete = (result) => {
      const { userId } = this.props.location.state;
      // Payment was successful.
      this.setState({ subscribing: false });
      ls.set('latestStripeCustomerId', null);
      ls.set('latestPlan', null);
      ls.set('latestPriceId', null);
      ls.set('latestInvoiceId', null);
      ls.set('latestInvoicePaymentIntentStatus', null);
      if (result.subscription && result.subscription.status === 'active') {
        // Change your UI to show a success message to your customer.
        // Call your backend to grant access to your service based on
        // `result.subscription.items.data[0].price.product` the customer subscribed to.
        const params = {
          userId: userId,
          stripeCustomerId: result.stripeCustomerId,
          subscriptionId: result.subscription.id,
          plan: result.plan
        }
        APIs.updateSubscriptionStatus(params).then(resp => {
          this.setState({doneSubscribe: true});
        }).catch(err => {
          let message = err.message;
          if (err.response) {
            message = err.response.data.message;
          }
          this.setState({ alert: { type: 'danger', message }, subscribing: false });
        });
      }
    }

    onSkip = () => {
      this.setState({doneSubscribe: true});
    }
  
    onConfirm = async() => {
      const { stripe, cardElement, plan, monthly_price, yearly_price, biyearly_price } = this.state;
      if (!stripe || !cardElement ) {
        return;
      }
      this.setState({ subscribing: true, alert: { type: '', message: '' } });
      // If a previous payment was attempted, get the latest invoice
      const latestInvoicePaymentIntentStatus = ls.get('latestInvoicePaymentIntentStatus');
      const pStripeCustomerId = ls.get('latestStripeCustomerId');
      const latestPlan = ls.get('latestPlan');

      const { error, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card: cardElement });

      if (error) {
        this.setState({ subscribing: false, alert: { type: 'danger', message: error.message } });
        console.log('Create Payment method error: ', error);
      } else {
        const paymentMethodId = paymentMethod.id;
        const { stripeCustomerId } = this.props.location.state;
        if (pStripeCustomerId === stripeCustomerId && latestPlan === plan && latestInvoicePaymentIntentStatus === 'requires_payment_method' ) {
          // Update the payment method and retry invoice payment
          const invoiceId = ls.get('latestInvoiceId');
          const priceId = ls.get('latestPriceId');
          console.log('Retry last invoice : ', invoiceId);
          this.retryInvoiceWithNewPaymentMethod({ stripeCustomerId, paymentMethodId, invoiceId, priceId });
        } else {
          // Create the subscription
          var price = monthly_price;
          if ( plan == 'yearly') {
            price = yearly_price;
          } else if ( plan == 'biyearly') {
            price = biyearly_price;
          }
          const params = { stripeCustomerId, plan, paymentMethodId, price };
          APIs.createStripeSubscription(params).then(resp => {
            const subscription = resp.data.data;
            return {
              paymentMethodId: paymentMethodId, priceId: subscription.items.data[0].price.id, stripeCustomerId: params.stripeCustomerId,
              plan, subscription: subscription,
            }
          })
          .then(this.handlePaymentThatRequiresCustomerAction)
          .then(this.handleRequiresPaymentMethod)
          .then(this.onSubscriptionComplete)
          .catch(err => {
            let message = err.message;
            if (err.response) {
              message = err.response.data.message;
            }
            this.setState({ alert: { type: 'danger', message }, subscribing: false });
          });
        }
      }
    };

    onCardElementReady = (stripe, cardElement) => {
      this.setState({ stripe, cardElement });
    }

    render() {
      const {plan, payment_method, monthly_price, yearly_price, biyearly_price, alert, subscribing, doneSubscribe} = this.state;
      const priceFont = {float: 'right', color: '#364954', fontWeight: 'bold', fontSize: 18};
      const nonSelectedRadioBorder = {border: '1px solid #B6B6BA'};
      const selectedRadioBorder = {border: '2px solid #45BCEC'};
      
      return (
        <div className='d-flex flex-column flex-fill align-items-center justify-content-center px-lg-4'>
            <img alt='...' src={require('assets/img/svg/stripe_subscription_left.svg')} className='stripe-subscription-left-img' />
            <img alt='...' src={require('assets/img/svg/stripe_subscription_right.svg')} className='stripe-subscription-right-img' />
            <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} className='my-5' />
            <div className='col-lg-6 col-10 border-1 px-lg-5' style={{border: '0.7px solid rgb(50, 75, 77, 0.7)', background: 'rgb(255, 255, 255, 0.8)'}}>
              <h6 className='mt-5' style={{fontWeight: 'bold'}}>Choose Plan</h6>
              <Form className='mt-4'>
                <div style={plan==='monthly' ? selectedRadioBorder:nonSelectedRadioBorder} className='px-4 py-2 shadow-sm'>
                  <input type="radio" name="plan" className='mr-4' checked={plan==='monthly'} onChange={e=>this.setState({plan: 'monthly'})} />
                  <label className='mb-0'>Monthly</label>
                  <label style={priceFont}>${monthly_price}</label>
                </div>
                <div style={plan==='biyearly' ? selectedRadioBorder:nonSelectedRadioBorder} className='px-4 py-2 mt-3 shadow-sm'>
                  <input type="radio" name="plan" className='mr-4' checked={plan==='biyearly'} onChange={e=>this.setState({plan: 'biyearly'})} />
                  <label className='mb-0'>Bi-Yearly</label>
                  <label style={priceFont}>${biyearly_price}</label>
                </div>
                <div style={plan==='yearly' ? selectedRadioBorder:nonSelectedRadioBorder} className='px-4 py-2 mt-3 shadow-sm'>
                  <input type="radio" name="plan" className='mr-4' checked={plan==='yearly'} onChange={e=>this.setState({plan: 'yearly'})} />
                  <label className='mb-0'>Yearly</label>
                  <label style={priceFont}>${yearly_price}</label>
                </div>
              </Form>
              <hr className='my-5' style={{ color: '##E8E8EA' }} />
              <h6 style={{fontWeight: 'bold'}}>Choose payment method</h6>
              <Row className='mt-4'>
                <Col lg='6' sm='6' style={{textAlign: 'center'}}>
                  <img alt='...' src={require('assets/img/svg/card.svg')} height={25}  />
                  <div>
                    <input type="radio" name="method" className='mr-2' checked={payment_method==='card'} onChange={e=>this.setState({payment_method: 'card'})}/>
                    <label className='mb-0'>Credit Card</label>
                  </div>
                </Col>
                {/*<Col lg='6' sm='6' style={{textAlign: 'center'}}>
                  <img alt='...' src={require('assets/img/svg/paypal.svg')} height={25}  />
                  <div>
                    <input type="radio" name="method" className='mr-2' checked={payment_method==='paypal'} onChange={e=>this.setState({payment_method: 'paypal'})} />
                    <label className='mb-0'>Paypal</label>
                  </div>
                </Col>*/}
              </Row>

              {payment_method==='card' &&
                <InjectedCardSection onCardElementReady={this.onCardElementReady} />
              }
              { alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert> }
              <Button type="submit" className='bg-blue text-white border-0 w-100 mt-3 mb-5' onClick={this.onConfirm} loading={subscribing} disabled={subscribing}>
                <strong>CONFIRM</strong>
              </Button>
              {/*<Button type="submit" className='bg-blue text-white border-0 w-100 mt-2 mb-5' onClick={this.onSkip} loading={subscribing} disabled={subscribing}>
                <strong>SKIP</strong>
              </Button>*/}
            </div>
            {
            doneSubscribe &&
            <AdminSignUpDoneModal
                isOpen={doneSubscribe}
                onClose={() => this.setState({ doneSubscribe: false }, () => this.props.history.push('/sign-in'))} />
            }
        </div>
      );
    }
}
