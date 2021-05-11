import React from 'react';
import { Alert, Card, Form, FormGroup, FormFeedback, Input, InputGroup, InputGroupText, InputGroupAddon } from 'reactstrap';
import Button from 'reactstrap-button-loader'
import { isMobile } from 'react-device-detect';
import { isEmail } from 'validator';
import APIs from 'APIs';

export default class ForgotPassword extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      email: '',
      emailErr: '',
      sendingEmail: false
    }
  }

  resetPassword = () => {
    const { email } = this.state;
    if (!email || !isEmail(email)) {
      this.setState({ emailErr: 'Invalid email' });
      return;
    }
    this.setState({ sendingEmail: true, alert: { type: '', message: '' } });
    const params = {
      email
    }
    console.log('Params: ', params);
    APIs.resetPassword(params).then(resp => {
      console.log('Reset password: ', resp.data);
      this.setState({ sendingEmail: false, alert: { type: 'success', message: 'Reset password link sent to your email' } });
    }).catch(err => {
      console.log('Reset password err: ', err);
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ sendingEmail: false, alert: { type: 'danger', message } });
    });
  }

  render() {
    const { alert, email, emailErr, sendingEmail } = this.state;
    return (
      <div className='d-flex flex-column flex-fill'>
        <div className='d-flex flex-fill'>
          <div className="col-xs-12 col-lg-6 d-flex flex-column flex-fill justify-content-center" style={{padding: 0}}>
              <img alt='...' src={require('assets/img/png/login-left.png')} className='login-left-img' />
          </div>
          <div className='col-xs-12 col-lg-6 d-flex flex-column flex-fill align-items-center justify-content-center' style={{padding: 0}}>
            <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} />
            <Card className={'d-flex flex-column align-items-center border-1 bg-white mt-4 ' + (isMobile ? 'w-90' : 'w-75')}>
              <h4 className='blue-tint text-bold mt-3'>Password Recovery</h4>
              <h5 className='blue-tint mt-1'>Let's get your password back</h5>
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
              </FormGroup>
              {alert.message && <Alert color={alert.type}>{alert.message}</Alert>}
              <Button className='bg-blue text-white border-0 w-90 mt-4 py-2'
                onClick={this.resetPassword}
                loading={sendingEmail}
                disabled={sendingEmail}>
                <strong>RESET PASSWORD</strong>
              </Button>
              <div className='d-flex my-4'>
                <h6 className='text-darkgray'>Remember your password?</h6>
                <Button className='bg-transparent border-0 shadow-none p-0' tag='a' href='/sign-in'>
                  <h6 className='mb-0 blue-tint'><strong>&nbsp;Sign In</strong></h6>
                </Button>
              </div>
            </Card>
          </div>
        </div>
        <img alt='...' src={require('assets/img/png/login-right.png')} className='login-right-img' />
      </div>
    )
  }
}
