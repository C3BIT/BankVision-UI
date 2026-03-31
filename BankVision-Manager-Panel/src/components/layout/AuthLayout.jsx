import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  Fade,
  Container,
  Typography
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PropTypes from 'prop-types';
import BankLogo from '../../assets/icon/bank-logo.svg';

const AuthLayout = ({ title, subtitle, children }) => {
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Fade in={loading}>
        <Box
          sx={{
            position: 'fixed',
            zIndex: 2000,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(255, 255, 255, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box textAlign="center">
            <CircularProgress size={48} />
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Logging out...
            </Typography>
          </Box>
        </Box>
      </Fade>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
      }}>
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: 'white',
            px: 2,
            py: 1
          }}
        >
          <Toolbar sx={{ py: 1 }}>
            <Box
              component="img"
              src={BankLogo}
              alt="Bank Logo"
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                height: '50px',
                width: 'auto',
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
        </AppBar>

        <Toolbar />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Container
            maxWidth="xs"
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 4,
              boxShadow: 3
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom align="center">
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ mb: 3 }}
                align="center"
              >
                {subtitle}
              </Typography>
            )}
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
};

AuthLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default AuthLayout;