import React from 'react';
import { ModalHeader, Modal, ModalBody, ModalFooter, Form, Label, Input, FormFeedback } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import APIs from 'APIs';
import { ChromePicker } from 'react-color';

export default class EditApartmentModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      names: '',
      namesErr: '',
      aptColorHex: '',
      showColorPicker: false
    }
  }

  onOpened = () => {
    const { activeApt } = this.props;
    if (activeApt) {
      this.setState({ names: activeApt.aptNames, aptColorHex: activeApt.aptColorHex });
    }
  }

  save = () => {
    const { names, aptColorHex } = this.state;
    if (!names) {
      this.setState({ namesErr: 'Names cannot be empty' });
      return;
    }
    const params = {
      aptId: this.props.activeApt.id,
      aptNumber: this.props.activeApt.aptNumber,
      names,
      aptColorHex
    }
    this.setState({ saving: true });
    APIs.editApartment(params).then(resp => {
      this.setState({ saving: false });
      if (this.props.onEditDone) {
        this.props.onEditDone(resp.data.data)
      }
    }).catch(err => {
      this.setState({ saving: false });
    });
  }

  render() {
    const { isOpen, toggle } = this.props;
    const { names, namesErr, saving, showColorPicker, aptColorHex } = this.state;
    return (
      <Modal isOpen={isOpen} toggle={toggle} onOpened={this.onOpened} centered>
        <ModalHeader>
          Assign names to apartment
        </ModalHeader>
        <ModalBody>
          <div>
            <Label>Apartment Color</Label>
            <div style={{ width: 40, height: 25, backgroundColor: aptColorHex, cursor: 'pointer' }}
              onClick={() => this.setState({ showColorPicker: true })}/>
            {
              showColorPicker &&
              <div style={{ positive: 'absolute', zIndex: 2 }}>
                <ChromePicker color={aptColorHex} onChange={color => this.setState({ aptColorHex: color.hex })} />
              </div>
            }
          </div>
          <Form className='mt-2'>
            <Label>
              Separate the names with comma(,)
            </Label>
            <Input
              type='text'
              value={names}
              onChange={e => this.setState({ names: e.target.value })}
              invalid={namesErr ? true : false}
              />
          </Form>
          <FormFeedback>{namesErr}</FormFeedback>
        </ModalBody>
        <ModalFooter>
          <div className='d-flex justify-content-end'>
            <Button
              className='bg-white text-darkgray p-2'
              onClick={toggle}>
              <small style={{fontWeight: 'bold'}}>CANCEL</small>
            </Button>
            <Button className='bg-blue text-white border-0 p-2 ml-3'
              loading={saving}
              disabled={saving}
              onClick={this.save}>
              <small style={{fontWeight: 'bold'}}>SAVE</small>
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    )
  }
}
