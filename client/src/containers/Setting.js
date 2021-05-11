import React from 'react';
import { Alert, Card, Input } from 'reactstrap';
import { connect } from 'react-redux';
import { updateUser } from 'redux/user/actions';
import APIs from 'APIs';
import _ from 'lodash';
import moment from 'moment';
import Button from 'reactstrap-button-loader';
import TimePicker from "../components/TimePicker";
import XLSX from 'xlsx';
import { isEmail } from 'validator';
import LoadingOverlay from 'react-loading-overlay';

const times = [
  { id: 0, start: moment('08:00', 'hh:mm'), end: moment('09:00', 'hh:mm') }
];

class Setting extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bookingDateLimit: '7',
      timeSlots: times,
      alert: {
        type: '',
        message: ''
      },
      buildingLinkArr: [],
      uploadingBuildingsLink: false,
      loadingTimeSlot: false,
      emails: []
    }
    this.buildingLinkInput = React.createRef();

    this.onSaveTimeSlots=this.onSaveTimeSlots.bind(this);
  }

  componentDidMount() {
    if ( this.props.user.booking_limit ) {
      this.setState({ bookingDateLimit: this.props.user.booking_limit });
    }
    this.onGetTimeSlots();
    this.onGetUserEmails();
  }

  onGetTimeSlots = () => {
    this.setState({loadingTimeSlot: true});
    const params = { buildingId: this.props.user.buildingId };
    APIs.getTimeSlots(params).then(resp => {
      this.setState({loadingTimeSlot: false});
      const {data} = resp.data;
      if ( data.length !== 0 ) {
        var times = [];
        _.forEach(data, slot => {
            times.push({ id: slot.localId, start: moment(slot.start, 'hh:mm'), end: moment(slot.end, 'hh:mm') });
        });
        this.setState({ timeSlots: times });
      }
    }).catch(err => {
      this.setState({loadingTimeSlot: false});
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });
  }

  onGetUserEmails = () => {
    APIs.onGetUserEmails().then(resp => {
      const {data} = resp.data;
      var emails = [];
      _.forEach(data, user => {
        emails.push(user.email);
      });
      this.setState({ emails: emails });
    });
  }

  disabledHours = () => [0, 1, 2, 3, 4, 5, 6, 7, 22, 23];

  onChangeStartTime = (id, v) => {
    let timeSlots = [...this.state.timeSlots];
    let index = timeSlots.findIndex(el => el.id === id);
    let item = {...timeSlots[index]};
    item.start = v;
    timeSlots[index] = item;
    this.setState({timeSlots});
  }

  onChangeEndTime = (id, v) => {
    let timeSlots = [...this.state.timeSlots];
    let index = timeSlots.findIndex(el => el.id === id);
    let item = {...timeSlots[index]};
    item.end = v;
    timeSlots[index] = item;
    this.setState({timeSlots});
  }

  onChangeBookingLimit = (e) => {
    const selectedLimit = e.target.value;    
    const params = {
      bookingDateLimit: selectedLimit,
      userId: this.props.user.id
    }
    APIs.saveBookDateLimit(params).then(resp => {
      this.setState({ bookingDateLimit: selectedLimit });
      this.props.updateUser({ ...this.props.user, booking_limit: selectedLimit });
    });
  }

  addNewTimeSlot = (id) => {
    const params = this.state.timeSlots;
    if ( params.length > 0 ) {
      const last = params[params.length-1];
      if ( last.start.isSame(last.end) || last.start.isAfter(last.end)) {
        this.setState({ alert: { type: 'danger', message: 'Invalid time range' } });
        return;
      }
      if ( params.length > 1){
        const past = params[params.length-2];
        if ( past.end.isAfter(last.start) ) {
          this.setState({ alert: { type: 'danger', message: 'Invalid time range' } });
          return;
        }
      }
      if ( last.end.isValid() ) {
        this.setState({ alert: { type: 'danger', message: '' } });
        this.setState({
          timeSlots:[...this.state.timeSlots, {id: last.id+1, start: last.end, end: last.end}]
        });
      }
    }    
  }  

  removeLastTimeSlot = (id) => {
    this.setState({
      timeSlots: this.state.timeSlots.filter(function(slot) { 
        return slot.id !== id
      })
    });
  }

  onRenderTimeSlots = () => {
    const { timeSlots } = this.state;
    return _.map(timeSlots, slot => 
      (
        <div className='mt-2' key={slot.id}>
          <TimePicker className='timepicker' disabled={slot.id===timeSlots.length-1?false:true} value={slot.start} onChange={(v)=>this.onChangeStartTime(slot.id, v)} />&nbsp; - &nbsp;
          <TimePicker className='timepicker' disabled={slot.id===timeSlots.length-1?false:true} value={slot.end} onChange={(v)=>this.onChangeEndTime(slot.id, v)}  />
          { slot.id===timeSlots.length-1 && 
              <img alt='...' style={{cursor:'pointer'}} src={require('assets/img/svg/plus.svg')} width={20} height={20} className='ml-5' onClick={()=> this.addNewTimeSlot(slot.id)} />
          }     
          { slot.id===timeSlots.length-1 && slot.id!==0 &&
              <img alt='...' style={{cursor:'pointer'}} src={require('assets/img/svg/remove.svg')} width={20} height={20} className='ml-2' onClick={()=> this.removeLastTimeSlot(slot.id)} />
          }    
        </div>
      )
    )
  }

  onSaveTimeSlots = () => {
    const { timeSlots } = this.state;
    if ( timeSlots.length < 3 ) {
      this.setState({ alert: { type: 'danger', message: 'Add atleast 3 timeslots' } });
      return;
    }

    var slotparam = [];
    _.forEach(timeSlots, slot => {
        if ( slot.start.isAfter(slot.end)) {
          this.setState({ alert: { type: 'danger', message: 'Invalid time range' } });
          return;
        }
        slotparam.push({ id: slot.id, start: slot.start.format('HH:mm'), end: slot.end.format('HH:mm') });
    });
    const params = { buildingId: this.props.user.buildingId, timeSlots: slotparam };
    console.log(params);
    APIs.saveTimeSlots(params).then(resp => {
      this.setState({ alert: { type: 'success', message: 'Saved' } });
    }).catch(err => {
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      this.setState({ alert: { type: 'danger', message } });
    });    
  }

  onUploadBuildingsLink = (e) => {
    const ref = this;
    const { emails } = this.state;
    const { buildingId } = this.props.user;
    var files = e.target.files, f = files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, {type: 'array'});
      /* Get first worksheet */
      const wsname = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[wsname];
      /* Convert array of arrays */
      const jsondata = XLSX.utils.sheet_to_json (worksheet, { header: 1 });
      var shareholderArr = [];
      _.forEach(jsondata, slot => {     
        var emailArr = slot[15].replace(/\s/g, '').split(';');
        if ( slot[15] != '' && emailArr.length > 0  ) {          
          const full_name = slot[9] + ' ' + slot[10];
          const email = emailArr[0];
          if( isEmail(email) && emails.indexOf(email) < 0 ) {
            const password = Math.random().toString(36).substring(7);            
            shareholderArr.push({name: full_name, email: emailArr[0], aptNumber: slot[6], password: password });
          }
        }                
      });
      if ( shareholderArr.length > 0 ) {
        const params = { buildingId: buildingId, userArr: shareholderArr };
        ref.uploadBuildingsLinkAPI(params);
      }
    };
    reader.readAsArrayBuffer(f);
  }

  uploadBuildingsLinkAPI = (params) => {
    this.setState({uploadingBuildingsLink: true});
    APIs.uploadBuildingsLinkUsers(params).then(resp => {
      console.log("uploadBuildingsLinkUsers success");
      this.setState({uploadingBuildingsLink: false});
    }).catch(err => {
      this.setState({uploadingBuildingsLink: false});
      let message = err.message;
      if (err.response) {
        message = err.response.data.message;
      }
      console.log(message);
    });
  }

  uploadBuilingsLinkClk = () => {
    this.buildingLinkInput.current.click();
  }

  render() {
    const { bookingDateLimit, alert, uploadingBuildingsLink, loadingTimeSlot } = this.state;
    const { user } = this.props;
    return (
        <div className='d-flex flex-column my-4 mx-2 mx-lg-5'>
          <Card className='shadow-sm px-4 py-4 mt-5'>
            <h6 className='text-darkgray'><strong>SET BOOKING DATE LIMIT</strong></h6>
            <Input type='select' className='col-lg-3 col-md-6'
                value={bookingDateLimit}
                onChange={this.onChangeBookingLimit}>
                <option key={7} value={7}>1 week</option>
                <option key={14} value={14}>2 weeks</option>
            </Input>
          </Card>

          <h6 className='text-darkgray mt-4'><strong>TIME SLOT</strong></h6>
          <LoadingOverlay active={loadingTimeSlot} spinner>
            <Card className='shadow-sm px-3 py-4'>
              <div className='col-lg-6 col-md-10'>
                {this.onRenderTimeSlots()}
              </div>
              <div style={{textAlign: 'center'}}>
                { alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert> }
                <Button className='bg-blue border-0 shadow-sm mt-4' onClick={this.onSaveTimeSlots}>SAVE</Button>
              </div>  
            </Card>
          </LoadingOverlay>          

          {user.role==='admin' &&
            <div>
              <Button className='bg-tint border-0 shadow-sm mt-4' style={{width: 300, fontSize: 13, float: 'right'}} onClick={this.uploadBuilingsLinkClk} 
                  loading={uploadingBuildingsLink} disabled={uploadingBuildingsLink}>
                Upload your Buildingslink DB file
              </Button>
              <input type="file" accept=".xls" style={{display: 'none'}} ref={this.buildingLinkInput} onChange={this.onUploadBuildingsLink} />
            </div>
          }

          <h6 className='mt-5'>
            Tap&nbsp;
            <a target='_blank' rel='noopener noreferrer' href='https://www.topazsystems.com/software/sigweb.exe'>here</a>
            &nbsp;to download the driver of Topaz Sign pad
          </h6>
        </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
})

const mapDispatchToProps = (dispatch) => ({
  updateUser: (user) => dispatch(updateUser(user))
})

export default connect(mapStateToProps, mapDispatchToProps)(Setting);
