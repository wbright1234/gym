import React from 'react';
import { Row, Col, ListGroup, ListGroupItem, Input } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import _ from 'lodash';
import moment from 'moment';
import AddBookingModal from 'modals/AddBookingModal';
import LoadingOverlay from 'react-loading-overlay';
import { connect } from 'react-redux';
import APIs from 'APIs';
import { AlertModal } from 'modals/AlertModal';
import { isMobile } from 'react-device-detect';
import LoadingIndicator from 'react-loading-indicator';

class Bookings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      showBookingModal: false,
      isLoading: false,
      bookings: [],
      showConfirmDeleteModal: false,
      activeBooking: undefined,
      cancelBook: false,
      showOldBooking: 0,
      offset: 0,
      limit: 10,
      totalCount: 0,
      loadingMore: false
    }
  }

  componentDidMount() {
    this.getBookings();
    document.addEventListener('scroll', this.trackScrolling);
  }

  componentWillUnmount() {
    document.removeEventListener('scroll', this.trackScrolling);
  }

  trackScrolling = async () => {
    const wrappedElement = document.getElementById('container');
    if (this.isBottom(wrappedElement)) {
      if (this.state.loadingMore) return;
      if (this.state.offset < this.state.totalCount) {
        try {
          this.setState({ loadingMore: true });
          this.getBookings();
        } catch (e) {
          this.setState({ loadingMore: false });
        }
      }
    }
  }

  isBottom(el) {
    return el.getBoundingClientRect().bottom <= window.innerHeight + 10;
  }

  getBookings = () => {
    if (!this.props.user.id) {
      return;
    }
    const params = {
      userId: this.props.user.id,
      role: this.props.user.role,
      offset: this.state.offset,
      limit: this.state.limit,
      showOldBooking: this.state.showOldBooking,
      buildingId: this.props.user.buildingId
    }
    this.setState({ isLoading: true });
    APIs.getBookings(params).then(resp => {
      let { data, limit, totalCount } = resp.data.data;
      if (data.length > 0) {
        this.setState({
          isLoading: false,
          loadingMore: false,
          bookings: [...this.state.bookings, ...data],
          offset: this.state.offset + limit,
          limit,
          totalCount: totalCount ? totalCount : 0
        });
      }
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({
        isLoading: false,
        loadingMore: false,
        alert: { type: 'danger', message }
      });
    });
  }

  onBookDone = (newBooking) => {
    let { bookings } = this.state;
    const index = _.findIndex(bookings, b => b.id === newBooking.id);
    if (index !== -1) {
      bookings[index] = newBooking;
    } else {
      bookings = [newBooking, ...bookings];
    }
    this.setState({ bookings, showBookingModal: false, isLoading: false });
  }

  showConfirmDeleteModal = (booking) => {
    this.setState({ showConfirmDeleteModal: true, activeBooking: booking });
  }

  cancelBooking = () => {
    const { activeBooking } = this.state;
    this.setState({ cancelBook: true });
    const params = { bookingId: activeBooking.id }
    APIs.cancelBooking(params).then(resp => {
      const { bookingId } = resp.data.data;
      let { bookings } = this.state;
      _.remove(bookings, booking => booking.id == bookingId);
      this.setState({ bookings, cancelBook: false, showConfirmDeleteModal: false });
    }).catch(err => {
      this.setState({ cancelBook: false });
    });
  }

  downloadCovidCert = (booking) => {
    fetch(booking.certUrl)
			.then(response => {
        response.blob().then(blob => {
					let url = window.URL.createObjectURL(blob);
					let a = document.createElement('a');
					a.href = url;
					a.download = booking.name + '_covid_cert_' + moment(booking.bookedDateTime).format('YYYY-MM-DD') + '.png';
					a.click();
				});
      })
  }

  editBooking = (booking) => {
    this.setState({ activeBooking: booking, showBookingModal: true });
  }

  renderBookings = () => {
    const { bookings, isLoading } = this.state;
    const { user } = this.props;
    return (
      <LoadingOverlay active={isLoading} spinner>
        <ListGroup>
        {
          _.map(bookings, booking => (
            <ListGroupItem key={booking.id} className='shadow-sm py-3 mt-3'>
              <Row>
                <Col xs={isMobile ? '12' : '10'}>
                  <Row className='mx-0 bg-white'>
                    <Col xs='4' lg='2' className='px-1'>
                      <h6><strong>NAME</strong></h6>
                      <h6 className='mb-0'>{booking.aptName}</h6>
                    </Col>
                    <Col xs='4' lg='2' className='px-1'>
                      <h6><strong>ROLE</strong></h6>
                      <h6 className='mb-0'>{booking.role}</h6>
                    </Col>
                    <Col xs='4' lg='3' className='px-1'>
                      <h6><strong>APT NUMBER</strong></h6>
                      <h6 className='mb-0'>{booking.aptNumber}</h6>
                    </Col>
                    <Col xs='6' lg='2' className='mt-3 mt-lg-0 px-1'>
                      <h6><strong>DATE</strong></h6>
                      <h6 className='mb-0'>{moment(booking.bookedDateTime).format('DD/MM/YYYY')}</h6>
                    </Col>
                    <Col xs='6' lg='3' className='mt-3 mt-lg-0 px-1'>
                      <h6><strong>TIME</strong></h6>
                      <h6 className='mb-0'>{moment(booking.bookedDateTime).format('hh:mm a')}</h6>
                    </Col>
                  </Row>
                  {
                    booking.note &&
                    <Row className='mx-0 mt-3'>
                      <Col className='px-1'>
                        <h6><strong>BOOKING NOTE</strong></h6>
                        <h6 className='mb-0'>{booking.note}</h6>
                      </Col>
                    </Row>
                  }
                </Col>
                <Col className='d-flex flex-column justify-content-center align-items-end'>
                  <div className='d-flex'>
                    <Button className='bg-blue border-0 text-white ml-2' onClick={() => this.editBooking(booking)}>Edit</Button>
                    <Button className='bg-reject border-0 text-white ml-2' onClick={() => this.showConfirmDeleteModal(booking)}>Cancel</Button>
                  </div>
                  {
                    user.role === 'admin' && booking.certUrl &&
                    <Button size='sm' className='bg-accept border-0 text-white ml-2 mt-3 p-1'
                      onClick={() => this.downloadCovidCert(booking)}>
                      <small>Download COVID-19 Cert</small>
                    </Button>
                  }
                </Col>
              </Row>
            </ListGroupItem>
          ))
        }
        </ListGroup>
      </LoadingOverlay>
    )
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
    const { showBookingModal, showConfirmDeleteModal, cancelBook, activeBooking, showOldBooking, loadingMore } = this.state;
    const { user } = this.props;

    return (
      <div id='container' className='my-4 mx-2 mx-lg-5'>
        <div className='d-flex flex-column align-items-end'>
          <Button className='bg-blue border-0 shadow-sm mb-4'
            onClick={() => this.setState({ showBookingModal: true, activeBooking: undefined })}>
            BOOK NOW
          </Button>
          <div className='d-inline-block mt-2'>
            <Input type='select'
              value={showOldBooking}
              onChange={e => {
                this.setState({ showOldBooking: parseInt(e.target.value), offset: 0, limit: 10, totalCount: 0, bookings: [] }, () => {
                  this.getBookings();
                });
              }}>
              <option value={0}>Show available bookings</option>
              <option value={1}>Show all bookings</option>
            </Input>
          </div>
        </div>
        {
          this.renderBookings()
        }
        {loadingMore && <LoadingIndicator className='d-flex mx-auto mt-4' />}
        {
          showBookingModal &&
          <AddBookingModal
            isOpen={showBookingModal}
            activeBooking={activeBooking}
            toggle={() => this.setState({ showBookingModal: false, activeBooking: undefined })}
            onBookDone={this.onBookDone} 
            onDeleteBooking={this.onDeleteBooking} />
        }
        {
          showConfirmDeleteModal &&
          <AlertModal
            isOpen={showConfirmDeleteModal}
            title='Cancel Booking'
            body='Are you sure to cancel this booking?'
            inProgress={cancelBook}
            onClickPositive={this.cancelBooking}
            onClickNegative={() => this.setState({ showConfirmDeleteModal: false, activeBooking: undefined })}
            />
        }
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(Bookings);
