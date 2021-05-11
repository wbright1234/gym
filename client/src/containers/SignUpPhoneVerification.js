import React from 'react';
import { Alert } from 'reactstrap';
import ReactInputVerificationCode from 'react-input-verification-code';
import Button from 'reactstrap-button-loader';
import SignUpDoneModal from 'modals/SignUpDoneModal';
import APIs from 'APIs';

class SignUpPhoneVerification extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
          alert: {
            type: '',
            message: ''
          },
          doneSignUp: false,
          code: '',
      }
    }

    onConfirmPhoneVerification() {
        const {code} = this.state;
        const params = { userId: this.props.location.state.userId, code: code};
        const { admin, userId, stripeCustomerId, registrationCapacity } = this.props.location.state;
        APIs.confirmPhoneVerification(params).then(resp => {
            this.setState({doneSignUp: true});
            if ( admin === true ) {
                this.props.history.push('/signup-subscription', {userId, stripeCustomerId, registrationCapacity});
            }          
        }).catch(err => {
            let message = err.message;
            if (err.response) {
                message = err.response.data.message;
            }
            this.setState({alert: { type: 'danger', message } });
        });
    }

    onVerify = () => {
        const {code} = this.state;
        if ( code.length === 6 ) {
            this.onConfirmPhoneVerification();
        } else {
            this.setState({ alert: { type: 'danger', message: 'Please input verify code' } });
        }
    }

    onChange = ( code ) => {
        this.setState({code: code});
    }

    onResendCode = () => {
        const params = { userId: this.props.location.state.userId};
        APIs.onResendCode(params).then(resp => {
            this.setState({doneSignUp: true});
        }).catch(err => {
            let message = err.message;
            if (err.response) {
                message = err.response.data.message;
            }
            console.log('error while resend code: ', message);
        });
    }

    render() {
        const {doneSignUp, alert} = this.state;
        const admin = this.props.location.state.admin;

        return (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <div className='d-flex flex-column align-items-center' style={{marginTop: -200}}>
                    <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={300} className="mt-5 mb-5" />
                    <p style={{color:'#364954', fontWeight: 'Bold', fontSize: 20}} className="mt-5 mb-3">
                        Enter the verification code sent to you phone number
                    </p>
                    <ReactInputVerificationCode length={6} onChange={this.onChange} autoFocus={true} placeholder="" />
                    {alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert>}
                    <Button className='bg-blue text-white border-0 mt-5 py-2' style={{width: 400}} onClick={this.onVerify}>
                        <strong>CONFIRM</strong>
                    </Button>
                    <button className='mt-3 blue-tint cursor-pointer border-0' onClick={this.onResendCode} style={{textDecorationLine: 'underline', backgroundColor: '#fff'}}>Resend Code</button>
                </div>
                { doneSignUp && admin === false &&
                <SignUpDoneModal isOpen={doneSignUp} onClose={() => this.setState({ doneSignUp: false }, () => this.props.history.push('/sign-in'))} /> }
            </div>
        )
    }
}

export default SignUpPhoneVerification;