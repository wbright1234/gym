import React from "react";
// react plugin used to create datetimepicker
import ReactDatetime from "react-datetime";
import moment from 'moment';

// reactstrap components
import {
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroup
} from "reactstrap";

class Datepicker extends React.Component {

  // disable past dates
  disablePastDt = current => {
    const yesterday = moment().subtract(1, 'day');
    return current.isAfter(yesterday);
  };

  render() {
    const { onDateChanged, value, disabled, className } = this.props;
    return (
      <FormGroup className={className}>
        <InputGroup>
          <InputGroupAddon addonType="prepend">
            <InputGroupText className={disabled ? 'bg-disabled' : 'bg-white'}>
              <img
                alt='...'
                src={require('assets/img/svg/calendar-grey.svg')}
                width={20}
                height={20}
                />
            </InputGroupText>
          </InputGroupAddon>
          <ReactDatetime
            timeFormat={false}
            dateFormat='YYYY-MM-DD'
            value={value}
            className='rdt-date-picker'
            isValidDate={this.disablePastDt}
            inputProps={{ disabled, placeholder: 'Select Booking Day' }}
            invalid
            onChange={e => {
              if (onDateChanged) {
                onDateChanged(e);
              }
            }
            }
          />
        </InputGroup>
      </FormGroup>
    );
  }
}

export default Datepicker;
