import React from 'react';
import { Row, Col } from 'reactstrap';
import _ from 'lodash';

export default class FullCalendarItem extends React.Component {
  render() {
    const { date, day, className, onClickItem, bookingsInDay } = this.props;
    return (
      <Col className={'d-flex flex-column ' + className} xl='2' lg='3' md='4' sm='6' xs='6'>
        <h6>{date} <small>({day})</small></h6>
        <Row className='mx-0'>
          {
            _.times(24, (id) => (
              <Col key={`${id}`}
                xs='auto'
                className='p-0 cursor-pointer'
                onClick={() => onClickItem(id)}>
                <div className='border m-1'
                  style={{
                    width: 25,
                    height: 25,
                    backgroundColor: bookingsInDay[id] ? bookingsInDay[id].aptColorHex: '#FFFFFF'
                  }} />
              </Col>
            ))
          }
        </Row>
      </Col>
    )
  }
}
