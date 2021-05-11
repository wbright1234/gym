import React from 'react';
import { Alert, Row, Col, ListGroup, ListGroupItem } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import _ from 'lodash';
import AddDoormanModal from 'modals/AddDoormanModal';
import LoadingOverlay from 'react-loading-overlay';
import { connect } from 'react-redux';
import APIs from 'APIs';
import { AlertModal } from 'modals/AlertModal';

class AddDoormen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: {
        type: '',
        message: ''
      },
      isLoading: false,
      showConfirmCancelModal: false,
      cancellingDoorman: false,
      doormen: [],
      activeDoorman: undefined
    }
  }

  componentDidMount() {
    this.getDoormen();
  }

  getDoormen = () => {
    if (!this.props.user.id) {
      return;
    }
    const params = {
      buildingId: this.props.user.buildingId,
      role: this.props.user.role
    }
    this.setState({ isLoading: true });
    APIs.getDoormen(params).then(resp => {
      this.setState({ doormen: resp.data.data, isLoading: false });
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message }, isLoading: false });
    })
  }

  onAddedDoorman = (doorman) => {
    let { doormen } = this.state;
    const index = _.findIndex(doormen, d => d.id === doorman.id);
    if (index !== -1) {
      doormen[index] = doorman;
    } else {
      doormen = [doorman, ...doormen];
    }
    this.setState({ doormen, showAddDoormanModal: false });
  }

  showConfirmCancelModal = (doorman) => {
    this.setState({ showConfirmCancelModal: true, activeDoorman: doorman });
  }

  cancelDoorman = () => {
    const { activeDoorman } = this.state;
    if (activeDoorman) {
      const params = {
        doormanId: activeDoorman.id
      };
      this.setState({ cancellingDoorman: true });
      APIs.cancelDoorman(params).then(resp => {
        const { doormanId } = resp.data.data;
        let { doormen } = this.state;
        _.remove(doormen, m => m.id == doormanId);
        this.setState({ doormen, showConfirmCancelModal: false, cancellingDoorman: false });
      }).catch(err => {
        let message = err.message;
        if (err.response) {
          message = err.response.data.message;
        }
        this.setState({ alert: { type: 'danger', message }, cancellingDoorman: false })
      })
    }
  }

  renderDoormen = () => {
    const { doormen, isLoading } = this.state;
    return (
      <LoadingOverlay active={isLoading} spinner>
        <ListGroup>
          {
            _.map(doormen, man => (
              <ListGroupItem key={man.id} className='shadow-sm py-3 mt-3'>
                <Row className='mx-0 bg-white'>
                  <Col xs='6' sm='auto' lg='2' className='px-1 px-sm-3'>
                    <h6><strong>NAME</strong></h6>
                    <h6 className='mb-0'>{man.name}</h6>
                  </Col>
                  <Col xs='6' sm='auto' lg='3' className='px-1 px-sm-3'>
                    <h6><strong>EMAIL</strong></h6>
                    <h6 className='mb-0'>{man.email}</h6>
                  </Col>
                  <Col xs='6' sm='auto' lg='3' className='mt-3 mt-sm-0 px-1 px-sm-3'>
                    <h6><strong>PHONE NUMBER</strong></h6>
                    <h6 className='mb-0'>{man.phoneNumber}</h6>
                  </Col>
                  <Col xs='6' sm='auto' lg='auto' className='mt-3 mt-sm-0 px-1 px-sm-3'>
                    <h6><strong>ROLE</strong></h6>
                    <h6 className='mb-0'>{_.upperFirst(man.role)}</h6>
                  </Col>
                  <Col className='d-flex justify-content-end align-items-center mt-3 mt-sm-0 px-1 px-sm-3'>
                    <Button className='bg-blue border-0 text-white' onClick={() => this.setState({ activeDoorman: man, showAddDoormanModal: true })}>Edit</Button>
                    <Button className='bg-reject border-0 text-white ml-2' onClick={() => this.showConfirmCancelModal(man)}>Cancel</Button>
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
    const { alert, showAddDoormanModal, showConfirmCancelModal, cancellingDoorman, activeDoorman } = this.state;
    return (
      <div className='my-4 mx-2 mx-lg-5'>
        {alert.message && <Alert color={alert.type}>{alert.message}</Alert>}
        <div className='d-flex justify-content-end mb-4'>
          <Button className='bg-blue border-0 shadow-sm' onClick={() => this.setState({ showAddDoormanModal: true, activeDoorman: undefined })}>
          + Add New Doorman
          </Button>
        </div>
        {this.renderDoormen()}
        {
          showAddDoormanModal &&
          <AddDoormanModal
            isOpen={showAddDoormanModal}
            activeDoorman={activeDoorman}
            buildingId={this.props.user.buildingId}
            toggle={() => this.setState({ showAddDoormanModal: false, activeDoorman: undefined })}
            onAddedDoorman={this.onAddedDoorman} />
        }
        {
          showConfirmCancelModal &&
          <AlertModal
            isOpen={showConfirmCancelModal}
            title='Cancel'
            body='Are you sure to cancel this doorman?'
            inProgress={cancellingDoorman}
            onClickPositive={this.cancelDoorman}
            onClickNegative={() => this.setState({ showConfirmCancelModal: false, activeDoorman: undefined })}
            />
        }
      </div>
    )
  }
}
const mapStateToProps = (state) => ({
  user: state.user
})

export default connect(mapStateToProps)(AddDoormen);
