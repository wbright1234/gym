import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import { AlertModal } from 'modals/AlertModal';
import SubscriptionPaymentModal from 'modals/SubscriptionPaymentModal';
import APIs from 'APIs';
import { updateUser } from 'redux/user/actions';
import moment from 'moment';
import LoadingOverlay from 'react-loading-overlay';
import { isMobile } from 'react-device-detect';

class Subscription extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showUpgradeConfirmModal: false,
            showUnsubscribeConfirmModal: false,
            showCardInputModal: false,
            upgradingPlan: false,
            unsubscribingPlan: false,
            plan: '',
            changePlan: '',
            monthly_price: 0,
            yearly_price: 0,
            biyearly_price: 0,
            next_bill_date: '',
            loadingSubscriptionInfo: false
        }
    }

    componentDidMount() {
        this.setState({ plan: this.props.user.subscribedPlan });
        this.onGetSubscriptionInfo();

        const registrationCapacity = this.props.user.registrationCapacity;
        this.setState({monthly_price: registrationCapacity*2, biyearly_price: registrationCapacity*1.5*3, yearly_price: registrationCapacity*1.25*6});
    }

    onGetSubscriptionInfo() {
        const { user } = this.props;
        if ( user.role == 'admin' && user.subscriptionId ) {
            const params = { userId: user.id };
            this.setState({loadingSubscriptionInfo: true});
            APIs.getSubscriptionInfo(params).then(resp => {
              let { billCycleEnd } = resp.data;
              this.setState({ next_bill_date: moment(billCycleEnd*1000).format('MM-DD-YYYY'), loadingSubscriptionInfo: false });
            });
        }        
    }

    toLocalTime = (time) => {
        var d = new Date(time);
        var offset = (new Date().getTimezoneOffset() / 60) * -1;
        var n = new Date(d.getTime() + offset);
        return n;
    };

    onMonthlySelect = () => {
        if ( this.state.plan !== 'monthly' ){
            this.setState({changePlan: 'monthly', showUpgradeConfirmModal: true});
        }
    }

    onYearlySelect = () => {
        if ( this.state.plan !== 'yearly' ){
            this.setState({changePlan: 'yearly', showUpgradeConfirmModal: true});
        } 
    }

    onBiYearlySelect = () => {
        if ( this.state.plan !== 'biyearly' ){
            this.setState({changePlan: 'biyearly', showUpgradeConfirmModal: true});
        } 
    }

    upgradePlan = () => {
        const { user } = this.props;
        if ( user.subscriptionId ) {
            this.setState({ upgradingPlan: true });
            var price = this.state.monthly_price;
            var interval = 1;
            if ( this.state.changePlan == 'biyearly') {
                price = this.state.biyearly_price;
                interval = 6;
            } else if ( this.state.changePlan == 'yearly') {
                price = this.state.yearly_price;
                interval = 12;
            }
            // update the subscription
            const params = { userId: user.id, interval: interval, price: price, plan: this.state.changePlan }
            APIs.updateStripeSubscription(params).then(resp => {
                let { billCycleEnd } = resp.data;
                this.setState({ next_bill_date: moment(billCycleEnd*1000).format('MM-DD-YYYY') });
                this.setState({ upgradingPlan: false, showUpgradeConfirmModal: false, plan: params.plan });
                this.props.updateUser({ ...this.props.user, subscribedPlan: params.plan });
            })
            .catch(err => {
                let message = err.message;
                if (err.response) {
                    message = err.response.data.message;
                }
                this.setState({ alert: { type: 'danger', message }, upgradingPlan: false });
            })
        } else {
            this.setState({ showCardInputModal: true, showUpgradeConfirmModal: false });
        }        
    }

    onShowUnsubscribeModal = () => {
        this.setState({ showUnsubscribeConfirmModal: true });
    }

    unsubscribePlan = () => {
        const { user } = this.props;
        if (!user.subscriptionId) {
          return;
        }
        this.setState({ unsubscribingPlan: true });
        const params = {
            subscriptionId: user.subscriptionId,
        }
        APIs.cancelSubscription(params).then(resp => {
          this.setState({ unsubscribingPlan: false, showUnsubscribeConfirmModal: false, plan: '' });
          this.props.updateUser({ ...this.props.user, subscriptionId: null, subscribedPlan: null});
        }).catch(err => {
          let message = err.message;
          if (err.response) {
            message = err.response.data.message;
          }
          this.setState({ alert: { type: 'danger', message }, unsubscribePlan: false });
        });
    }

    subscriptionDone = (plan) => {
        this.setState({ plan: plan, showCardInputModal: false });
    }

    render() {
        const {monthly_price, yearly_price, biyearly_price, plan, showUpgradeConfirmModal, upgradingPlan, changePlan, 
            showCardInputModal, showUnsubscribeConfirmModal, unsubscribingPlan, next_bill_date, loadingSubscriptionInfo} = this.state;
        const buttonborder = { borderColor: '#0087B4', borderWidth: 2 };
        const typeStyle = {fontSize: 20, fontWeight: 'bold'};
        const priceStyle = {fontSize: 55, fontWeight: 'bold'};

        return (
            <LoadingOverlay active={loadingSubscriptionInfo} spinner>
                <div className='d-flex flex-column my-4 mx-lg-5'>
                    <div className='bg-white border-0 rounded shadow-sm mt-3'>
                        <div className='d-flex justify-content-center'>
                            <div className='mt-4 mb-5 w-90' style={{ height: 2, backgroundColor: 'lightgrey', opacity: 0.5 }} />
                        </div>

                        <div className='d-flex justify-content-center'>
                            <Row className={(isMobile ? 'w-90' : 'w-75')}>
                                <Col lg='4' md='4' style={{textAlign: 'center', color: '#0087B4'}} className='mb-5'>
                                    <p style={typeStyle}>Monthly</p>
                                    <p style={priceStyle}>${monthly_price}</p>
                                    <Button className={plan==='monthly'?'bg-tint':'bg-white blue-tint'} style={buttonborder} onClick={this.onMonthlySelect}>
                                        <strong style={{fontSize: 17}}>
                                        {plan === 'monthly' ? 'Current Plan' : 'Choose Plan'}
                                        </strong>
                                    </Button><br />
                                    {plan==='monthly' &&
                                        <>
                                            <label className="mt-2">Next Billing date: <strong>{next_bill_date}</strong></label><br />
                                            {/*<button className='mt-1 blue-tint cursor-pointer border-0' onClick={this.onShowUnsubscribeModal} style={{textDecorationLine: 'underline', backgroundColor: '#fff'}}>Unsubscribe</button>*/}
                                        </>
                                    }
                                </Col>

                                <Col lg='4' md='4' style={{textAlign: 'center', color: '#0087B4'}} className='mb-5'>
                                    <p style={typeStyle}>Bi Yearly</p>
                                    <p style={priceStyle}>${biyearly_price}</p>
                                    <Button className={plan==='biyearly'?'bg-tint':'bg-white blue-tint'} style={buttonborder} onClick={this.onBiYearlySelect}>
                                        <strong style={{fontSize: 17}}>
                                        {plan === 'biyearly' ? 'Current Plan' : 'Choose Plan'}
                                        </strong>
                                    </Button><br />
                                    {plan==='biyearly' &&
                                        <>
                                            <label className="mt-1">Next Billing date: <strong>{next_bill_date}</strong></label>
                                            {/*<button className='mt-1 blue-tint cursor-pointer border-0' onClick={this.onShowUnsubscribeModal} style={{textDecorationLine: 'underline', backgroundColor: '#fff'}}>Unsubscribe</button>*/}
                                        </>
                                    }
                                </Col>

                                <Col lg='4' md='4' style={{textAlign: 'center', color: '#0087B4'}} className='mb-5'>
                                    <p style={typeStyle}>Yearly</p>
                                    <p style={priceStyle}>${yearly_price}</p>
                                    <Button className={plan==='yearly'?'bg-tint':'bg-white blue-tint'} style={buttonborder} onClick={this.onYearlySelect}>
                                        <strong style={{fontSize: 17}}>
                                        {plan === 'yearly' ? 'Current Plan' : 'Choose Plan'}
                                        </strong>
                                    </Button><br />
                                    {plan==='yearly' &&
                                        <>
                                            <label className="mt-2">Next Billing date: <strong>{next_bill_date}</strong></label><br />
                                            {/*<button className='mt-1 blue-tint cursor-pointer border-0' onClick={this.onShowUnsubscribeModal} style={{textDecorationLine: 'underline', backgroundColor: '#fff'}}>Unsubscribe</button>*/}
                                        </>
                                    }
                                </Col>
                            </Row>
                        </div>                   
                        {showUpgradeConfirmModal &&
                        <AlertModal
                            isOpen={showUpgradeConfirmModal}
                            title='Subscribe Plan'
                            body={
                            <h6 className='f-family-poppins-lt' style={{ lineHeight: 1.5 }}>
                                Are you sure to subscribe to <strong>{changePlan==='monthly'?'Monthly':changePlan==='yearly'?'Yearly':'Bi Yearly'}</strong> plan?
                            </h6>
                            }
                            inProgress={upgradingPlan}
                            onClickPositive={this.upgradePlan}
                            onClickNegative={() => this.setState({ showUpgradeConfirmModal: false })} />
                        }
                        {showUnsubscribeConfirmModal &&
                        <AlertModal
                            isOpen={showUnsubscribeConfirmModal}
                            title='Unsubscribe Plan'
                            body={
                            <h6 className='f-family-poppins-lt' style={{ lineHeight: 1.5 }}>
                                Are you sure to unsubscribe <strong>{plan==='monthly'?'Monthly':plan==='yearly'?'Yearly':'Bi Yearly'}</strong> plan?
                            </h6>
                            }
                            inProgress={unsubscribingPlan}
                            onClickPositive={this.unsubscribePlan}
                            onClickNegative={() => this.setState({ showUnsubscribeConfirmModal: false })}
                        />
                        }
                        {showCardInputModal && 
                        <SubscriptionPaymentModal
                            subscribePlan={changePlan}
                            isOpen={showCardInputModal}
                            toggle={() => this.setState({ showCardInputModal: false })} 
                            onDone={this.subscriptionDone} />
                        }
                    </div>
                </div>
            </LoadingOverlay>
            
        )
    }
}

const mapStateToProps = (state) => ({
  user: state.user
})

const mapDispatchToProps = (dispatch) => ({
    updateUser: (user) => dispatch(updateUser(user))
})

export default connect(mapStateToProps, mapDispatchToProps)(Subscription);
