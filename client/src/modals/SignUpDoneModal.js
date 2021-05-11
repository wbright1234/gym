import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import { Checkbox } from 'react-input-checkbox';
import Button from 'reactstrap-button-loader';

export default class SignUpDoneModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: false
    }
  }

  render() {
    const { isOpen, onClose } = this.props;
    const { checked } = this.state;
    return (
      <Modal isOpen={isOpen} centered>
        <ModalBody className='d-flex flex-column align-items-center'>
          <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} className="mt-5 mb-5" />
          <img
            alt='...'
            src={require('assets/img/svg/check-circle.svg')}
            width={150}
            height={150}
            className='my-5' />
          <div className='text-center'>
            <p>
            Thank you for registering, you will be notified
            </p>
            <p>once your registration is approved, you will
            </p>
            <p>then be able to login and start scheduling!</p>
          </div>
          <div className='d-flex flex-fill mt-4'>
            <Checkbox
              theme='bootstrap-checkbox'
              value={checked}
              onChange={() => this.setState({ checked: !this.state.checked })}
              children={<span />}
              />
            <h6 className='ml-2 text-darkgray' style={{ cursor: 'pointer' }}
              onClick={() => this.setState({ checked: !this.state.checked })}>I understand</h6>
          </div>
          <Button className='bg-blue text-white border-0 w-90 my-4 py-2' onClick={onClose} disabled={!checked}>
            <strong>OK</strong>
          </Button>
        </ModalBody>
      </Modal>
    )
  }
}
