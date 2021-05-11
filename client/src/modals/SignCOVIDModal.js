import React from 'react';
import {
  Alert,
  Modal,
  ModalBody,
  ModalFooter,
  Label,
  Input,
  FormGroup,
  Form,
  FormFeedback,
  Row,
  Col
} from 'reactstrap';
import Button from 'reactstrap-button-loader';
import Datepicker from 'components/Datepicker';
import html2canvas from 'html2canvas';
import { dataURLToFile } from 'utils';
import { connect } from 'react-redux';
import APIs from 'APIs';
import { Helmet } from 'react-helmet';

class SignCOVIDModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      startedSign: false,
      name: '',
      nameErr: '',
      aptNumber: '',
      aptNumberErr: '',
      todayDate: new Date(),
      saving: false
    }
  }

  onOpened = () => {
    const { activeBooking } = this.props;
    if (activeBooking) {
      this.setState({ name: activeBooking.aptName, aptNumber: activeBooking.aptNumber });
    }
  }

  onClosed = () => {
    this.setState({ startedSign: false });
    if (this.tmr) {
      clearInterval(this.tmr);
    }
    if (this.resetIsSupported) {
      window.Reset();
    } else {
      window.ClearTablet();
      window.SetTabletState(0, this.tmr);
    }
  }

  startSignOrClear = () => {
    if (!window.IsSigWebInstalled()) {
      this.setState({ alert: { type: 'danger', message: 'Unable to communicate with SigWeb. Please confirm that SigWeb is installed and running on this PC.' } });
      return;
    }
    this.resetIsSupported = this.getResetSupported();
    if (!this.resetIsSupported) {
      this.setState({
        alert: {
          type: 'danger',
          message: (<span>There is a newer version of SigWeb available <a href='https://www.topazsystems.com/software/sigweb.exe'>here</a></span>)
        }
      });
      return;
    }

    const { startedSign } = this.state;
    if (startedSign) {
      window.ClearTablet();
      return;
    }
    this.setState({ startedSign: true });
    var ctx = document.getElementById('signCnv').getContext('2d');
    window.SetDisplayXSize( 500 );
    window.SetDisplayYSize( 100 );
    window.SetTabletState(0, this.tmr);
    window.SetJustifyMode(0);
    window.ClearTablet();
    if(this.tmr == null)
    {
      this.tmr = window.SetTabletState(1, ctx, 50);
    }
    else
    {
      window.SetTabletState(0, this.tmr);
      this.tmr = null;
      this.tmr = window.SetTabletState(1, ctx, 50);
    }
  }

  getResetSupported = () => {
    var minSigWebVersionResetSupport = "1.6.4.0";

    if(this.isOlderSigWebVersionInstalled(minSigWebVersionResetSupport)){
      console.log("Old SigWeb version installed.");
      return false;
    }
    return true;
  }

  isOlderSigWebVersionInstalled = (cmprVer) => {
    var sigWebVer = window.GetSigWebVersion();
    if(sigWebVer !== ""){
      return this.isOlderVersion(cmprVer, sigWebVer);
    } else{
      return false;
    }
  }

  isOlderVersion = (oldVer, newVer) => {
    const oldParts = oldVer.split('.')
    const newParts = newVer.split('.')
    for (var i = 0; i < newParts.length; i++) {
      const a = parseInt(newParts[i]) || 0
      const b = parseInt(oldParts[i]) || 0
      if (a < b) return true
      if (a > b) return false
    }
    return false;
  }

  saveCertificate = () => {
    if (!this.props.activeBooking) return;
    if (window.NumberOfTabletPoints() === 0) {
      this.setState({ alert: { type: 'danger', message: 'Please sign before continuing' } });
      return;
    }
    const { name, aptNumber } = this.state;
    if (!name) {
      this.setState({ nameErr: 'Invalid name' });
      return;
    }
    if (!aptNumber) {
      this.setState({ aptNumberErr: 'Invalid apt number' });
      return;
    }
    this.setState({ saving: true });
    const modalBody = document.getElementById('modalBody');
    const modalArea = modalBody.getBoundingClientRect()
    html2canvas(modalBody, {
      scrollX: 0,
      scrollY: 0,
      width: modalArea.width,
      height: modalArea.height
    }).then(canvas => {
      const filename = 'covid_cert_' + Date.now() + '.png';
      const certFile = dataURLToFile(canvas.toDataURL(), filename);
      const params = {
        bookingId: this.props.activeBooking.id,
        file: certFile,
        filename
      }
      APIs.uploadCertificate(params, this.uploadListener).then(resp => {
        const { data } = resp.data;
        this.setState({ saving: false });
        if (this.props.onSavedCert) {
          this.props.onSavedCert(data);
        }
      }).catch(err => {
        let message = err.message;
        if (err.response) {
          message = err.response.data.message;
        }
        this.setState({ saving: false, alert: { type: 'danger', message } });
      });
    });
  }

  uploadListener = (event) => {
    var percentCompleted = Math.round((event.loaded * 100) / event.total);
    this.setState({ percentCompleted });
  }

  onTodayDateChanged = (dateTime) => {
    this.setState({ todayDate: dateTime.toDate() });
  }

  render() {
    const { isOpen, toggle } = this.props;
    const { alert, name, nameErr, todayDate, aptNumber, aptNumberErr, saving, startedSign } = this.state;
    return (
      <Modal id='mainModal' size='lg' onOpened={this.onOpened} onClosed={this.onClosed} isOpen={isOpen} toggle={toggle} centered>
        <Helmet>
          <script type="text/javascript" src="SigWebTablet.js" />
        </Helmet>
        <ModalBody id='modalBody'>
          <div className='d-flex flex-column align-items-center'>
            <h2 className='text-darkgray'><strong>COVID-19 CERTIFICATION-FITNESS CENTER</strong></h2>
            <h6 className='text-darkgray'>
              In light of the Coronavirus pandemic, I understand that the NYC
              Department of Health, the CDC, the NYS Department of Health and
              other governmental agencies have recommended that certain people
              remain at home and self-quarantine. I recognize that my ability to enter
              into the Fitness Center
              is conditioned upon my making the representations set forth in the
              Certification below and that I may be denied access if management
              believes, in its reasonable judgement, that I am exhibiting symptoms
              of COVID-19.<br /><br />By signing this, I Certify that I have not: <br /><br />a) knowingly
              been in close contact in the past 14 days with anyone who has tested
              positive for COVID-19 or who has or had symptoms of COVID-19; <br /><br />
              b) tested positive for COVID-19 through a diagnostic test
              in the past 14 days; <br /><br />c) experienced any symptoms of COVID-19 in
              the past 14 days; and <br /><br />d) traveled within a state with significant
              community spread of COVID-19 for longer than 24 hours within the past 14 days.</h6>
          </div>
          <Row className='mx-0'>
            <Col className='d-flex align-items-center' xs='auto'>
              Sign:
            </Col>
            <Col className='d-flex justify-content-center'>
              <canvas id='signCnv' name='signCnv' style={{ height: 100, width: 500 }} />
            </Col>
            <Col xs='auto' className='d-flex align-items-center'>
              <Button className={'p-1 border-0 ' + (startedSign ? 'bg-danger' : 'bg-blue')} onClick={this.startSignOrClear}>
                <small>{startedSign ? 'Clear' : 'Start Sign'}</small>
              </Button>
            </Col>
          </Row>
          <Form className='d-flex align-items-end mt-3 mx-3'>
            <Label className='mb-0'>
              Name:
            </Label>
            <Input type='text'
              placeholder='Enter your name'
              className='border-top-0 border-left-0 border-right-0 rounded-0 ml-4'
              value={name}
              onChange={event => this.setState({ name: event.target.value, nameErr: '' })}
              invalid={nameErr ? true : false} />
          </Form>
          <FormFeedback>{nameErr}</FormFeedback>
          <FormGroup row className='mx-3 mt-3'>
            <Col xs='12' sm='7' className='px-0'>
              <Form className='d-flex align-items-end'>
                <Label className='mb-0'>
                  Today's Date:
                </Label>
                <Datepicker
                  value={todayDate}
                  onDateChanged={this.onTodayDateChanged}
                  className='mb-0 ml-2'
                  />
              </Form>
            </Col>
            <Col xs='12' sm='5' className='px-0'>
              <Form className='d-flex align-items-end'>
                <Label className='mb-0'>
                  Apartment #:
                </Label>
                <Col>
                <Input type='text'
                  className='border-top-0 border-left-0 border-right-0 rounded-0 ml-2'
                  value={aptNumber}
                  onChange={event => this.setState({ aptNumber: event.target.value })}
                  invalid={aptNumberErr ? true : false} />
                  </Col>
              </Form>
              <FormFeedback>{aptNumberErr}</FormFeedback>
            </Col>
          </FormGroup>
          {alert.message && <Alert className='mt-4' color={alert.type}>{alert.message}</Alert>}
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
              onClick={this.saveCertificate}>
              <small style={{fontWeight: 'bold'}}>SAVE CERTIFICATE</small>
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
})

export default connect(mapStateToProps)(SignCOVIDModal);
