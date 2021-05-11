import React from 'react';
import { Alert, Card, Form, FormFeedback, FormGroup, Input, InputGroup, InputGroupText, InputGroupAddon, Row } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import { isMobile } from 'react-device-detect';
import { Checkbox } from 'react-input-checkbox';
import WaitingConfirmationModal from 'modals/WaitingConfirmationModal';
import APIs from 'APIs';
import { isEmail } from 'validator';
import ls from 'local-storage';
import { connect } from 'react-redux';
import { updateUser } from 'redux/user/actions';

class SignIn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      email: '',
      emailErr: '',
      password: '',
      passwordErr: '',
      rememberMe: false,
      waitingConfirmation: false,
      isLoggingIn: false
    }
  }

  componentDidMount() {
    if (ls.get('rememberMe')) {
      this.setState({ email: ls.get('email'), password: ls.get('password'), rememberMe: true });
    }
  }

  onSignIn = () => {
    const { email, password, rememberMe } = this.state;
    if (!email || !isEmail(email)) {
      this.setState({ emailErr: 'Invalid email' });
      return;
    }
    if (!password) {
      this.setState({ passwordErr: 'Invalid password' });
      return;
    }
    this.setState({ isLoggingIn: true, alert: { type: '', message: '' } });
    const params = {
      email, password
    }
    APIs.userLogin(params).then(resp => {
      const { accessToken, refreshToken, user } = resp.data.data;
      if ( user.role !== 'doorman' && !user.phone_verify) {
        this.props.history.push('/signin-phone-confirm', {user, rememberMe, accessToken, refreshToken, email, password});
        return;
      }
      if ( user.role === "admin" && !user.subscribedPlan ) {
        this.props.history.push('/signup-subscription', {userId: user.id, stripeCustomerId: user.stripeCustomerId, registrationCapacity: user.registrationCapacity});
        return;
      }
      if (!user.confirmed) {
        this.setState({ waitingConfirmation: true, isLoggingIn: false });
        return;
      }
      
      this.props.updateUser(user);
      this.setState({ isLoggingIn: false });
      APIs.setAccessToken(accessToken);
      ls.set('refreshToken', refreshToken);
      ls.set('isLoggedIn', true);
      if (rememberMe) {
        ls.set('rememberMe', true);
        ls.set('email', email);
        ls.set('password', password);
      } else {
        ls.set('rememberMe', false);
      }
      this.props.history.push('/dashboard');
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message }, isLoggingIn: false });
    });
  }

  render() {
    const { alert, email, emailErr, password, passwordErr, rememberMe, waitingConfirmation, isLoggingIn } = this.state;

    return (
      <div className='d-flex flex-column flex-fill'>
        <Row className='d-flex flex-fill' style={{margin:0, padding: 0}}>
          <div className="col-xs-12 col-lg-6 col-md-6 d-flex flex-column flex-fill justify-content-center" style={{padding: 0}}>
              <img alt='...' src={require('assets/img/png/login-left.png')} className='login-left-img' />
          </div>
          <div className='col-xs-12 col-lg-6 col-md-6 d-flex flex-column flex-fill align-items-center justify-content-center' style={{padding: 0}}>
            <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} />
            <Card className={'d-flex flex-column align-items-center border-1 bg-white mt-4 ' + (isMobile ? 'w-90' : 'w-75')}>
              <h4 className='blue-tint text-bold mt-3'>Welcome Back</h4>
              <h5 className='blue-tint mt-1'>Please log in</h5>
              <FormGroup className='w-90'>
                <Form className='mt-4' autoComplete='off'>
                  <InputGroup>
                    <InputGroupAddon addonType='prepend'>
                      <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                        <img alt='...' src={require('assets/img/svg/mail.svg')} width={20} height={20} />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input type='email'
                      placeholder='Enter your email'
                      className='border-top-0 border-left-0 border-right-0 rounded-0'
                      value={email}
                      onChange={event => this.setState({ email: event.target.value, emailErr: '' })}
                      invalid={emailErr ? true : false} />
                  </InputGroup>
                </Form>
                <FormFeedback>{emailErr}</FormFeedback>
                <Form className='mt-4' autoComplete='off'>
                  <InputGroup>
                    <InputGroupAddon addonType='prepend'>
                      <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                        <img alt='...' src={require('assets/img/svg/padlock.svg')} width={20} height={20} />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input type='password'
                      placeholder='Enter your password'
                      className='border-top-0 border-left-0 border-right-0 rounded-0'
                      value={password}
                      onChange={event => this.setState({ password: event.target.value, passwordErr: '' })}
                      invalid={passwordErr ? true : false} />
                  </InputGroup>
                </Form>
                <FormFeedback>{passwordErr}</FormFeedback>
              </FormGroup>
              <div className={'d-flex justify-content-between mt-4 ' + (isMobile ? 'w-90' : 'w-75')}>
                <div className='d-flex'>
                  <Checkbox
                    theme='bootstrap-checkbox'
                    value={rememberMe}
                    onChange={() => this.setState({ rememberMe: !this.state.rememberMe })}
                    children={<span />}
                    />
                  <h6 className='ml-2 text-darkgray'>Remember me</h6>
                </div>
                <Button className='bg-transparent border-0 shadow-none p-0' tag='a' href='/forgot-password'>
                  <h6 className='text-darkgray'>Forgot Password?</h6>
                </Button>
              </div>
              {
                alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert>
              }
              <Button className='bg-blue text-white border-0 w-90 mt-3 py-2' loading={isLoggingIn} disabled={isLoggingIn} onClick={this.onSignIn}>
                <strong>SIGN IN</strong>
              </Button>
              <div className='d-flex my-4'>
                <h6 className='text-darkgray'>Don't have an account?</h6>
                <Button className='bg-transparent border-0 shadow-none p-0' tag='a' href='/sign-up'>
                  <h6 className='mb-0 blue-tint'><strong>&nbsp;Sign Up</strong></h6>
                </Button>
              </div>
            </Card>
          </div>
        </Row>
        <img alt='...' src={require('assets/img/png/login-right.png')} className='login-right-img' />        
        {
          waitingConfirmation &&
          <WaitingConfirmationModal
            isOpen={waitingConfirmation}
            toggle={() => this.setState({ waitingConfirmation: false })} />
        }
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
})

const mapDispatchToProps = (dispatch) => ({
  updateUser: (user) => dispatch(updateUser(user))
})

export default connect(mapStateToProps, mapDispatchToProps)(SignIn);
