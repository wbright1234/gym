import React from 'react';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Button from 'reactstrap-button-loader';

export const AlertModal = ({
  title, body, errorMsg, inProgress, toggle, isOpen, posBtnTitle, negBtnTitle, centered,
  onClickPositive, onClickNegative}) => (
  <Modal isOpen={isOpen} centered={centered} toggle={toggle}>
    <ModalHeader className='f-family-poppins'>{title}</ModalHeader>
    <ModalBody className='f-family-poppins' style={{ lineHeight: 1.5 }}>
      {body}
      {errorMsg && <Alert color='danger' className='mt-4'>{errorMsg}</Alert>}
    </ModalBody>
    <ModalFooter>
      <Button color='danger' onClick={onClickPositive} loading={inProgress} className='f-family-poppins px-3'>{posBtnTitle ? posBtnTitle : 'Yes'}</Button>
      {onClickNegative && <Button color='secondary' onClick={onClickNegative}  className='f-family-poppins px-3'>{negBtnTitle ? negBtnTitle : 'No'}</Button>}
    </ModalFooter>
  </Modal>
);
