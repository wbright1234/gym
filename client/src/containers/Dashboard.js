import React from 'react';
import Headerbar from 'components/Headerbar';
import MainMenus from 'components/MainMenus';
import FullCalendar from './FullCalendar';
import Registrations from './Registrations';
import Bookings from './Bookings';
import AddDoormen from './AddDoormen';
import Apartments from './Apartments';
import Setting from './Setting';
import Subscription from './Subscription';
import APIs from 'APIs';
import { Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { updateUser } from 'redux/user/actions';
import ls from 'local-storage';

const adminMenus = ['Calendar', 'Registrations', 'Bookings', 'Apartments', 'Doormen', 'Setting', 'Subscription'];
const doormenMenus = ['Calendar', 'Bookings'];

class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn: true,
      activeMenu: 'Calendar',
      isOpenPopover: false
    }
  }

  componentDidMount() {
    this.getUserInfo().then(userData => {
      this.props.updateUser(userData);
    }).catch(err => {
      this.setState({ isLoggedIn: false })
    });
  }

  getUserInfo = () => {
    return new Promise((res, rej) => {
      APIs.getUserInfo().then(resp => {
        res(resp.data.data);
      }).catch(err => {
        rej(err);
      })
    });
  }

  onSignout = () => {
    APIs.userSignout().then(resp => {
      if (resp.data.success) {
        ls.set('isLoggedIn', false);
        ls.set('lastLoggedInAt', null);
        ls.set('refreshToken', null);
        this.props.updateUser({
          id: 0,
          name: undefined,
          email: undefined,
          phoneNumber: undefined,
          aptNumber: undefined,
          role: undefined,
          confirmed: 0,
          createdAt: undefined
        });
        this.props.history.push('/sign-in');
      }
    }).catch(err => {
      console.log(err);
    });
  }

  render() {
    const { activeMenu, isLoggedIn, isOpenPopover } = this.state;
    const { user } = this.props;
    return (
      !isLoggedIn ? <Redirect to={{ pathname: 'sign-in' }}/> : <div className='d-flex flex-column flex-fill bg-secondary'>
        <Headerbar isOpenPopover={isOpenPopover}
          showPopover={() => this.setState({ isOpenPopover: true })}
          togglePopover={() => this.setState({ isOpenPopover: false })}
          onSignout={this.onSignout} />
        <MainMenus className='mt-3 mt-lg-5'
          onClick={() => this.setState({ isOpenPopover: false })}
          menus={(user && user.role === 'admin') ? adminMenus : doormenMenus}
          activeMenu={activeMenu}
          onChangeMenu={(menu) => this.setState({ activeMenu: menu })} />
        <div onClick={() => this.setState({ isOpenPopover: false })}>
          {
            activeMenu === 'Calendar' &&
            <FullCalendar />
          }
          {
            activeMenu === 'Registrations' &&
            <Registrations />
           }
           {
             activeMenu === 'Bookings' &&
             <Bookings />
           }
           {
             activeMenu === 'Apartments' &&
             <Apartments />
           }
           {
             activeMenu === 'Doormen' &&
             <AddDoormen />
           }
           {
             activeMenu === 'Setting' &&
             <Setting />
           }
           {
             activeMenu === 'Subscription' &&
             <Subscription />
           }
         </div>
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

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
