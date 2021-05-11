import React from 'react';
import { Row, Col, ListGroup, ListGroupItem, Button } from 'reactstrap';
import { AlertModal } from 'modals/AlertModal';
import EditApartmentModal from 'modals/EditApartmentModal';
import APIs from 'APIs';
import { connect } from 'react-redux';
import _ from 'lodash';

class Apartments extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
         type: '',
         message: ''
      },
      apartments: [],
      activeApt: undefined,
      showEditAptModal: false,
      deletingApt: false,
      showConfirmDeleteModal: false
    }
  }

  componentDidMount() {
    this.getApartments();
  }

  getApartments = () => {
    const params = {
      buildingId: this.props.user.buildingId
    }
    APIs.getApartments(params).then(resp => {
      this.setState({ apartments: resp.data.data });
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });
  }

  showConfirmCancelModal = (apt) => {
    this.setState({ showConfirmCancelModal: true, activeApt: apt });
  }

  deleteApt = () => {
    const { activeApt } = this.state;
    if (activeApt) {
      this.setState({ deletingApt: true });
      const params = {
        aptNumber: activeApt.aptNumber,
        userId: this.props.user.id
      }
      APIs.deleteApartment(params).then(resp => {
        const { aptNumber } = resp.data.data;
        let { apartments } = this.state;
        if (apartments.length > 0) {
          _.remove(apartments, apt => apt.aptNumber == aptNumber);
          this.setState({ apartments, deletingApt: false, showConfirmDeleteModal: false, activeApt: undefined });
        }
      }).catch(err => {
        this.setState({ deletingApt: false });
      });
    }
  }

  onEditDone = (apt) => {
    let { apartments } = this.state;
    const index = _.findIndex(apartments, a => a.id === apt.aptId);
    if (index !== -1) {
      apartments[index].aptNames = apt.aptNames;
      apartments[index].aptColorHex = apt.aptColorHex;
    }
    this.setState({ apartments, showEditAptModal: false });
  }

  renderApts = () => {
    const { apartments } = this.state;
    return (
      <ListGroup>
      {
        _.map(apartments, apt => (
          <ListGroupItem key={apt.aptNumber} className='mt-3 py-3 shadow-sm'>
            <Row>
              <Col xs='6' sm='3'>
                <h6><strong>Apartment #</strong></h6>
                <h6 className='mb-0'>{apt.aptNumber}</h6>
              </Col>
              <Col xs='6' sm='3'>
                <h6><strong>Apartment Color</strong></h6>
                <div style={{ width: 40, height: 25, backgroundColor: apt.aptColorHex }} />
              </Col>
              <Col xs='6' sm='4' className='mt-3 mt-md-0'>
                <h6><strong>Apartment Name</strong></h6>
                <h6 className='ml-2'>{apt.aptNames}</h6>
              </Col>
              <Col xs='6' sm='2' className='d-flex align-items-center justify-content-center mt-3 mt-md-0'>
                <Button className='bg-blue border-0'
                  onClick={() => this.setState({ showEditAptModal: true, activeApt: apt })}>Edit</Button>
                <Button className='bg-reject border-0 ml-2'
                  onClick={() => this.setState({ showConfirmDeleteModal: true, activeApt: apt })}>Cancel</Button>
              </Col>
            </Row>
          </ListGroupItem>
        ))
      }
      </ListGroup>
    )
  }

  render() {
    const { className } = this.props;
    const {
      showConfirmDeleteModal,
      showEditAptModal,
      activeApt,
      deletingApt
    } = this.state;

    return (
      <div className={className ? className : 'my-5 mx-2 mx-lg-5'}>
        {this.renderApts()}
        {
          showEditAptModal &&
          <EditApartmentModal
            isOpen={showEditAptModal}
            toggle={() => this.setState({ showEditAptModal: false, activeApt: undefined })}
            activeApt={activeApt}
            onEditDone={this.onEditDone} />
        }
        {
          showConfirmDeleteModal &&
          <AlertModal
            isOpen={showConfirmDeleteModal}
            title='Cancel Apartment'
            body='Are you sure to delete this apartment?'
            inProgress={deletingApt}
            onClickPositive={this.deleteApt}
            onClickNegative={() => this.setState({ showConfirmDeleteModal: false, activeApt: undefined })}
            />
        }
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(Apartments);