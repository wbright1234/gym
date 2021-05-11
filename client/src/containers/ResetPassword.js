import React from 'react';
import {
  Alert,
  Row,
  Col,
  Card,
  InputGroup,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  FormFeedback,
  Form
} from 'reactstrap';
import Button from 'reactstrap-button-loader';
import { isMobile } from 'react-device-detect';
import APIs from 'APIs';

export default class ResetPassword extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      password: '',
      passwordError: '',
      confirmPassword: '',
      confirmPasswordError: '',
      sending: false
    }
  }

  resetPassword = () => {
    const { password, confirmPassword } = this.state;
    if (!password) {
      this.setState({ passwordError: 'New password field cannot be empty' });
      return;
    }
    if (!confirmPassword) {
      this.setState({ confirmPasswordError: 'Confirm password field cannot be empty' });
      return;
    }
    if (password !== confirmPassword) {
      this.setState({ confirmPasswordError: 'Confirm password must match with new password' });
      return;
    }
    if (password.length < 5) {
      this.setState({ passwordError: 'New password must be at least 5 characters' });
      return;
    }
    const userId = this.props.match.params.id;
    const token = this.props.match.params.token;
    this.setState({ sending: true });
    APIs.storePassword({ userId, token, password }).then(resp => {
      this.setState({ sending: false });
      this.props.history.push('/sign-in');
    }).catch(err => {
      let message;
      if (err.response) {
        message = err.response.data.message;
      } else {
        message = err.message;
      }
      this.setState({ sending: false, alert: { type: 'danger', message } });
    })
  }

  render() {
    const {
      alert,
      password,
      passwordError,
      confirmPassword,
      confirmPasswordError,
      sending
    } = this.state;
    return (
      <div className='d-flex flex-column flex-fill'>
        <Row className='d-flex flex-fill'>
          <Col xs='12' lg='6' className="d-flex flex-column flex-fill justify-content-center">
              <img alt='...' src={require('assets/img/png/login-left.png')} className='login-left-img' />
          </Col>
          <Col xs='12' lg='6' className='d-flex flex-column flex-fill align-items-center justify-content-center'>
            <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} />
            <Card className={'d-flex flex-column align-items-center border-1 bg-white mt-4 ' + (isMobile ? 'w-90' : 'w-75')}>
              <h4 className='blue-tint text-bold mt-3'>Reset Password</h4>
              <h5 className='blue-tint mt-1'>Please input your new password</h5>
              <FormGroup className='w-90 mt-4'>
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
                      onChange={event => this.setState({ password: event.target.value, passwordError: '' })}
                      invalid={passwordError ? true : false} />
                  </InputGroup>
                </Form>
                <FormFeedback>{passwordError}</FormFeedback>
                <Form className='mt-4' autoComplete='off'>
                  <InputGroup>
                    <InputGroupAddon addonType='prepend'>
                      <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                        <img alt='...' src={require('assets/img/svg/padlock.svg')} width={20} height={20} />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input type='password'
                      placeholder='Enter your confirm password'
                      className='border-top-0 border-left-0 border-right-0 rounded-0'
                      value={confirmPassword}
                      onChange={event => this.setState({ confirmPassword: event.target.value, confirmPasswordError: '' })}
                      invalid={confirmPasswordError ? true : false} />
                  </InputGroup>
                </Form>
                <FormFeedback>{confirmPasswordError}</FormFeedback>
              </FormGroup>
              {alert.message && <Alert color={alert.type}>{alert.message}</Alert>}
              <Button
                className='bg-blue text-white border-0 w-90 my-4 py-2'
                onClick={this.resetPassword}
                loading={sending}
                disabled={sending}>
                <span className='nav-link-inner--text ml-1 f-family-poppins'>
                  Reset Password
                </span>
              </Button>
            </Card>
          </Col>
        </Row>
        <img alt='...' src={require('assets/img/png/login-right.png')} className='login-right-img' />
      </div>
    )
  }
}
