import React from 'react';
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const WelcomeScreen = ({ callTarget }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 3
  }}>
    <Typography variant="h4" sx={{ mb: 2 }}>
      Thank you for calling
    </Typography>
    <Typography variant="body1" sx={{ mb: 4 }}>
      You are connected with {callTarget?.name || "our representative"}.
      They will assist you shortly.
    </Typography>
  </Box>
);

WelcomeScreen.propTypes = {
  callTarget: PropTypes.shape({
    name: PropTypes.string,
    image: PropTypes.string,
    room: PropTypes.string,
    id: PropTypes.string
  })
};

export default WelcomeScreen;