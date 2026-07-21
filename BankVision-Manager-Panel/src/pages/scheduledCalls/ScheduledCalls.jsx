import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Add as AddIcon, Event as EventIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { privateGet, privatePost, privatePatch } from '../../services/apiCaller';
import { colors } from '../../styles/tokens';

const emptyForm = {
  customerPhone: '',
  customerName: '',
  accountNumber: '',
  scheduledAt: '',
  notes: '',
};

const statusStyle = (status) => {
  switch (status) {
    case 'notified':
      return { bg: '#FFF4E5', color: colors.warning, label: 'Due' };
    case 'completed':
      return { bg: '#E5F7E5', color: colors.success, label: 'Completed' };
    case 'cancelled':
      return { bg: '#F5F5F5', color: colors.textMuted, label: 'Cancelled' };
    default:
      return { bg: '#E3F2FD', color: colors.primary, label: 'Scheduled' };
  }
};

const ScheduledCalls = () => {
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadScheduledCalls = useCallback(async () => {
    setLoading(true);
    try {
      const response = await privateGet('/scheduled-calls', undefined);
      setScheduledCalls(response?.data || []);
    } catch (error) {
      console.error('Failed to load scheduled calls:', error);
      toast.error('Failed to load scheduled calls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScheduledCalls();
  }, [loadScheduledCalls]);

  const handleCreate = async () => {
    if (!form.customerPhone || !form.scheduledAt) {
      toast.error('Customer phone and scheduled time are required');
      return;
    }

    setSaving(true);
    try {
      await privatePost('/scheduled-calls', undefined, {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      toast.success('Call scheduled successfully');
      setModalOpen(false);
      setForm(emptyForm);
      loadScheduledCalls();
    } catch (error) {
      console.error('Failed to schedule call:', error);
      toast.error(error?.response?.data?.message || 'Failed to schedule call');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await privatePatch(`/scheduled-calls/${id}/cancel`, undefined);
      toast.info('Scheduled call cancelled');
      loadScheduledCalls();
    } catch (error) {
      console.error('Failed to cancel scheduled call:', error);
      toast.error('Failed to cancel scheduled call');
    }
  };

  const handleComplete = async (id) => {
    try {
      await privatePatch(`/scheduled-calls/${id}/complete`, undefined);
      toast.success('Marked as completed');
      loadScheduledCalls();
    } catch (error) {
      console.error('Failed to complete scheduled call:', error);
      toast.error('Failed to update scheduled call');
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: colors.textPrimary }}>
          Scheduled Calls
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
          sx={{
            backgroundColor: colors.primary,
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            '&:hover': { backgroundColor: colors.primaryDark },
          }}
        >
          Schedule Call
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 300, alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : scheduledCalls.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: '#FAFAFA', borderRadius: 2 }}>
          <EventIcon sx={{ fontSize: 40, color: colors.textMuted, mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No scheduled calls
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Schedule a callback for a customer to see it here.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: `1px solid ${colors.border}`, borderRadius: 2, overflow: 'hidden' }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: colors.background }}>
                <TableCell sx={{ fontWeight: 600, color: colors.textSecondary }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600, color: colors.textSecondary }}>Scheduled For</TableCell>
                <TableCell sx={{ fontWeight: 600, color: colors.textSecondary }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 600, color: colors.textSecondary }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: colors.textSecondary, textAlign: 'right' }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scheduledCalls.map((call) => {
                const status = statusStyle(call.status);
                const isActionable = call.status === 'pending' || call.status === 'notified';
                return (
                  <TableRow key={call.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>{call.customerPhone}</Typography>
                      {call.customerName && (
                        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                          {call.customerName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(call.scheduledAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        {call.notes || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status.label}
                        size="small"
                        sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isActionable && (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            onClick={() => handleComplete(call.id)}
                            sx={{ textTransform: 'none', color: colors.success }}
                          >
                            Mark Called
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleCancel(call.id)}
                            sx={{ textTransform: 'none', color: colors.error }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule a Call</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Customer Phone"
            required
            fullWidth
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
          />
          <TextField
            label="Customer Name (optional)"
            fullWidth
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
          <TextField
            label="Account Number (optional)"
            fullWidth
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          />
          <TextField
            label="Scheduled Date & Time"
            type="datetime-local"
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          />
          <TextField
            label="Notes (optional)"
            fullWidth
            multiline
            minRows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving}
            sx={{
              backgroundColor: colors.primary,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: colors.primaryDark },
            }}
          >
            {saving ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduledCalls;
