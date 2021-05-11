import React from 'react';
import { Popover } from 'reactstrap';
import Button from 'reactstrap-button-loader';
import { connect } from 'react-redux';
import _ from 'lodash';

class Headerbar extends React.Component {
  render() {
    const { isOpenPopover, showPopover, togglePopover, onSignout } = this.props;
    return (
      <div className='d-flex justify-content-between bg-white px-3 py-2'>
        <div className='d-flex flex-column align-items-center'>
        <img alt='...' src={require('assets/img/png/homepage-logo.png')} width={200} />
        </div>
        <div id='userAvatar'
          className='d-flex align-items-center'
          style={{ cursor: 'pointer' }}
          onClick={showPopover}>
          <img alt='...' src={require('assets/img/svg/avatar.svg')} width={30} height={30} />
          <div className='d-flex flex-column ml-2'>
            <small><strong>{this.props.user.name}</strong></small>
            <small>{_.upperFirst(this.props.user.role)}</small>
          </div>
        </div>
        <Popover
          placement="bottom" isOpen={isOpenPopover} target='userAvatar' toggle={togglePopover}>
          <Button className='bg-secondary border-0 blue-tint' onClick={onSignout}><strong>Sign Out</strong></Button>
        </Popover>
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  user: state.user
});

export default connect(mapStateToProps)(Headerbar);
