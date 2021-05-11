import React from 'react';
import { Modal } from 'reactstrap';
import Button from 'reactstrap-button-loader';

export default class WaitingConfirmationModal extends React.Component {
  render() {
    const { isOpen, toggle } = this.props;
    return (
      <Modal isOpen={isOpen} toggle={toggle} centered>
        <div className='d-flex flex-column align-items-center justify-content-center'>
          <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={350} className="mt-5" />
          <img
            alt='...'
            src={require('assets/img/svg/check-circle.svg')}
            width={150}
            height={150}
            className='mt-5' />
          <h4 className='mt-5 text-center mx-4'>You will receive a confirmation email soon</h4>
          <Button className='bg-blue text-white border-0 w-90 my-4 py-2' onClick={toggle}>
            <strong>OK</strong>
          </Button>
        </div>
      </Modal>
    )
  }
}
