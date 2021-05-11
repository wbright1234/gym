import React from 'react';
import _ from 'lodash';
import ScrollContainer from 'react-indiana-drag-scroll'
import AddBookingModal from 'modals/AddBookingModal';
import { getDayName } from 'utils';
import moment from 'moment';
import { connect } from 'react-redux';
import { isMobile, MobileView, BrowserView } from 'react-device-detect';
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
import saveAs from 'save-as';
import APIs from 'APIs';

class DetailedCalendar extends React.Component {
  constructor(props) {
    super(props);
    this.scrollRef = React.createRef();
    this.slotWidth = isMobile ? 80 : 120;
    this.slotHeight= isMobile ? 60 : 80;
    this.state = {
      bookingDateTime: undefined,
      showBookingModal: false,
      showSignCOVIDModal: false,
      activeBooking: undefined,
      bookings: [],
      timeSlots: [
        {
          startTime: 0,
          startMin: 0,
          startValue: 'CET'
        }
      ]
    }
  }

  componentDidMount() {
    if (this.props.bookings) {
      this.setState({ bookings: this.props.bookings });
    }

    if (this.scrollRef.current && this.props.date) {
      if (this.props.date > 4) {
        this.scrollRef.current.scrollTo((this.props.date - 1) * this.slotWidth, 0);
      }
    }
    this.getTimeSlots();
  }

  getTimeSlots = () => {
    const params = { buildingId: this.props.user.buildingId };
    APIs.getTimeSlots(params).then(resp => {
      const {data} = resp.data;

      if ( data.length !== 0 ) {
        var times = [{ startTime: 0, startMin: 0, startValue: 'CET' }];
        _.forEach(data, slot => {
            var startTimeArr = slot.start.split(':');
            var endTimeArr = slot.end.split(':');
            times.push({ startTime: parseInt(startTimeArr[0], 10), startMin: parseInt(startTimeArr[1], 10), startValue: startTimeArr[0]+':'+startTimeArr[1], endValue: endTimeArr[0]+':'+endTimeArr[1]});
        });
        this.setState({ timeSlots: times });
      }      
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });
  }

  onBookDone = (booking) => {
    let { bookings } = this.state;
    const index = _.findIndex(bookings, b => b.id === booking.id);
    if (index !== -1) {
      bookings[index] = booking;
    } else {
      bookings = [booking, ...bookings];
    }
    this.setState({ showBookingModal: false, bookings });
    if (this.props.onAddedBooking) {
      this.props.onAddedBooking(booking);
    }
  }

  onSavedCert = (booking) => {
    const { bookingId, certUrl } = booking;
    let { bookings } = this.state;
    const index = _.findIndex(bookings, booking => booking.id === bookingId);
    if (index !== -1) {
      bookings[index].certUrl = certUrl;
      this.setState({ bookings });
      if (this.props.onSavedCert) {
        this.props.onSavedCert(booking);
      }
    }
  }

  downloadAllCerts = () => {
    const { selectedMonth } = this.props;
    const { bookings } = this.state;
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

  onDeleteBooking = (bookingId) => {
    let { bookings } = this.state;
    _.remove(bookings, booking => booking.id == bookingId);
    this.setState({ bookings, showBookingModal: false, activeBooking: undefined });
    if (this.props.onDeleteBooking) {
      this.props.onDeleteBooking(bookingId);
    }
  }

  render() {
    const { showBookingModal, bookingDateTime, bookings, activeBooking, timeSlots } = this.state;
    const { numDays, firstDay, selectedMonth, user } = this.props;
    return(
      <>
        <div className='bg-white border border-0 rounded shadow-sm py-4 px-3 mt-3'>
            {/*<div className='d-flex justify-content-end'>
              <Button className='bg-blue border-0 shadow-sm mt-2'
                onClick={() => this.setState({ showBookingModal: true, activeBooking: undefined })}>
                BOOK NOW
              </Button>
            </div>*/}
            {
              /*user.role === 'admin' &&
              <div className='d-flex justify-content-end'>
                <Button size='sm'
                  className='bg-accept border-0 shadow-sm mt-2'
                  onClick={this.downloadAllCerts}>
                  <small>Download Available COVID-19 Certificates</small>
                </Button>
              </div>*/
            }
            {/*<Card className='d-flex flex-column align-items-center shadow-sm py-4 px-3 mt-3'>*/}
              <div className='d-flex justify-content-center'>
                <h4 className='blue-tint text-center'><strong>{moment(selectedMonth).format('MMMM YYYY')}</strong></h4>
              </div>
              <div className='d-flex w-100 mt-4'>
                <div>
                {
                  _.map(timeSlots, (time, timeId) => (
                    <div key={time.startValue} className='d-flex flex-column align-items-center justify-content-center border bg-white p-1'
                      style={{ width: this.slotWidth, height: this.slotHeight }}>
                      {
                        timeId === 0 &&
                        <h6 className='mb-0 text-darkgray-50 text-center'>Time Slot</h6>
                      }
                      {
                        timeId > 0 &&
                        <div className='align-items-center'>
                          <small className='mb-0 text-darkgray'>{time.startValue}</small>
                          <h6 className='mb-0 text-darkgray-50 text-center'>~</h6>
                          <small className='mb-0 text-darkgray'>{time.endValue}</small>
                        </div>
                      }
                    </div>
                  ))
                }
                </div>
                <ScrollContainer innerRef={this.scrollRef} vertical={true} className='d-flex w-100'>
                {
                  _.times(numDays, (dayId) => (
                    <div key={`${dayId}`}>
                    {
                      _.map(timeSlots, (time, timeId) => {
                        const bookingInSlot =  _.find(bookings, booking => {
                          const bookedDateTime = new Date(booking.bookedDateTime);
                          const bookedDate = bookedDateTime.getDate();
                          const bookedHour = bookedDateTime.getHours();
                          const bookedMin = bookedDateTime.getMinutes();
                          if (bookedDate === dayId + 1 && time.startTime === bookedHour && time.startMin === bookedMin) {
                            return true;
                          }
                          return false;
                        })
                        return (
                          <div key={time.startValue}
                            className='d-flex flex-column align-items-center justify-content-center border bg-white p-0 p-sm-1'
                            style={{ width: this.slotWidth, height: this.slotHeight, cursor: 'pointer' }}
                            onClick={() => {
                              /*if ( user.role === 'shareholder' && !user.subscribedPlan) {
                                return;
                              }*/
                              if (!bookingInSlot) {
                                let bookingDateTime = selectedMonth;
                                bookingDateTime.setDate(dayId + 1);
                                bookingDateTime.setHours(time.startTime);
                                bookingDateTime.setMinutes(time.startMin);
                                this.setState({ bookingDateTime, showBookingModal: true, activeBooking: undefined });
                              } else {
                                this.setState({ showBookingModal: true, activeBooking: bookingInSlot });
                              }
                            }}>
                            {
                              dayId >= 0 && timeId === 0 &&
                              <div className='d-flex flex-column align-items-center'>
                                <h6 className={'text-darkgray-50 ' + (isMobile ? 'mb-0' : 'mb-2')}>{getDayName((firstDay + dayId) % 7)}</h6>
                                <BrowserView>
                                  <strong className='text-darkgray'>{dayId + 1}</strong>
                                </BrowserView>
                                <MobileView>
                                  <small><strong className='text-darkgray'>{dayId + 1}</strong></small>
                                </MobileView>
                              </div>
                            }
                            {
                              dayId >= 0 && timeId > 0 && bookingInSlot &&
                              <div className='d-flex flex-column justify-content-center align-items-center w-100 h-100 p-1'
                                style={{ backgroundColor: bookingInSlot.aptColorHex, cursor: 'pointer' }}>
                                <small className='text-darkgray'><strong>{bookingInSlot.aptNumber}</strong></small>
                                <small className='text-darkgray text-center'>{_.truncate(bookingInSlot.aptName, { length: 16 })}</small>
                                <small className='text-lightblue'>{moment(bookingInSlot.bookedDateTime).format('hh:mm a')}</small>
                              </div>
                            }
                          </div>
                        )
                      })
                    }
                    </div>
                  ))
                }
                </ScrollContainer>
              </div>
            {/*</Card>*/}
        </div>
        {
          showBookingModal &&
          <AddBookingModal
            bookingDateTime={bookingDateTime}
            isOpen={showBookingModal}
            toggle={() => this.setState({ showBookingModal: false })}
            activeBooking={activeBooking}
            onDeleteBooking={this.onDeleteBooking}
            onSavedCert={this.onSavedCert}
            onBookDone={this.onBookDone} />
        }
      </>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(DetailedCalendar);
