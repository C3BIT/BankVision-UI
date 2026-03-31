import React from 'react';
import { Box, Toolbar } from '@mui/material';
import BankLogo  from '../../assets/icon/bank-logo.svg';

const Navbar = () => {
  return (
    <Box
      component="header"
      sx={{
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '100vw',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        overflowX: 'hidden',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%',
          height: { xs: 60, sm: 80 },
        }}
      >
        <Box
          component="img"
          src={BankLogo }
          alt="Company Logo"
          sx={{
            height: 'auto',
            maxHeight: { xs: 40, sm: 50 },
            width: 'auto',
            maxWidth: '90%',
            objectFit: 'contain',
          }}
        />
      </Toolbar>
    </Box>
  );
};
export default Navbar;