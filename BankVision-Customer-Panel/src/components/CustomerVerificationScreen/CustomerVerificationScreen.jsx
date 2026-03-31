import React, { useState, useEffect } from 'react';
import { Container } from '@mui/material';
import PropTypes from 'prop-types';
import PhoneVerificationScreen from '../PhoneVerificationScreen/PhoneVerificationScreen';
import EmailVerificationScreen from '../EmailVerificationScreen/EmailVerificationScreen';
import PhoneChangeRequest from '../PhoneChangeRequest/PhoneChangeRequest';
import EmailChangeRequest from '../EmailChangeRequest/EmailChangeRequest';
import AddressChangeRequest from '../AddressChangeRequest/AddressChangeRequest';
import WelcomeScreen from '../common/WelcomeScreen';
import CaptureCustomerImage from './../CaptureCustomerImage/CaptureCustomerImage';

const CustomerVerificationScreen = ({
  callTarget = {},
  verificationRequests = {},
  changeRequests = {},
  confirmPhoneVerification,
  confirmEmailVerification,
  acknowledgePhoneChangeRequest,
  customerPhone = '',
  socket,
  currentAccountData = null
}) => {
  const [verificationStatus, setVerificationStatus] = useState({
    phone: false,
    email: false,
    face: false
  });

  useEffect(() => {
    setVerificationStatus({
      phone: false,
      email: false,
      face: false
    });
  }, [verificationRequests]);

  const getCurrentScreen = () => {

    if (changeRequests.phoneChangeRequested) {
      return (
        <PhoneChangeRequest
          currentPhone={currentAccountData?.mobileNumber || customerPhone}
          onAcknowledge={acknowledgePhoneChangeRequest}
          socket={socket}
        />
      );
    }

    if (changeRequests.emailChangeRequested) {
      return (
        <EmailChangeRequest
          currentEmail={currentAccountData?.email || callTarget?.email}
          socket={socket}
        />
      );
    }

    if (changeRequests.addressChangeRequested) {
      return (
        <AddressChangeRequest
          currentAddress={currentAccountData?.address || callTarget?.address}
          socket={socket}
        />
      );
    }

    if (verificationRequests.phone) {
      return (
        <PhoneVerificationScreen 
          customerPhone={customerPhone}
          confirmPhoneVerification={confirmPhoneVerification}
          verificationStatus={verificationStatus}
          setVerificationStatus={setVerificationStatus}
        />
      );
    }
    if (verificationRequests.face) {
      return (
        <CaptureCustomerImage 
          customerPhone={customerPhone}
          confirmPhoneVerification={confirmPhoneVerification}
          verificationStatus={verificationStatus}
          setVerificationStatus={setVerificationStatus}
        />
      );
    }

    if (verificationRequests.email) {
      return (
        <EmailVerificationScreen
          confirmEmailVerification={confirmEmailVerification}
          verificationStatus={verificationStatus}
          setVerificationStatus={setVerificationStatus}
        />
      );
    }

    return <WelcomeScreen callTarget={callTarget} />;
  };

  return (
    <Container
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: { xs: '12px', sm: '16px', md: '24px' },
        background: '#CEC1DF',
        borderRadius: '16px',
        overflow: 'auto',
        minHeight: '300px',
        border:'1px solid white'
      }}
      maxWidth="sm"
    >
      {getCurrentScreen()}
    </Container>
  );
};

CustomerVerificationScreen.propTypes = {
  callTarget: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    image: PropTypes.string,
    room: PropTypes.string,
    id: PropTypes.string
  }),
  verificationRequests: PropTypes.shape({
    phone: PropTypes.bool,
    email: PropTypes.bool,
    face: PropTypes.bool
  }),
  changeRequests: PropTypes.shape({
    phoneChangeRequested: PropTypes.bool,
    emailChangeRequested: PropTypes.bool,
    addressChangeRequested: PropTypes.bool
  }),
  confirmPhoneVerification: PropTypes.func,
  confirmEmailVerification: PropTypes.func,
  acknowledgePhoneChangeRequest: PropTypes.func,
  customerPhone: PropTypes.string,
  currentAccountData: PropTypes.shape({
    accountNumber: PropTypes.string,
    email: PropTypes.string,
    mobileNumber: PropTypes.string,
    name: PropTypes.string,
    address: PropTypes.string,
    branch: PropTypes.string
  })
};

CustomerVerificationScreen.defaultProps = {
  callTarget: {},
  verificationRequests: {},
  changeRequests: {},
  customerPhone: '',
  currentAccountData: null
};

export default CustomerVerificationScreen;