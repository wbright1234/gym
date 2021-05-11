import React from 'react';
import { CardElement, ElementsConsumer } from '@stripe/react-stripe-js';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: 'Poppins',
      fontSize: '16px',
      fontWeight: 400,
      fontSmoothing: 'antialiased',
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

class CardSection extends React.Component {
  render() {
    const { stripe } = this.props;
    return (
        <div style={{border: '1px solid #B6B6BA'}} className='px-4 py-2 shadow-sm mt-3 mb-3'>
            <CardElement options={CARD_ELEMENT_OPTIONS} onReady={(element) => this.props.onCardElementReady(stripe, element)} />
        </div>
    )
  }
}

export const InjectedCardSection = ({ onCardElementReady }) => (
  <ElementsConsumer>
    {({elements, stripe}) => (
      <CardSection elements={elements} stripe={stripe} onCardElementReady={onCardElementReady} />
    )}
  </ElementsConsumer>
)