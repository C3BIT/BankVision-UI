import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Fade
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { logout } from '../../redux/auth/authSlice';
import { persistor } from '../../redux/store';
import { useWebSocket } from '../../providers/WebSocketProvider';
import api from '../../services/api';
import BankLogo from '../../assets/icon/bank-logo.svg';

const AppLayout = ({ children }) => {
  const dispatch = useDispatch();
  const { socket } = useWebSocket();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    setLoading(true);

    try {
      // 1. Call backend logout API to invalidate session server-side
      try {
        await api.post('/manager/logout');
        console.log('✅ Backend session invalidated');
      } catch (apiError) {
        console.error('⚠️ Logout API call failed (continuing with client cleanup):', apiError);
        // Continue with client-side cleanup even if API fails
      }

      // 2. Disconnect WebSocket to prevent reconnection
      if (socket && socket.connected) {
        console.log('🔌 Disconnecting WebSocket');
        socket.disconnect();
      }

      // 3. Dispatch logout action (clears Redux state)
      dispatch(logout());

      // 4. Clear persisted Redux state from localStorage
      await persistor.purge();

      // 5. Clear all auth-related storage manually (covers both persist and fallback)
      localStorage.removeItem('token');
      localStorage.removeItem('persist:authentication');
      sessionStorage.removeItem('auth_redirecting');
      sessionStorage.clear();

      console.log('✅ All auth data cleared');

      // Small delay to ensure all cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // 6. Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force cleanup and redirect even if error occurs
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

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
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
      }}>
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: 'white',
            px: 2,
            py: 1,
          }}
        >
          <Toolbar>
            <Box
              component="img"
              src={BankLogo}
              alt="Bank Logo"
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                height: '40px',
                width: 'auto',

              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              onClick={onLogout}
              startIcon={<LogoutIcon />}
              disabled={loading}
              sx={{
                color: 'grey.600',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Toolbar />

        <Box component="main" sx={{ flexGrow: 1, pb: 4, pt: 4, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </>
  );
};

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppLayout;