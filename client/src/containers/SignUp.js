import React from 'react';
import { Alert, Card, Form, FormGroup, FormFeedback, Input, InputGroup, InputGroupText, InputGroupAddon, ButtonGroup, Row, Col } from 'reactstrap';
import Button from 'reactstrap-button-loader'
import { Checkbox } from 'react-input-checkbox';
import APIs from 'APIs';
import { isEmail, isMobilePhone, isNumeric } from 'validator';
import { isMobile, BrowserView, MobileView } from 'react-device-detect';
import ReCAPTCHA from "react-google-recaptcha";
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

export default class SignUp extends React.Component {
  constructor(props) {
    super(props);
    this.recaptchaRef = React.createRef();
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      name: '',
      nameErr: '',
      email: '',
      emailErr: '',
      password: '',
      passwordErr: '',
      phoneNumber: '',
      phoneNumberErr: '',
      aptNumber: '',
      aptNumberErr: '',
      buildingName: '',
      buildingNameErr: '',
      registrationCapacity: '',
      registrationCapacityErr: '',
      agreePolicy: false,
      isRegistering: false,
      doneSignUp: false,
      accountType: 1,
      buildingId: 0,
      buildingError: '',
      buildings: [],
      recaptcha: false
    }    
  }

  componentDidMount() {
    this.onGetBuildings();
  }

  onGetBuildings = () =>  {
    APIs.getBuildings().then(resp => {
      let { data } = resp.data;
      this.setState({
        buildings: [...this.state.buildings, ...data],
      });
    });
  }

  onSignUp = () => {
    const { name, email, password, phoneNumber, aptNumber, agreePolicy, accountType, buildingName, registrationCapacity, buildingId, recaptcha } = this.state;
    if (!name) {
      this.setState({ alert: { type: 'danger', message: 'Invalid name' } });
      return;
    }
    if (!email || !isEmail(email)) {
      this.setState({ alert: { type: 'danger', message: 'Invalid email' } });
      return;
    }
    if (!password) {
      this.setState({ alert: { type: 'danger', message: 'Invalid password' } });
      return;
    }
    if (!phoneNumber || !isMobilePhone(phoneNumber)) {
      this.setState({ alert: { type: 'danger', message: 'Invalid phone number' } });
      return;
    }
    if ( accountType === 1) {
      if ( buildingId == 0 ) {
        this.setState({ alert: { type: 'danger', message: 'Invalid building' } });
        return;
      }
      if (!aptNumber) {
        this.setState({ alert: { type: 'danger', message: 'Invalid apartment number' } });
        return;
      }
    } else if ( accountType === 0 ) {
      if ( !buildingName ) {
        this.setState({ alert: { type: 'danger', message: 'Invalid building name' } });
        return;
      }
      if ( !registrationCapacity || registrationCapacity===0 || !isNumeric(registrationCapacity) ) {
        this.setState({ alert: { type: 'danger', message: 'Invalid building registration capactiy' } });
        return;
      }
    }

    if (!agreePolicy) {
      this.setState({ alert: { type: 'danger', message: 'You must agree terms of service and privacy policy' } });
      return;
    }
    
    if (!recaptcha) {
      this.setState({ alert: { type: 'danger', message: 'You must check you are not robot' } });
      return;
    }
    
    if ( accountType === 1 ) {
      this.setState({ isRegistering: true, alert: { type: '', message: '' } });
      var params = { name, email, password, phoneNumber, aptNumber, buildingId, role: 'shareholder' };
      APIs.shareholderRegister(params).then(resp => {       
        const userId = resp.data.userId;
        this.props.history.push('/signup-phone-confirm', {admin: false, userId: userId});
      }).catch(err => {
        let message = err.message;
        if (err.response) { 
          message = err.response.data.message;
        }
        this.setState({ isRegistering: false, alert: { type: 'danger', message } });
      });
    } else if ( accountType === 0 ) {
      this.setState({ isRegistering: true, alert: { type: '', message: '' } });    
      var params = { name, email, password, phoneNumber, buildingName, registrationCapacity, role: 'admin' };
      APIs.adminRegister(params).then(resp => {
        const userId = resp.data.userId;
        params = { userId, email, name };
        APIs.createStripeCustomer(params).then(resp => {
          const stripeCustomerId = resp.data.data.id;
          this.setState({ isRegistering: false, doneSignUp: true });
          this.props.history.push('/signup-phone-confirm', {admin: true, userId: userId, stripeCustomerId: stripeCustomerId, registrationCapacity: registrationCapacity });
        });
      }).catch(err => {
        let message = err.message;
        if (err.response) {
          message = err.response.data.message;
        }
        this.setState({ isRegistering: false, alert: { type: 'danger', message } });
      });
    }
  }

  renderBuildingOptions = () => {
    const { buildings } = this.state;
    var buildingOptions = [];
    buildingOptions.push(<option key={0} value={0}>Select building code</option>);
    buildings.map( building => {
      buildingOptions.push(<option key={building.adminId} value={building.id}>{building.id}</option>);
    });
    return buildingOptions;
  }

  render() {
    const {
      alert, name, nameErr, email, emailErr, password, passwordErr, phoneNumber, phoneNumberErr, aptNumber, aptNumberErr, agreePolicy, isRegistering, 
      accountType, buildingName, buildingNameErr, registrationCapacity, registrationCapacityErr, buildingId, buildingError
    } = this.state;

    return (
      <div className='d-flex flex-column flex-fill'>
        <Row className='d-flex flex-fill h-100' style={{margin:0, padding: 0}}>
          <Col lg='6' className="d-flex flex-column flex-fill justify-content-center" style={{padding: 0}}>
              <img alt='...' src={require('assets/img/png/login-left.png')} className='login-left-img' />
          </Col>
          <Col lg='6' className='d-flex flex-column align-items-center justify-content-center' style={{padding: 0}}>
            <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} className='mt-5' />
            <Card className={'d-flex flex-column align-items-center border-1 bg-white mt-4 ' + (isMobile ? 'w-90' : 'w-75')}>
              <h4 className='blue-tint text-bold mt-3'>Sign Up</h4>
              <h5 className='blue-tint mt-1'>Create your Account</h5>
              <ButtonGroup className='w-90 mt-3'>
              <Button 
                  className={accountType===1 ? "bg-blue text-white border-0 w-50" : "bg-white tint-color border-tint w-50"}
                  onClick={()=> { this.setState({accountType: 1}); }}>Resident</Button>
                <Button 
                  className={accountType===0 ? "bg-blue text-white border-0 w-50" : "bg-white tint-color border-tint w-50"}
                  onClick={()=> { this.setState({accountType: 0}); }}>Building Manager</Button>                
              </ButtonGroup>
              <FormGroup className='w-90'>
                <Form className='mt-3'>
                  <InputGroup>
                    <InputGroupAddon addonType='prepend'>
                      <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                        <img alt='...' src={require('assets/img/svg/user.svg')} width={20} height={20} />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input type='email'
                      placeholder='Enter your name'
                      className='border-top-0 border-left-0 border-right-0 rounded-0'
                      value={name}
                      onChange={event => this.setState({ name: event.target.value, nameErr: '' })}
                      invalid={nameErr ? true : false} />
                  </InputGroup>
                </Form>
                <FormFeedback>{nameErr}</FormFeedback>
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
                <Form className='mt-4' autoComplete='off'>
                  <InputGroup>
                    <InputGroupAddon addonType='prepend'>
                      <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 border-bottom-0 rounded-0'>
                        <img alt='...' src={require('assets/img/svg/smartphone.svg')} width={20} height={20} />
                      </InputGroupText>
                    </InputGroupAddon>
                    <PhoneInput
                      country={'us'}
                      value={phoneNumber}
                      onChange={phone => this.setState({ phoneNumber: '+' + phone, phoneNumberErr: '' })} 
                      inputStyle={{ width: '100%' }}
                      containerStyle={{ flex: 1, paddingLeft: 12 }} />
                  </InputGroup>
                </Form>
                <FormFeedback>{phoneNumberErr}</FormFeedback>
                { accountType === 1 ? 
                  <>                    
                    <Form className='mt-4'>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>
                          <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                            <img alt='...' src={require('assets/img/svg/building.svg')} width={20} height={20} />
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type='select'
                          value={buildingId} onChange={e => {console.log(e.target.value); this.setState({buildingId: e.target.value});}}
                          className='border-top-0 border-left-0 border-right-0 rounded-0' invalid={buildingError ? true : false} >
                          {this.renderBuildingOptions()}
                        </Input>
                      </InputGroup>
                    </Form>
                    <FormFeedback>{buildingError}</FormFeedback>
                    <Form className='mt-4'>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>
                          <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                            <img alt='...' src={require('assets/img/svg/padlock.svg')} width={20} height={20} />
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type='text'
                          placeholder='Enter your apartment number'
                          className='border-top-0 border-left-0 border-right-0 rounded-0'
                          value={aptNumber}
                          onChange={event => this.setState({ aptNumber: event.target.value, aptNumberErr: '' })}
                          invalid={aptNumberErr ? true : false} />
                      </InputGroup>
                    </Form>
                    <FormFeedback>{aptNumberErr}</FormFeedback>
                  </> : 
                  <>
                    <Form className='mt-4'>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>
                          <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                            <img alt='...' src={require('assets/img/svg/building.svg')} width={20} height={20} />
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type='text'
                          placeholder='Enter your building name'
                          className='border-top-0 border-left-0 border-right-0 rounded-0'
                          value={buildingName}
                          onChange={event => this.setState({ buildingName: event.target.value, buildingNameErr: '' })}
                          invalid={buildingNameErr ? true : false} />
                      </InputGroup>
                    </Form>
                    <FormFeedback>{buildingNameErr}</FormFeedback>
                    <Form className='mt-4'>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>
                          <InputGroupText className='bg-white border-top-0 border-left-0 border-right-0 rounded-0'>
                            <img alt='...' src={require('assets/img/svg/building.svg')} width={20} height={20} />
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type='text'
                          placeholder='Enter building registration capacity'
                          className='border-top-0 border-left-0 border-right-0 rounded-0'
                          value={registrationCapacity}
                          onChange={event => this.setState({ registrationCapacity: event.target.value, registrationCapacityErr: '' })}
                          invalid={registrationCapacityErr ? true : false} />
                      </InputGroup>
                    </Form>
                    <FormFeedback>{registrationCapacityErr}</FormFeedback>
                  </>
                }                
              </FormGroup>
              <form onSubmit={this.onSubmit} >
                <ReCAPTCHA
                  ref={this.recaptchaRef}
                  sitekey="6Lfi2t4ZAAAAAPhZ9i7b7XHumMALMomkDvdsncOo"
                  onChange={(value) => { this.setState({recaptcha: true}) }}
                />
              </form>
              <div className={'d-flex align-items-center'}>
                <Checkbox
                  theme='bootstrap-checkbox'
                  value={agreePolicy}
                  onChange={() => this.setState({ agreePolicy: !this.state.agreePolicy })}
                  children={<span></span>}
                  />
                <BrowserView>
                  <small className='ml-2'>I agree to the</small>
                  <small className='blue-tint'><a href='/'>&nbsp;Terms of Service</a></small>
                  <small>&nbsp;and</small>
                  <small className='blue-tint'><a href='/'>&nbsp;Privacy Policy</a></small>
                </BrowserView>
                <MobileView>
                  <div className='d-flex align-items-center'>
                    <small className='ml-2'>I agree to the</small>
                    <small className='blue-tint'><a href='/'>&nbsp;Terms of Service</a></small>
                    <small>&nbsp;and</small>
                  </div>
                  <div className='d-flex align-items-center justify-content-center'>
                    <small className='blue-tint'><a href='/'>&nbsp;Privacy Policy</a></small>
                  </div>
                </MobileView>
              </div>
              {alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert>}
              <Button
                className='bg-blue text-white border-0 w-90 mt-3 py-2'
                loading={isRegistering}
                disabled={isRegistering}
                onClick={this.onSignUp}>
                <strong>SIGN UP</strong>
              </Button>
              <div className='d-flex my-4'>
                <h6>Already have an account?</h6>
                <Button className='bg-transparent border-0 shadow-none p-0' tag='a' href='/sign-in'>
                  <h6 className='mb-0 blue-tint'><strong>&nbsp;Sign In</strong></h6>
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
        <img alt='...' src={require('assets/img/png/login-right.png')} className='login-right-img' />
      </div>
    )
  }
}
