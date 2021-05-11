import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import Button from 'reactstrap-button-loader';

export default class AdminSignUpDoneModal extends React.Component {

  render() {
    const { isOpen, onClose } = this.props;
    return (
      <Modal isOpen={isOpen} centered>        
        <ModalBody className='d-flex flex-column align-items-center'>
          <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} className="mt-5 mb-5" />
          <img alt='...'
            src={require('assets/img/svg/check-circle.svg')}
            width={150} height={150} className='my-5' />
          <div className='text-center'>
            <p>
            Thank you for registering!</p>
          </div>
          <Button className='bg-blue text-white border-0 w-90 my-4 py-2' onClick={onClose}>
            <strong>OK</strong>
          </Button>
        </ModalBody>
      </Modal>
    )
  }
}
