import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';

const formatHoldTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const HoldScreen = ({ managerName, reason }) => {
  const [holdTimer, setHoldTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHoldTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
          maxWidth: 400,
          mx: 2,
          animation: 'fadeIn 0.3s ease-in',
          '@keyframes fadeIn': {
            '0%': { opacity: 0, transform: 'scale(0.9)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
          },
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'warning.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.05)', opacity: 0.8 },
            },
          }}
        >
          <PauseCircleIcon sx={{ fontSize: 48, color: 'warning.dark' }} />
        </Box>

        <Typography variant="h5" fontWeight={600} gutterBottom>
          Please Hold
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {managerName ? `${managerName} has put the call on hold.` : 'Your call is on hold.'}
          {reason && (
            <>
              <br />
              <strong>Reason:</strong> {reason}
            </>
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <CircularProgress size={24} color="warning" />
          <Typography variant="h6" color="warning.main" fontWeight={600}>
            {formatHoldTime(holdTimer)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Please wait, the agent will be with you shortly.
        </Typography>
      </Paper>
    </Box>
  );
};

export default HoldScreen;
