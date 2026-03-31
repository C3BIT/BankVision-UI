import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PropTypes from 'prop-types';

const VerificationSuccess = ({ type }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: 3
  }}>
    <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
    <Typography variant="h5" sx={{ mb: 2 }}>
      {type === 'phone' ? 'Phone' : 'Email'} Verification Successful
    </Typography>
    <Typography variant="body1">
      Your {type} has been successfully verified. Thank you!
    </Typography>
  </Box>
);

VerificationSuccess.propTypes = {
  type: PropTypes.oneOf(['phone', 'email']).isRequired
};

export default VerificationSuccess;