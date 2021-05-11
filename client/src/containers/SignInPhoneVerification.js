import React from 'react';
import { Alert } from 'reactstrap';
import ReactInputVerificationCode from 'react-input-verification-code';
import Button from 'reactstrap-button-loader';
import WaitingConfirmationModal from 'modals/WaitingConfirmationModal';
import APIs from 'APIs';
import ls from 'local-storage';
import { connect } from 'react-redux';
import { updateUser } from 'redux/user/actions';

class SignInPhoneVerification extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            alert: {
                type: '',
                message: ''
            },
            doneSignUp: false,
            code: '',
            waitingConfirmation: false,
            showProgress: false
        }
    }

    onConfirmPhoneVerification() {
        this.setState({showProgress: true});
        const {code} = this.state;
        const {user, rememberMe, accessToken, refreshToken, email, password} = this.props.location.state;
        const params = { userId: user.id, code: code};
        APIs.confirmPhoneVerification(params).then(resp => {
            this.setState({showProgress: false});
            if ( user.role === 'admin') {
                this.props.history.push('/signup-subscription', {userId: user.id, stripeCustomerId: user.stripeCustomerId, registrationCapacity: user.registrationCapacity});
            } else {
                if (!user.confirmed) {
                    this.setState({ waitingConfirmation: true });
                    return;
                }
                this.props.updateUser(user);
                APIs.setAccessToken(accessToken);
                ls.set('refreshToken', refreshToken);
                ls.set('isLoggedIn', true);
                if (rememberMe) {
                    ls.set('rememberMe', true);
                    ls.set('email', email);
                    ls.set('password', password);
                } else {
                    ls.set('rememberMe', false);
                }
                this.props.history.push('/dashboard');
            }            
        }).catch(err => {
            this.setState({showProgress: false});
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
        this.setState({showProgress: true});
        const {user} = this.props.location.state;
        const params = { userId: user.id};
        APIs.onResendCode(params).then(resp => {
            this.setState({showProgress: false});
        }).catch(err => {
            this.setState({showProgress: false});
            console.log('error while resend code: ', err)
        });
    }

    render() {
        const {waitingConfirmation, alert, showProgress} = this.state;

        return (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <div className='d-flex flex-column align-items-center' style={{marginTop: -200}}>
                    <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={300} className="mt-5 mb-5" />
                    <p style={{color:'#364954', fontWeight: 'Bold', fontSize: 20}} className="mt-5 mb-3">
                        Enter the verification code sent to you phone number
                    </p>
                    <ReactInputVerificationCode length={6} onChange={this.onChange} autoFocus={true} placeholder="" />
                    {alert.message && <Alert color={alert.type} className='mt-3'>{alert.message}</Alert>}
                    <Button className='bg-blue text-white border-0 mt-5 py-2' style={{width: 400}} onClick={this.onVerify} loading={showProgress} disabled={showProgress}>
                        <strong>CONFIRM</strong>
                    </Button>
                    <button className='mt-3 blue-tint cursor-pointer border-0' onClick={this.onResendCode} style={{textDecorationLine: 'underline', backgroundColor: 'transparent'}} onClick={this.onVerify} loading={showProgress}>Resend Code</button>
                </div>
                {
                waitingConfirmation &&
                <WaitingConfirmationModal isOpen={waitingConfirmation} toggle={() => this.props.history.push('/sign-in')} />
                }
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
  
export default connect(mapStateToProps, mapDispatchToProps)(SignInPhoneVerification);