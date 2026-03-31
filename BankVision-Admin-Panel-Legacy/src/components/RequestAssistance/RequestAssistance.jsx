import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CloseIcon from '@mui/icons-material/Close';

const RequestAssistance = ({
  onRequestAssistance,
  onCancelAssistance,
  assistanceStatus,
  assistanceResponse,
  isLoading,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urgency, setUrgency] = useState('normal');
  const [reason, setReason] = useState('');

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setReason('');
    setUrgency('normal');
  };

  const handleSubmit = () => {
    onRequestAssistance({ urgency, reason });
    handleCloseDialog();
  };

  const handleCancel = () => {
    onCancelAssistance();
  };

  const getStatusColor = () => {
    switch (assistanceStatus) {
      case 'pending':
        return 'warning';
      case 'responded':
        return 'success';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (assistanceStatus) {
      case 'pending':
        return 'Waiting for supervisor...';
      case 'responded':
        return 'Supervisor responded';
      default:
        return null;
    }
  };

  // Show status when assistance is active
  if (assistanceStatus === 'pending' || assistanceStatus === 'responded') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {assistanceStatus === 'pending' && (
            <CircularProgress size={16} color="warning" />
          )}
          <Chip
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
            icon={assistanceStatus === 'responded' ? <SupportAgentIcon /> : undefined}
          />
          {assistanceStatus === 'pending' && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={handleCancel}
              startIcon={<CloseIcon />}
            >
              Cancel
            </Button>
          )}
        </Box>
        {assistanceResponse && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            <Typography variant="body2">
              <strong>{assistanceResponse.supervisorName}</strong>: {assistanceResponse.response}
            </Typography>
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<SupportAgentIcon />}
        onClick={handleOpenDialog}
        disabled={isLoading}
        sx={{
          borderColor: 'warning.main',
          '&:hover': {
            backgroundColor: 'warning.main',
            color: 'white',
          },
        }}
      >
        Request Assistance
      </Button>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SupportAgentIcon color="warning" />
          Request Supervisor Assistance
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Request help from a supervisor. They will be notified immediately.
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Urgency Level</InputLabel>
            <Select
              value={urgency}
              label="Urgency Level"
              onChange={(e) => setUrgency(e.target.value)}
            >
              <MenuItem value="low">Low - General question</MenuItem>
              <MenuItem value="normal">Normal - Need guidance</MenuItem>
              <MenuItem value="high">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PriorityHighIcon color="error" fontSize="small" />
                  High - Urgent assistance needed
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for assistance (optional)"
            placeholder="Describe why you need help..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="warning"
            startIcon={<SupportAgentIcon />}
          >
            Request Assistance
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RequestAssistance;
