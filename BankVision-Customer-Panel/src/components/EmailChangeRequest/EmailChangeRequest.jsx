import React from 'react';
import PropTypes from 'prop-types';
import { CHANGE_REQUEST_CONFIG } from '../../config/changeRequestConfig';
import SimpleChangeRequest from '../common/SimpleChangeRequest';
import { verifyEmailOtp } from '../../redux/auth/customerSlice';
import { updateCustomerEmail } from '../../redux/auth/customerInfoSlice';

const EmailChangeRequest = ({ currentEmail, socket }) => (
    <SimpleChangeRequest
        config={CHANGE_REQUEST_CONFIG.email}
        currentValue={currentEmail}
        socket={socket}
        verifyOtpThunk={verifyEmailOtp}
        updateThunk={updateCustomerEmail}
    />
);

EmailChangeRequest.propTypes = {
    currentEmail: PropTypes.string,
    socket: PropTypes.object.isRequired,
};

export default EmailChangeRequest;
