import React from 'react';
import { Alert, Modal, ModalBody, } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import APIs from 'APIs';
import { InjectedCardSection } from 'components/InjectedCardSection';
import ls from 'local-storage';
import { connect } from 'react-redux';
import { updateUser } from 'redux/user/actions';

class SubscriptionPaymentModal extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        plan: 'monthly',
        payment_method: 'card',
        stripe: undefined,
        cardElement: undefined,
        subscribing: false,
        alert: {
          type: '',
          message: ''
        },
      }
    }

    componentDidMount(){
      const { subscribePlan } = this.props;
      this.setState({plan: subscribePlan});
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
      // Payment was successful.
      this.setState({ subscribing: false });
      ls.set('latestStripeCustomerId', null);
      ls.set('latestPlan', null);
      ls.set('latestPriceId', null);
      ls.set('latestInvoiceId', null);
      ls.set('latestInvoicePaymentIntentStatus', null);
      if (result.subscription && result.subscription.status === 'active') {
        const params = {
          userId: this.props.user.id,
          stripeCustomerId: result.stripeCustomerId,
          subscriptionId: result.subscription.id,
          plan: result.plan
        }
        APIs.updateSubscriptionStatus(params).then(resp => {
          this.props.updateUser({ ...this.props.user, subscriptionId: params.subscriptionId, subscribedPlan: params.plan });
          this.props.onDone(params.plan);
        }).catch(err => {
          let message = err.message;
          if (err.response) {
            message = err.response.data.message;
          }
          this.setState({ alert: { type: 'danger', message }, subscribing: false });
        });
      }
    }

    onConfirm = async() => {      
      const { stripe, cardElement, plan } = this.state;
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
        const stripeCustomerId = this.props.user.stripeCustomerId;
        if (pStripeCustomerId === stripeCustomerId && latestPlan === plan && latestInvoicePaymentIntentStatus === 'requires_payment_method' ) {
          // Update the payment method and retry invoice payment
          const invoiceId = ls.get('latestInvoiceId');
          const priceId = ls.get('latestPriceId');
          console.log('Retry last invoice : ', invoiceId);
          this.retryInvoiceWithNewPaymentMethod({ stripeCustomerId, paymentMethodId, invoiceId, priceId });
        } else {
          // Create the subscription
          // this.createSubscription({ customerId, paymentMethodId, priceId });
          const params = { stripeCustomerId, plan, paymentMethodId };
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
      const { subscribing, alert } = this.state;
      const { isOpen, toggle } = this.props;

      return (
        <Modal isOpen={isOpen} toggle={toggle} onOpened={this.onOpened} size='lg' centered style={{height: 500}}>
          <ModalBody>
            <div className='d-flex flex-grow-1 justify-content-between mb-lg-5'>
              <h4 className='mb-0 text-darkgray'><strong>Credit Card</strong></h4>
              <Button className='border-0 bg-transparent p-0' onClick={toggle}>
                <img alt='...' src={require('assets/img/svg/cancel.svg')} width={30} height={30} />
              </Button>
            </div>
            <InjectedCardSection onCardElementReady={this.onCardElementReady} />
            { alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert> }
            <div className='d-flex justify-content-end mt-lg-5 '>
              <Button
                className='bg-white text-darkgray p-2'
                onClick={toggle}>
                <small style={{fontWeight: 'bold'}}>CLOSE</small>
              </Button>
              <Button className='bg-blue text-white border-0 p-2 ml-3' 
                loading={subscribing}
                disabled={subscribing}
                onClick={this.onConfirm}>
                <small style={{fontWeight: 'bold'}}>SUBSCRIBE</small>
              </Button>
            </div>
          </ModalBody>
        </Modal>
      );
    }
}

const mapStateToProps = (state) => ({
  user: state.user
});

const mapDispatchToProps = (dispatch) => ({
  updateUser: (user) => dispatch(updateUser(user))
})

export default connect(mapStateToProps, mapDispatchToProps)(SubscriptionPaymentModal);