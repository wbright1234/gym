import React from 'react';
import { Row, Col, Card, ButtonGroup } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import _ from 'lodash';
import FullCalendarItem from 'components/FullCalendarItem';
import DetailedCalendar from './DetailedCalendar';
import CalendarPagination from 'components/CalendarPagination'
import moment from 'moment';
import { connect } from 'react-redux';
import APIs from 'APIs';
import { getDayName } from 'utils';
import AddBookingModal from 'modals/AddBookingModal';
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
import saveAs from 'save-as';

class FullCalendar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedMonth: new Date(),
      numDays: 0,
      screenWidth: 0,
      showBookingModal: false,
      showDetailedCalendar: false,
      detailedCalendarDate: 1,
      selectedPagination: 0,
      rowCount: 1,
      bookings: [],
      showSignCOVIDModal: false,
      activeBooking: undefined,
      apartments: []
    };
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  componentDidMount() {
    this.getApartments();
    this.onPaginate(new Date().getMonth() + 1);
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
  }

  updateWindowDimensions() {
    this.setState({ screenWidth: window.innerWidth });
  }

  getApartments = () => {
    const params = {
      buildingId: this.props.user.buildingId
    }
    APIs.getApartments(params).then(resp => { 
      const { data } = resp.data;
      this.setState({ apartments: data });
    });
  }

  onClickItem = (date) => {
    this.setState({ showDetailedCalendar: true, detailedCalendarDate: date });

  }

  onPaginate = (id) => {
    //console.log('onPaginate id: ', id);
    const curDate = new Date();
    curDate.setMonth(id - 1);
    this.setState({
      selectedPagination: id,
      selectedMonth: curDate,
      numDays: this.getDaysInMonth(curDate.getFullYear(), curDate.getMonth() + 1)
    }, () => {
      this.getBookingsAtMonth();
    });
  }

  getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  }

  getBookingsAtMonth = () => {
    if (!this.props.user.id) {
      return;
    }
    const { selectedMonth } = this.state;
    const params = {
      filterMonth: selectedMonth,
      buildingId: this.props.user.buildingId
    }
    APIs.getBookingsAtMonth(params).then(resp => {
      const { data } = resp.data;
      this.setState({ bookings: data ? data : [] });
    });
  }

  getBookingsInDay = (day) => {
    const { bookings, selectedMonth } = this.state;
    if (!bookings || bookings.length === 0) {
      return [];
    }
    return _.filter(bookings, booking => {
      const bookedDateTime = this.toLocalTime(booking.bookedDateTime);
      //const bookedDateTime = new Date(booking.bookedDateTime);
      if (bookedDateTime.getFullYear() === selectedMonth.getFullYear() &&
          bookedDateTime.getMonth() === selectedMonth.getMonth() &&
          bookedDateTime.getDate() === day) {
        return true;
      } else {
        return false;
      }
    })
  }

  getFirstDayOfMonth = () => {
    const { selectedMonth } = this.state;
    selectedMonth.setDate(1);
    return selectedMonth.getDay();
  }

  onAddedBooking = (booking) => {
    let { bookings } = this.state;
    const index = _.findIndex(bookings, b => b.id === booking.id);
    if (index !== -1) {
      bookings[index] = booking;
    } else {
      bookings = [...bookings, booking];
    }

    this.setState({ bookings, showBookingModal: false });
  }

  getDayOfDate = (date) => {
    let { selectedMonth } = this.state;
    selectedMonth.setDate(date);
    return getDayName(selectedMonth.getDay());
  }

  onSavedCert = (booking) => {
    const { bookingId, certUrl } = booking;
    let { bookings } = this.state;
    const index = _.findIndex(bookings, booking => booking.id === bookingId);
    if (index !== -1) {
      bookings[index].certUrl = certUrl;
      this.setState({ bookings });
    }
  }

  onDeleteBooking = (bookingId) => {
    let { bookings } = this.state;
    _.remove(bookings, booking => booking.id == bookingId);
    this.setState({ bookings });
    if (this.props.onDeleteBooking) {
      this.props.onDeleteBooking(bookingId);
    }
  }

  renderApts = () => {
    const { apartments } = this.state;
    return (
      <Row>
      {
        _.map(apartments, apt => (
          <Col key={apt.aptNumber} xs='3' lg='2' className='d-flex align-items-center justify-content-center border-right mt-2 py-2'>
            <h6 className='mb-0'>{apt.aptNumber}</h6>
            <div className='ml-2' style={{ width: 40, height: 25, backgroundColor: apt.aptColorHex }} />
          </Col>
        ))
      }
      </Row>
    )
  }

  downloadAllCerts = () => {
    //const { selectedMonth } = this.props;
    const { bookings, selectedMonth } = this.state;
    const certUrls = _.without(_.map(bookings, booking => {
      if (booking.certUrl) {
        return ({ url: booking.certUrl, name: booking.name, bookedDateTime: booking.bookedDateTime });
      } else {
        return null;
      }
    }), null);
    let zip = new JSZip();
    let zipFilename = 'covid_certs_' + selectedMonth.getFullYear() + '_' + (selectedMonth.getMonth() + 1) + '_' + selectedMonth.getDate() + '.zip';
    let count = 0;
    certUrls.forEach((cert) => {
      var filename = cert.name + '_covid_cert_' + moment(cert.bookedDateTime).format('YYYY-MM-DD-hh-mm') + '.png';
      // loading a file and add it in a zip file
      JSZipUtils.getBinaryContent(cert.url, (err, data) => {
        if (err) {
          throw err; // or handle the error
        }
        zip.file(filename, data, { binary:true });
        count++;
        if (count === certUrls.length) {
          zip.generateAsync({ type:'blob' }).then((content) => {
            saveAs(content, zipFilename);
          });
        }
      });
    });
  }

  toLocalTime = (time) => {
    var d = new Date(time);
    var offset = (new Date().getTimezoneOffset() / 60) * -1;
    var n = new Date(d.getTime() + offset);
    return n;
  };

  render() {
    const {
      screenWidth,
      showBookingModal,
      showDetailedCalendar,
      selectedPagination,
      selectedMonth,
      numDays,
      bookings,
      detailedCalendarDate
    } = this.state;
    const { user } = this.props;

    return (
      <div className='d-flex flex-column my-4 mx-2 mx-lg-5'>
        <div>
          <div className='d-flex justify-content-end'>
              <Button className='bg-blue border-0 shadow-sm' onClick={() => this.setState({ showBookingModal: true })}>
                  BOOK NOW
              </Button>
          </div>
          {/*
              user.role === 'admin' &&
              <div className='d-flex justify-content-end'>
                <Button size='sm'
                  className='bg-accept border-0 shadow-sm mt-2'
                  onClick={this.downloadAllCerts}>
                  <small>Download Available COVID-19 Certificates</small>
                </Button>
              </div>
          */}
          <ButtonGroup className='mt-3' style={{ float: 'right' }}>
              <Button 
                className={"bg-white border-grey w-50"}
                onClick={()=> { this.setState({showDetailedCalendar: false}); }}>
                {
                  showDetailedCalendar ? <img alt='...' src={require('assets/img/svg/calendar-grey.svg')} width={20} height={20} />
                    : <img alt='...' src={require('assets/img/svg/calendar-blue.svg')} width={20} height={20} />
                }
              </Button>
              <Button 
                className={"bg-white border-grey w-50"}
                onClick={()=> { this.setState({showDetailedCalendar: true}); }}>
                  {
                  showDetailedCalendar ? <img alt='...' src={require('assets/img/svg/menu-blue.svg')} width={20} height={20} />
                    : <img alt='...' src={require('assets/img/svg/menu.svg')} width={20} height={20} />
                  }
                </Button>
            </ButtonGroup>
        </div>
        {
          !showDetailedCalendar &&
          <>
            <div className='bg-white border border-0 rounded shadow-sm py-4 px-3 mt-3'>
              <div className='d-flex justify-content-center'>
                <h4 className='blue-tint text-center'><strong>{moment(selectedMonth).format('MMMM YYYY')}</strong></h4>
              </div>
              <Row className='mx-2 mx-sm-4'>
                {
                  _.times(numDays, (id) => (
                    <FullCalendarItem
                      key={`${id + 1}`}
                      date={id + 1}
                      day={this.getDayOfDate(id + 1)}
                      bookingsInDay={this.getBookingsInDay(id + 1)}
                      onClickItem={() => this.onClickItem(id + 1)}
                      className={'py-2 px-2 border-right border-bottom ' +
                        (((screenWidth >= 1200 && (id + 1) % 6 === 0) ||
                          (screenWidth >= 992 && screenWidth < 1200 && (id + 1) % 4 === 0) ||
                          (screenWidth >= 768 && screenWidth < 992 && (id + 1) % 3 === 0) ||
                          (screenWidth < 768 && (id + 1) % 2 === 0)
                        )  ? 'border-right-0' : 'border-right-1')} />
                  ))
                }
              </Row>
            </div>
            <CalendarPagination
              activeIndex={selectedPagination}
              onPaginate={this.onPaginate}
              className='d-flex justify-content-end mt-1' />
          </>
        }
        {
          showDetailedCalendar &&
          <DetailedCalendar
            numDays={numDays}
            selectedMonth={selectedMonth}
            firstDay={this.getFirstDayOfMonth()}
            date={detailedCalendarDate}
            bookings={bookings}
            onAddedBooking={this.onAddedBooking}
            onDeleteBooking={this.onDeleteBooking}
            onSavedCert={this.onSavedCert} />
        }
        <Card className='shadow-sm px-4 py-4 mt-5'>
          <h6 className='text-darkgray'><strong>Apartment Colors</strong></h6>
          <hr className='bg-gray'/>
          {this.renderApts()}
        </Card>
        {
          showBookingModal &&
          <AddBookingModal
            isOpen={showBookingModal}
            activeBooking={undefined}
            toggle={() => this.setState({ showBookingModal: false })}
            onBookDone={this.onAddedBooking} />
        }
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(FullCalendar);
