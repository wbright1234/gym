import React from "react";
import PropTypes from "prop-types";
import moment from "moment";
import TimePicker from "rc-time-picker";
import "rc-time-picker/assets/index.css";

const SlotTimePicker = ({ className, onChange, value, ...rest }) => (
  <TimePicker
    {...rest}
    className={className}
    popupClassName={className}
    showSecond={false}
    onChange={onChange}
    hideDisabledOptions
    minuteStep={15}
    value={value}
    use12Hours
    disabledHours={() => [0, 1, 2, 3, 4, 5, 6, 7, 22, 23]}
    allowEmpty={false}
    inputReadOnly
  />
);

SlotTimePicker.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.instanceOf(moment)
};

export default SlotTimePicker;
