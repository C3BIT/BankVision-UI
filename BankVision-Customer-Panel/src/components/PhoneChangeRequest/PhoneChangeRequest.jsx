import React from 'react';
import PropTypes from 'prop-types';
import { CHANGE_REQUEST_CONFIG } from '../../config/changeRequestConfig';
import SimpleChangeRequest from '../common/SimpleChangeRequest';
import { verifyPhoneOtp } from '../../redux/auth/customerSlice';
import { updateCustomerPhone } from '../../redux/auth/customerInfoSlice';

const PhoneChangeRequest = ({ currentPhone, socket }) => (
    <SimpleChangeRequest
        config={CHANGE_REQUEST_CONFIG.phone}
        currentValue={currentPhone}
        socket={socket}
        verifyOtpThunk={verifyPhoneOtp}
        updateThunk={updateCustomerPhone}
    />
);

PhoneChangeRequest.propTypes = {
    currentPhone: PropTypes.string.isRequired,
    socket: PropTypes.object.isRequired,
};

export default PhoneChangeRequest;
