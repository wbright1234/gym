import React from 'react';
import {
  NavbarToggler,
  Navbar,
  NavItem,
  Nav,
  Collapse
} from 'reactstrap'
import _ from 'lodash';

export default class MainMenus extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    }
  }
  render() {
    const { isOpen } = this.state;
    const { menus, className, activeMenu, onChangeMenu, onClick } = this.props;
    return (
      <Navbar
        onClick={onClick}
        className={'justify-content-start px-0 ' + className}
        expand='lg'>
        <NavbarToggler className='ml-auto mr-0 mr-lg-5' onClick={() => this.setState({ isOpen: !this.state.isOpen })} />
        <Collapse isOpen={isOpen} navbar>
          <Nav navbar className='mx-4 mx-sm-0'>
          {
            _.map(menus, (menu, index) => (
              <NavItem
                key={menu}
                tag='button'
                className={'mx-2 mx-lg-4 mt-3 mt-lg-0 border-0 rounded px-3 py-2 ' + (activeMenu === menu ? 'bg-blue text-white' : 'bg-transparent text-darkgray')}
                onClick={() => {
                  this.setState({ isOpen: false });
                  onChangeMenu(menu);
                }}>
                <h5 className='mb-0'><strong>{menu}</strong></h5>
              </NavItem>
            ))
          }
          </Nav>
        </Collapse>
      </Navbar>
    )
  }
}
