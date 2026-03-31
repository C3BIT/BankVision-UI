import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { toast } from 'react-toastify';
import api from '../services/api';

const Managers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetDialog, setResetDialog] = useState({ open: false, manager: null });
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/managers');
      if (response.data.success) {
        setManagers(response.data.data);
      }
    } catch (err) {
      toast.error('Failed to load managers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setResetting(true);
    try {
      await api.put(`/admin/managers/${resetDialog.manager.id}/reset-password`, {
        newPassword,
      });
      toast.success('Password reset successfully');
      setResetDialog({ open: false, manager: null });
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Managers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage VBRM agents and their accounts
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchManagers}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Manager</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {managers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No managers found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  managers.map((manager) => (
                    <TableRow key={manager.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={manager.profileImage}>
                            {manager.name?.charAt(0)}
                          </Avatar>
                          <Typography fontWeight={500}>{manager.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{formatDate(manager.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Reset Password">
                          <IconButton
                            color="primary"
                            onClick={() => setResetDialog({ open: true, manager })}
                          >
                            <LockResetIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetDialog.open}
        onClose={() => setResetDialog({ open: false, manager: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set a new password for <strong>{resetDialog.manager?.name}</strong>
          </Typography>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setResetDialog({ open: false, manager: null });
              setNewPassword('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={resetting}
          >
            {resetting ? <CircularProgress size={20} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Managers;
