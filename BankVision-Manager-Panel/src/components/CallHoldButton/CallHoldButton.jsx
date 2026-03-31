import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

const formatHoldTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const CallHoldButton = ({ isOnHold, onHold, onResume }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [holdTimer, setHoldTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (isOnHold) {
      setHoldTimer(0);
      interval = setInterval(() => {
        setHoldTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setHoldTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnHold]);

  const handleHoldClick = () => {
    setDialogOpen(true);
  };

  const handleConfirmHold = () => {
    onHold(reason);
    setDialogOpen(false);
    setReason('');
  };

  const handleResumeClick = () => {
    onResume();
  };

  if (isOnHold) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={<PauseCircleIcon />}
          label={`On Hold: ${formatHoldTime(holdTimer)}`}
          color="warning"
          sx={{
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 },
            },
          }}
        />
        <Button
          variant="contained"
          color="success"
          startIcon={<PlayCircleIcon />}
          onClick={handleResumeClick}
          sx={{ minWidth: 120 }}
        >
          Resume Call
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<PauseCircleIcon />}
        onClick={handleHoldClick}
        sx={{
          borderColor: 'warning.main',
          '&:hover': {
            backgroundColor: 'warning.light',
            borderColor: 'warning.dark',
          },
        }}
      >
        Hold Call
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PauseCircleIcon color="warning" />
            Put Call on Hold
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The customer will see a "Please hold" message while you handle other tasks.
          </Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            placeholder="e.g., Checking with supervisor..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmHold}
            variant="contained"
            color="warning"
            startIcon={<PauseCircleIcon />}
          >
            Put on Hold
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CallHoldButton;
