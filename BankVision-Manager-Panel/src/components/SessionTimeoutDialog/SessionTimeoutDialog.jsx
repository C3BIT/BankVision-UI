import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LogoutIcon from '@mui/icons-material/Logout';

const formatTime = (ms) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SessionTimeoutDialog = ({ open, remainingTime, onExtend, onLogout }) => {
  const progress = (remainingTime / (5 * 60 * 1000)) * 100;

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 48, color: 'warning.main' }} />
        </Box>
        <Typography variant="h6" fontWeight={600}>
          Session Timeout Warning
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your session will expire due to inactivity.
        </Typography>

        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={100}
            thickness={4}
            sx={{
              color: progress > 30 ? 'warning.main' : 'error.main',
              transition: 'color 0.3s ease',
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="h5"
              fontWeight={700}
              color={progress > 30 ? 'warning.main' : 'error.main'}
            >
              {formatTime(remainingTime)}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Click "Stay Logged In" to continue your session
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
        >
          Log Out
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onExtend}
          sx={{
            background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
              opacity: 0.9,
            },
          }}
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutDialog;
