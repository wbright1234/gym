import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react'
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'assets/gym-styles.scss';
import 'react-input-checkbox/lib/react-input-checkbox.min.css';
import "react-datetime/css/react-datetime.css";
import SignUp from 'containers/SignUp';
import SignIn from 'containers/SignIn';
import SignUpPhoneVerify from 'containers/SignUpPhoneVerification';
import SignInPhoneVerify from 'containers/SignInPhoneVerification';
import Homepage from 'containers/Homepage';
import ForgotPassword from 'containers/ForgotPassword';
import Dashboard from 'containers/Dashboard';
import ResetPassword from 'containers/ResetPassword';
import SubscriptionPayment from 'containers/SubscriptionPayment';
import history from './history.js';
import HttpsRedirect from 'react-https-redirect';
import * as serviceWorker from './serviceWorker';
import configureStore from './redux/index.js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const { store, persistor } = configureStore();
const stripePromise = loadStripe('pk_test_51HiAlsD4eoVJD4iBXmUi7zetFEPJqfWLgOyYKGLrIvnCKcqtT8qgKsCh62va726wNv2GAghAyjgPpetKJeXu9FkA00MS3li0aK');
const rootElement = document.getElementById("root");
const rootDOM = (
  <Elements stripe={stripePromise} options={{
    fonts: [
      {
        cssSrc:
          "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap"
      }
    ]
  }}>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <HttpsRedirect>
          <Router history={history}>
            <Switch>
              <Route path="/"
                exact
                component={Homepage} />
              <Route
                path="/sign-up"
                exact
                component={SignUp} />
              <Route
                path='/sign-in'
                exact
                component={SignIn} />
              <Route
                path='/forgot-password'
                exact
                component={ForgotPassword} />
              <Route
                path='/dashboard'
                exact
                component={Dashboard} />
              <Route
                path='/reset/:id/:token'
                exact
                render={props => <ResetPassword {...props} />} />
              <Route
                path='/signup-phone-confirm'
                exact
                component={SignUpPhoneVerify} />
              <Route
                path='/signin-phone-confirm'
                exact
                component={SignInPhoneVerify} />
              <Route
                path='/signup-subscription'
                exact
                component={SubscriptionPayment} />
              <Redirect to="/" />
            </Switch>
          </Router>
        </HttpsRedirect>
      </PersistGate>
    </Provider>
  </Elements>
);

if (rootElement.hasChildNodes()) {
  ReactDOM.hydrate(rootDOM, rootElement);
} else {
  ReactDOM.render(rootDOM, rootElement);
}
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
