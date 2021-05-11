import React from 'react';
import {
    Row,
    Col,
  } from 'reactstrap';
  import Button from 'reactstrap-button-loader';

class HomePage extends React.Component {    
    onSignIn = () => {
        this.props.history.push('/sign-in');
    }

    onSignUp = () => {
        this.props.history.push('/sign-up');
    }

    render() {
        return (
            <div className="d-flex flex-column flex-fill">
                <div className='homepage-top-height'>
                    <img alt='...' src={require('assets/img/png/homepage-logo.png')} className='homepage-top-left-img' />
                    <div className='homepage-top-button-group homepage-top-right'>
                        <Button className='bg-white tint-color border-tint homepage-button homepage-top-login-mr' onClick={this.onSignIn}>
                            <strong>Log In</strong>
                        </Button>
                        <Button className="bg-blue text-white border-0 homepage-button" onClick={this.onSignUp}>
                            <strong>Sign Up</strong>
                        </Button>
                    </div>
                    <img alt='...' className="homepage-top-right-img" src={require('assets/img/png/homepage-top-right-line.png')}/>
                </div>
                
                <Row style={{margin:0, padding: 0}}>
                    <Col xs="12" lg="6" md="6" className='homepage-title-left-padding'>
                        <label className='homepage-title-font1' style={{display:'inline'}}>The</label>&nbsp;&nbsp;
                        <label className='homepage-title-font1' style={{color: '#0087B4', display:'inline', fontWeight: 'bold', fontStyle: 'italic'}}>Ultimate</label><br/>
                        <label className='homepage-title-font2' style={{marginTop: -25}}>Amenity Scheduler</label><br/>
                        <Button className="bg-blue text-white border-0 homepage-button" onClick={this.onSignUp}>
                            <strong>Get Started</strong>
                        </Button>
                    </Col>
                    <Col xs="12" lg="6" md="6" className='homepage-calendar-img' style={{padding: 0}}>
                        <img alt='...' src={require('assets/img/png/homepage-calendar.png')} style={{width: '80%'}}/>
                    </Col>
                </Row>

                <img alt='...' src={require('assets/img/png/homepage-bottom-left.png')} className='welcome-bottom-left' />
            </div>
        )
    }
}

export default HomePage;
