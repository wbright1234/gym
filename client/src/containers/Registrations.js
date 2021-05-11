import React from 'react';
import { Alert, Row, Col, ListGroup, ListGroupItem } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import _ from 'lodash';
import LoadingOverlay from 'react-loading-overlay';
import { connect } from 'react-redux';
import APIs from 'APIs';
import { AlertModal } from 'modals/AlertModal';

class Registrations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      isLoading: false,
      showRejectConfirmModal: false,
      activeRegistration: undefined,
      registrations: []
    }
  }

  componentDidMount() {
    this.getPendingRegistrations();
  }

  getPendingRegistrations = () => {
    this.setState({ isLoading: true });
    const params = {
      buildingId: this.props.user.buildingId
    }
    APIs.getPendingRegistrations(params).then(resp => {
      const { data } = resp.data;
      this.setState({ registrations: data, isLoading: false });
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ isLoading: false, alert: { type: 'danger', message } });
    });
  }

  accept = (reg) => {
    const params = {
      regId: reg.id
    };
    APIs.acceptRegistration(params).then(resp => {
      const { regId } = resp.data.data;
      let { registrations } = this.state;
      _.remove(registrations, reg => reg.id == regId);
      this.setState({ registrations });
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });
  }

  reject = () => {
    const { activeRegistration } = this.state;
    const params = {
      regId: activeRegistration.id
    };
    APIs.rejectRegistration(params).then(resp => {
      const { regId } = resp.data.data;
      let { registrations } = this.state;
      _.remove(registrations, reg => reg.id == regId);
      this.setState({ registrations, showRejectConfirmModal: false });
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });
  }

  renderRegistrations = () => {
    const { registrations, isLoading } = this.state;
    return (
      <LoadingOverlay active={isLoading} spinner>
        <ListGroup>
          {
            _.map(registrations, reg => (
              <ListGroupItem key={reg.email} className='shadow-sm py-3 mt-3'>
                <Row className='mx-0 bg-white'>
                  <Col xs='6' sm='auto' lg='2' className='px-1'>
                    <h6><strong>NAME</strong></h6>
                    <h6 className='mb-0'>{reg.name}</h6>
                  </Col>
                  <Col xs='6' sm='auto' lg='3' className='px-1'>
                    <h6><strong>EMAIL</strong></h6>
                    <h6 className='mb-0'>{reg.email}</h6>
                  </Col>
                  <Col xs='6' sm='auto' lg='3' className='mt-3 mt-sm-0 px-1'>
                    <h6><strong>PHONE NUMBER</strong></h6>
                    <h6 className='mb-0'>{reg.phoneNumber}</h6>
                  </Col>
                  <Col xs='6' sm='auto' lg='auto' className='mt-3 mt-sm-0 px-1'>
                    <h6><strong>APT NUMBER</strong></h6>
                    <h6 className='mb-0'>{reg.aptNumber}</h6>
                  </Col>
                  <Col className='d-flex justify-content-end align-items-center mt-3 mt-lg-0 px-1'>
                    <Button className='bg-blue border-0 text-white'
                      onClick={() => this.accept(reg)}>Accept</Button>
                    <Button className='bg-reject border-0 text-white ml-2'
                      onClick={() => this.setState({ showRejectConfirmModal: true, activeRegistration: reg })}>Reject</Button>
                  </Col>
                </Row>
              </ListGroupItem>
            ))
          }
        </ListGroup>
      </LoadingOverlay>
    )
  }

  render() {
    const { alert, showRejectConfirmModal } = this.state;
    return (
      <div className='my-4 mx-2 mx-lg-5'>
        {alert.message && <Alert color={alert.type}>{alert.message}</Alert>}
        {this.renderRegistrations()}
        {
          showRejectConfirmModal &&
          <AlertModal
            isOpen={showRejectConfirmModal}
            title='Reject'
            body='Are you sure to reject this registration?'
            onClickPositive={this.reject}
            onClickNegative={() => this.setState({ showRejectConfirmModal: false, activeRegistration: false })} />
        }
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(Registrations);
