import React from 'react';
import {
  Alert,
  Modal,
  ModalBody,
  Row,
  Col,
  Form,
  Input,
  Label,
  FormFeedback
} from 'reactstrap';
import Button from 'reactstrap-button-loader';
import validator from 'validator';
import APIs from 'APIs';

export default class AddDoormanModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      name: '',
      nameErr: '',
      email: '',
      emailErr: '',
      phoneNumber: '',
      phoneNumberErr: '',
      password: '',
      passwordErr: '',
      confirmPassword: '',
      confirmPasswordErr: '',
      addingDoorman: false
    }
  }

  componentDidMount() {
    const { activeDoorman } = this.props;
    if (activeDoorman) {
      this.setState({ name: activeDoorman.name, email: activeDoorman.email, phoneNumber: activeDoorman.phoneNumber });
    }
  }

  onAddDoorman = () => {
    const { activeDoorman, buildingId } = this.props;
    const { name, email, phoneNumber, password, confirmPassword } = this.state;
    if (!name) {
      //this.setState({ nameErr: 'Invalid name' });
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Invalid name'} });
      return;
    }
    if (!email || !validator.isEmail(email)) {
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Invalid email'} });
      return;
    }
    if (!phoneNumber || !validator.isMobilePhone(phoneNumber)) {
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Invalid phone number'} });
      return;
    }
    if (!password) {
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Invalid password'} });
      return;
    }
    if (password.length < 6) {
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Password must be atleast 6 length'} });
      return;
    }
    if (!confirmPassword) {
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Input confirm password'} });
      return;
    }
    if ( password !== confirmPassword) {
      this.setState({ addingDoorman: false, alert: { type: 'danger', message: 'Password not match'} });
      return;
    }
    this.setState({ addingDoorman: true });
    const params = {
      id: activeDoorman ? activeDoorman.id : '',
      name, email, phoneNumber, password: password, role: 'doorman', buildingId: buildingId
    }
    APIs.addDoorman(params).then(resp => {
      const { data } = resp.data;
      this.setState({ addingDoorman: false });
      if (this.props.onAddedDoorman) {
        this.props.onAddedDoorman(data);
      }
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ addingDoorman: false, alert: { type: 'danger', message } });
    });
  }

  render() {
    const { isOpen, toggle, activeDoorman } = this.props;
    const { alert, name, nameErr, email, emailErr, phoneNumber, phoneNumberErr, password, passwordErr, confirmPassword, confirmPasswordErr, addingDoorman } = this.state;
    return (
      <Modal size='lg' isOpen={isOpen} toggle={toggle} centered>
        <ModalBody>
          <div className='d-flex flex-grow-1 justify-content-between'>
            <h4 className='mb-0 text-white'><strong>Add New Doorman</strong></h4>
            <Button className='border-0 bg-transparent p-0' onClick={toggle}>
              <img alt='...' src={require('assets/img/svg/cancel.svg')} width={30} height={30} />
            </Button>
          </div>
          <Row className='mt-5'>
            <Col xs='12' sm='6'>
              <Form>
                <Label><strong>FULL NAME</strong></Label>
                <Input type='text'
                  placeholder='Enter Name'
                  value={name}
                  onChange={e => this.setState({ name: e.target.value, nameErr: '' })}
                  invalid={nameErr ? true : false} />
              </Form>
              <FormFeedback>{nameErr}</FormFeedback>
            </Col>
            <Col xs='12' sm='6' className='mt-3 mt-sm-0'>
              <Form>
                <Label><strong>ROLE</strong></Label>
                <Input type='text' placeholder='Enter Role' value='Doorman' disabled />
              </Form>
            </Col>
          </Row>
          <Row className='mt-3 mt-sm-5'>
            <Col xs='12' sm='6'>
              <Form>
                <Label><strong>EMAIL</strong></Label>
                <Input type='email'
                  placeholder='Enter Email'
                  value={email}
                  onChange={e => this.setState({ email: e.target.value, emailErr: '' })}
                  invalid={emailErr ? true : false} />
              </Form>
              <FormFeedback>{emailErr}</FormFeedback>
            </Col>
            <Col xs='12' sm='6' className='mt-3 mt-sm-0'>
              <Form>
                <Label><strong>PHONE NUMBER</strong></Label>
                <Input type='tel'
                  placeholder='Enter Phone Number'
                  value={phoneNumber}
                  onChange={e => this.setState({ phoneNumber: e.target.value, phoneNumberErr: '' })}
                  invalid={phoneNumberErr ? true : false} />
              </Form>
              <FormFeedback>{phoneNumberErr}</FormFeedback>
            </Col>
          </Row>
          <Row className='mt-3 mt-sm-5'>
            <Col xs='12' sm='6'>
              <Form>
                <Label><strong>PASSWORD</strong></Label>
                <Input type='password'
                  placeholder='Enter Password'
                  value={password}
                  onChange={e => this.setState({ password: e.target.value, emailErr: '' })}
                  invalid={passwordErr ? true : false} />
              </Form>
              <FormFeedback>{passwordErr}</FormFeedback>
            </Col>
            <Col xs='12' sm='6' className='mt-3 mt-sm-0'>
              <Form>
                <Label><strong>CONFIRM PASSWORD</strong></Label>
                <Input type='password'
                  placeholder='Repeat Password'
                  value={confirmPassword}
                  onChange={e => this.setState({ confirmPassword: e.target.value, phoneNumberErr: '' })}
                  invalid={confirmPasswordErr ? true : false} />
              </Form>
              <FormFeedback>{confirmPasswordErr}</FormFeedback>
            </Col>
          </Row>
          {alert.message && <Alert color={alert.type} className='mt-4'>{alert.message}</Alert>}
          <div className='d-flex justify-content-end mt-5'>
            <Button className='bg-white text-darkgray p-2'
              onClick={toggle}>
              <small style={{fontWeight: 'bold'}}>CLOSE</small>
            </Button>
            <Button className='bg-blue text-white border-0 p-2 ml-3'  
              loading={addingDoorman}
              disabled={addingDoorman}
              onClick={this.onAddDoorman}>
              <small style={{fontWeight: 'bold'}}>{activeDoorman ? 'EDIT DOORMAN' : 'ADD DOORMAN'}</small>
            </Button>
          </div>
        </ModalBody>
      </Modal>
    )
  }
}
