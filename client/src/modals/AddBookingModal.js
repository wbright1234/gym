import React from 'react';
import {
  Alert,
  Modal,
  ModalBody,
  Row,
  Col,
  Input,
  FormGroup,
  FormFeedback,
  //FormText
} from 'reactstrap';
import Button from 'reactstrap-button-loader';
import _ from 'lodash';
import Datepicker from 'components/Datepicker';
import SignCOVIDModal from 'modals/SignCOVIDModal';
import { connect } from 'react-redux';
import APIs from 'APIs';
import moment from 'moment';
import { AlertModal } from './AlertModal';
import { dateDiffInDays } from 'utils';

class AddBookingModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      fullTimeSlots: [
        {
          startTime: 8,
          startMins: 0,
          value: '8:00 ~ 9:00'
        }
      ],
      timeSlots: [
        {
          startTime: 8,
          startMins: 0,
          value: '8:00 ~ 9:00'
        }
      ],
      bookingDate: undefined,
      bookingTime: '8:00 ~ 9:00',
      aptNumbers: [],
      aptNumber: '',
      aptNumberErr: '',
      aptName: '',
      aptNames: [],
      aptColorHex: '',
      bookingNote: '',
      bookingNoteErr: '',
      showSignCOVIDModal: false,
      showConfirmResignModal: false,
      showConfirmDeleteModal: false,
      savingBook: false,
      deletingBook: false,
      fetchingBookedSlots: false,
      signedCOVID: false
    }
  }

  componentDidMount() {    
    this.getApartments();
    this.getTimeSlots();
  }

  initTimeSlots() {
    const { bookingDateTime, user, activeBooking } = this.props;
    if (bookingDateTime) {
      const startTime = bookingDateTime.getHours();
      const startMins = bookingDateTime.getMinutes();
      const bookingTime = _.find(this.state.timeSlots, time => time.startTime === startTime && time.startMins === startMins);
      if (bookingTime) {
        this.setState({ bookingDate: moment(bookingDateTime), bookingTime: bookingTime.value });
      }
    }
    if (activeBooking) {
      const bookedDateTime = new Date(activeBooking.bookedDateTime);
      this.getBookedTimeSlots(bookedDateTime);
      const startTime = bookedDateTime.getHours();
      const startMins = bookedDateTime.getMinutes();
      this.setState({
        bookingDate: moment(bookedDateTime),
        aptNumber: activeBooking.aptNumber,
        aptName: activeBooking.aptName,
        aptColorHex: activeBooking.aptColorHex,
        bookingNote: activeBooking.note,
        signedCOVID: activeBooking.certUrl ? true : false
      });
      const bookingTime = _.find(this.state.timeSlots, time => time.startTime === startTime && time.startMins === startMins);
      if ( bookingTime ) {
        this.setState({
          bookingTime: bookingTime.value,
        });
      }
    } else {
      if (bookingDateTime) {
        this.getBookedTimeSlots(bookingDateTime);
      }
      if (user.role === 'shareholder') {
        this.setState({
          aptNumbers: [{ aptNumber: user.aptNumber, aptColorHex: user.aptColorHex }],
          aptNames: [_.last(_.split(user.name, ' '))],
          aptName: _.last(_.split(user.name, ' ')),
          aptNumber: user.aptNumber,
          aptColorHex: user.aptColorHex
        });
        return;
      }
    }
  }

  getTimeSlots = () => {
    const params = { buildingId: this.props.user.buildingId };
    APIs.getTimeSlots(params).then(resp => {
      const {data} = resp.data;
      if ( data.length !== 0 ) {
        var times = [];
        _.forEach(data, slot => {
            var startTimeArr = slot.start.split(':');
            var endTimeArr = slot.end.split(':');
            times.push({ startTime: parseInt(startTimeArr[0], 10), startMins: parseInt(startTimeArr[1], 10), value: startTimeArr[0]+':'+startTimeArr[1]+' ~ '+endTimeArr[0]+':'+endTimeArr[1]});
        });
        this.setState({ timeSlots: times, fullTimeSlots: times });
      }      
      this.initTimeSlots();
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });
  }

  onOpened = () => {
    const { activeBooking } = this.props;
    if (activeBooking && activeBooking.certUrl) {
      this.setState({ showConfirmResignModal: true, signedCOVID: true });
    }
  }

  openSignCOVIDDialog = () => {
    if (this.props.user.role !== 'doorman') {
      return;
    }
    const { signedCOVID } = this.state;
    if (signedCOVID) {
      this.setState({ showConfirmResignModal: true });
    } else {
      this.setState({ showSignCOVIDModal: true });
    }
  }

  deleteBooking = () => {
    const { activeBooking } = this.props;
    if (activeBooking) {
      this.setState({ deletingBook: true });
      const params = {
        bookingId: activeBooking.id
      }
      APIs.cancelBooking(params).then(resp => {
        const { bookingId } = resp.data.data;
        this.setState({ showConfirmDeleteModal: false, deletingBook: false });
        if (this.props.onDeleteBooking) {
          this.props.onDeleteBooking(bookingId);
        }
      }).catch(err => {
        this.setState({ deletingBook: false });
      })
    }
  }

  saveBooking = () => {
    if (!this.props.user.id) {
      return;
    }
    const { activeBooking } = this.props;
    let { bookingDate, bookingTime, aptNumber, aptColorHex, aptName, bookingNote } = this.state;
    if (!bookingDate) {
      return;
    }
    if (!aptNumber) {
      this.setState({ aptNumberErr: 'Apartment number cannot be empty' });
      return;
    }
    bookingDate = bookingDate.toDate();
    const timeObj = _.find(this.state.fullTimeSlots, time => time.value === bookingTime);
    bookingDate.setHours(timeObj.startTime);
    bookingDate.setMinutes(timeObj.startMins);
    const params = {
      bookingId: activeBooking ? activeBooking.id : null, userId: this.props.user.id, userName: this.props.user.name,
      userPhoneNumber: this.props.user.phoneNumber, userRole: this.props.user.role, bookedDateTime: bookingDate, aptNumber,
      aptColorHex, aptName, bookingNote, buildingId: this.props.user.buildingId
    };
    this.setState({ savingBook: true, alert: { type: '', message: '' } });
    APIs.saveBooking(params).then(resp => {
      this.setState({ savingBook: false });
      const { data } = resp.data;
      if (this.props.onBookDone) {
        this.props.onBookDone(data);
      }
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ savingBook: false, alert: { type: 'danger', message } });
    });
  }

  onDateChanged = (dateTime) => {
    this.setState({ bookingDate: dateTime });
    this.getBookedTimeSlots(dateTime.toDate());
  }

  getBookedTimeSlots = (dateTime) => {
    const filterDate = dateTime;
    filterDate.setHours(5);
    filterDate.setMinutes(0);
    filterDate.setSeconds(0);
    const params = {
      filterDate
    }
    this.setState({ fetchingBookedSlots: true });
    APIs.getBookedTimeSlots(params).then(resp => {
      const bookedTimeSlots = resp.data.data;
      const timeSlots = _.filter(this.state.fullTimeSlots, slot => _.findIndex(bookedTimeSlots, bSlot => {
        const bookedDateTime = new Date(bSlot.bookedDateTime);
        if (bookedDateTime.getHours() === slot.startTime && bookedDateTime.getMinutes() === slot.startMins) {
          return true;
        }
        return false;
      }) === -1)
      const index = _.findIndex(timeSlots, time => time.value === this.state.bookingTime);
      let bookingTime;
      if (index !== -1) {
        bookingTime = timeSlots[index].value;
      } else {
        if (!this.props.activeBooking) {
          bookingTime = timeSlots.length > 0 ? timeSlots[0].value : 'Not available booking time';
        } else {
          const { activeBooking } = this.props;
          const bookedDateTime = new Date(activeBooking.bookedDateTime);
          const startTime = bookedDateTime.getHours();
          const startMins = bookedDateTime.getMinutes();
          bookingTime = _.find(this.state.timeSlots, time => time.startTime === startTime && time.startMins === startMins).value;
        }
      }
      this.setState({
        timeSlots,
        bookingTime,
        fetchingBookedSlots: false
      });
    }).catch(err => {
      this.setState({ fetchingBookedSlots: false });
    });
  }

  getApartments = () => {
    const params = {
      buildingId: this.props.user.buildingId
    }
    APIs.getApartments(params).then(resp => {
      const { data } = resp.data;
      if (data && data.length > 0) {
        const { aptNumber, aptName, aptColorHex } = this.state;
        let index = 0;
        if (aptNumber) {
          index = _.findIndex(data, d=> d.aptNumber === aptNumber);
        }
        this.setState({
          aptNumbers: data,
          aptNumber: aptNumber ? aptNumber : data[0].aptNumber,
          aptColorHex: aptColorHex ? aptColorHex : data[0].aptColorHex,
          aptNames: _.split(data[index].aptNames, ','),
          aptName: aptName ? aptName : _.split(data[index].aptNames, ',')[0]
        });
      }
    }).catch(err => {
      console.log('APT numbers err: ', err);
    });
  }

  onSavedCert = (booking) => {
    this.setState({ signedCOVID: true, showSignCOVIDModal: false });
    if (this.props.onSavedCert) {
      this.props.onSavedCert(booking);
    }
  }

  onChangeAPTNumber = (e) => {
    const { aptNumbers } = this.state;
    const index = _.findIndex(aptNumbers, apt => apt.aptNumber === e.target.value)
    if (index !== -1) {
      this.setState({
        aptNumber: e.target.value,
        aptColorHex: aptNumbers[index].aptColorHex,
        aptNames: _.split(aptNumbers[index].aptNames, ','),
        aptName: _.split(aptNumbers[index].aptNames, ',')[0]
      });
    }
  }

  renderTimeSlots = () => {
    const { timeSlots } = this.state;
    const { activeBooking } = this.props;
    if (activeBooking) {
      var slotOptions = [];
      const bookedDateTime = new Date(activeBooking.bookedDateTime);
      const startTime = bookedDateTime.getHours();
      const startMins = bookedDateTime.getMinutes();
      const bookingTime = _.find(this.state.fullTimeSlots, time => time.startTime === startTime && time.startMins === startMins);
      if ( bookingTime ){
        slotOptions.push(<option key={bookingTime.value} value={bookingTime.value}>{bookingTime.value}</option>)
      }
      slotOptions.push(
        <optgroup key='timeslots' label='Available time slots'>
        {
          _.map(timeSlots, slot => (
            <option key={slot.value} value={slot.value}>{slot.value}</option>
          ))
        }
        </optgroup>
      )
      return slotOptions;
    } else {
      return _.map(timeSlots, slot => (
        <option key={slot.value} value={slot.value}>{slot.value}</option>
      ))
    }
  }

  render() {
    const { isOpen, toggle, user, activeBooking } = this.props;
    const {
      alert, bookingDate, bookingTime, aptNumbers, aptNumber, aptNumberErr, aptName, aptNames, bookingNote, showSignCOVIDModal,
      showConfirmResignModal, showConfirmDeleteModal, savingBook, deletingBook, fetchingBookedSlots, signedCOVID
    } = this.state;
    return (
      <Modal isOpen={isOpen} toggle={toggle} onOpened={this.onOpened} size='lg' centered>
        <ModalBody>
          <div className='d-flex  flex-grow-1 justify-content-between'>
            <h4 className='mb-0 text-darkgray'><strong>Add New Booking</strong></h4>
            <Button className='border-0 bg-transparent p-0' onClick={toggle}>
              <img alt='...' src={require('assets/img/svg/cancel.svg')} width={30} height={30} />
            </Button>
          </div>
          <Row className='mt-5'>
            <Col xs='12' sm='6'>
              <h6><strong>DATE</strong></h6>
              <div>
                <Datepicker
                  value={bookingDate}
                  onDateChanged={this.onDateChanged} className='mb-0' />
                  {/*<p className='mt-1' style={{fontSize: 11}}>Note: Bookings should be done 7days or more before actual date</p>*/}
              </div>
            </Col>
            <Col xs='12' sm='6'>
              <h6><strong>TIME</strong></h6>
              <div>
                <FormGroup>
                  <Input type='select'
                    disabled={fetchingBookedSlots}
                    value={bookingTime}
                    onChange={e => this.setState({ bookingTime: e.target.value })}>
                    {this.renderTimeSlots()}
                  </Input>
                  {/*<FormText style={{fontSize: 11}}>Note: Only 60 mins allowed</FormText>*/}
                </FormGroup>
              </div>
            </Col>
          </Row>
          <Row className='mt-4'>
            <Col xs='12' sm='6'>
              <h6><strong>Apartment #</strong></h6>
              <div>
                <Input type='select'
                  value={aptNumber}
                  disabled={user.role === 'shareholder'}
                  onChange={this.onChangeAPTNumber}
                  invalid={aptNumberErr ? true : false}
                >
                {_.map(aptNumbers, a => (
                  <option value={a.aptNumber} key={a.aptNumber}>{a.aptNumber}</option>
                ))}
                </Input>
                <FormFeedback>{aptNumberErr}</FormFeedback>
              </div>
            </Col>
            <Col xs='12' sm='6'>
              <h6><strong>Apartment Name</strong></h6>
              <div>
                <Input type='select'
                  value={aptName}
                  disabled={user.role === 'shareholder'}
                  onChange={e => this.setState({ aptName: e.target.value })}
                >
                {_.map(aptNames, a => (
                  <option value={a} key={a}>{a}</option>
                ))}
                </Input>
                <FormFeedback>{aptNumberErr}</FormFeedback>
              </div>
            </Col>
          </Row>
          <Row className='mt-4 mt-sm-5'>
            <Col lg='10'>
              <h6><strong>BOOKING NOTES</strong></h6>
              <Input type='textarea'
                placeholder='Add a Note...'
                value={bookingNote}
                onChange={(e) => this.setState({ bookingNote: e.target.value })}/>
            </Col>
          </Row>
          {
            activeBooking && user.role === 'doorman' && dateDiffInDays(new Date(activeBooking.bookedDateTime), new Date()) === 0 && !signedCOVID &&
            <Button className='bg-blue text-white border-0 mt-2' onClick={this.openSignCOVIDDialog}>
              Sign Covid-19 Certificate
            </Button>
          }
          {
            alert.message &&
            <Alert color={alert.type} className='mt-4'>{alert.message}</Alert>
          }
          <div className='d-flex justify-content-end mt-5'>
            <Button
              className='bg-white text-darkgray p-2'
              onClick={toggle}>
              <small style={{fontWeight: 'bold'}}>CLOSE</small>
            </Button>
            { activeBooking && (user.role === 'doorman' || user.role === 'admin') &&
              <Button className='bg-reject text-white border-0 p-2 ml-3'
                loading={deletingBook}
                disabled={deletingBook}
                onClick={() => this.setState({ showConfirmDeleteModal: true })}>
                <small style={{fontWeight: 'bold'}}>DELETE BOOKING</small>
              </Button>
            }
            {
              (!activeBooking || (user.role === 'shareholder' && activeBooking.aptNumber === user.aptNumber) ||
                user.role === 'admin' || user.role === 'doorman') &&
              <Button className='bg-blue text-white border-0 p-2 ml-3' 
                loading={savingBook}
                disabled={savingBook}
                onClick={this.saveBooking}>
                <small style={{fontWeight: 'bold'}}>{activeBooking ? 'EDIT BOOKING' : 'SAVE BOOKING'}</small>
              </Button>
            }
          </div>
        </ModalBody>
        {
          showSignCOVIDModal &&
          <SignCOVIDModal
            isOpen={showSignCOVIDModal}
            toggle={() => this.setState({ showSignCOVIDModal: false })}
            activeBooking={activeBooking}
            onSavedCert={this.onSavedCert} />
        }
        {
          showConfirmResignModal &&
          <AlertModal
            isOpen={showConfirmResignModal}
            centered
            title='Confirm'
            body='Resident already signed, Sign another certificate?'
            onClickPositive={() => this.setState({ showConfirmResignModal: false, showSignCOVIDModal: true })}
            onClickNegative={() => this.setState({ showConfirmResignModal: false })}
            />
        }
        {
          showConfirmDeleteModal &&
          <AlertModal
            isOpen={showConfirmDeleteModal}
            title='Cancel Booking'
            body='Are you sure to cancel this booking?'
            centered
            inProgress={deletingBook}
            onClickPositive={this.deleteBooking}
            onClickNegative={() => this.setState({ showConfirmDeleteModal: false })}
            />
        }
      </Modal>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(AddBookingModal);
