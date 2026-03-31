import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    Avatar,
    Button,
    CircularProgress,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    Snackbar,
    Alert,
    IconButton,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
    InputAdornment
} from '@mui/material';
import {
    Phone,
    RefreshCw,
    Users,
    Search,
    Grid as GridIcon,
    List,
    Trash2,
    Lock,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
    online: { color: '#4caf50', bg: '#e8f5e9', label: 'Online' },
    busy: { color: '#f44336', bg: '#ffebee', label: 'Busy' },
    break: { color: '#ff9800', bg: '#fff3e0', label: 'Break' },
    lunch: { color: '#ff9800', bg: '#fff3e0', label: 'Lunch' },
    prayer: { color: '#ff9800', bg: '#fff3e0', label: 'Prayer' },
    not_ready: { color: '#9e9e9e', bg: '#f5f5f5', label: 'Not Ready' },
    offline: { color: '#bdbdbd', bg: '#fafafa', label: 'Offline' },
};

const ManagerCard = ({ manager, canManageStatus, canDelete, onToggleActive, onResetPassword, onDelete, actionLoading }) => {
    const [timer, setTimer] = useState('00:00');
    const isPending = manager.isActive === false && !manager.lastLogin;
    const isActioning = actionLoading === manager.id;

    useEffect(() => {
        if (['break', 'lunch', 'prayer'].includes(manager.status) && manager.statusChangedAt) {
            const update = () => {
                const diff = Math.floor((Date.now() - new Date(manager.statusChangedAt).getTime()) / 1000);
                const m = Math.floor(diff / 60);
                const s = diff % 60;
                setTimer(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            };
            update();
            const interval = setInterval(update, 1000);
            return () => clearInterval(interval);
        }
    }, [manager.status, manager.statusChangedAt]);

    return (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        position: 'absolute', top: 20, right: 20,
                        width: 12, height: 12, borderRadius: '50%',
                        bgcolor: STATUS_CONFIG[manager.status]?.color || '#bdbdbd',
                        boxShadow: '0 0 0 4px #fff'
                    }}
                />
                {manager.isActive === false && (
                    <Chip
                        label={isPending ? 'Pending Approval' : 'Inactive'}
                        size="small"
                        sx={{
                            position: 'absolute', top: 12, left: 12,
                            bgcolor: isPending ? '#fff3e0' : '#ffebee',
                            color: isPending ? '#e65100' : '#f44336',
                            fontWeight: 600, fontSize: '0.7rem'
                        }}
                    />
                )}
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.light', color: 'primary.main', fontSize: 32, mb: 1 }} src={manager.profileImage}>
                    {manager.name?.[0] || 'M'}
                </Avatar>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>{manager.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{manager.email}</Typography>
                    <Typography variant="caption" color="text.disabled">
                        Joined: {manager.createdAt ? new Date(manager.createdAt).toLocaleDateString() : '--'}
                    </Typography>
                </Box>
                <Box sx={{ width: '100%', pt: 2 }}>
                    {['break', 'lunch', 'prayer'].includes(manager.status) ? (
                        <Button fullWidth variant="outlined" color="warning" sx={{ borderRadius: 3, py: 1 }}>
                            {STATUS_CONFIG[manager.status]?.label || 'Break'}: {timer}
                        </Button>
                    ) : (
                        <Button fullWidth variant="contained" sx={{
                            borderRadius: 3, py: 1, boxShadow: 'none',
                            bgcolor: manager.status === 'online' ? '#e8f5e9' : manager.status === 'busy' ? '#ffebee' : '#f5f5f5',
                            color: manager.status === 'online' ? '#4caf50' : manager.status === 'busy' ? '#f44336' : '#757575',
                            '&:hover': { bgcolor: manager.status === 'online' ? '#c8e6c9' : manager.status === 'busy' ? '#ffcdd2' : '#eeeeee' }
                        }}>
                            {manager.status === 'online' ? 'Active Now' : manager.status === 'busy' ? 'Busy' : STATUS_CONFIG[manager.status]?.label || 'Offline'}
                        </Button>
                    )}
                </Box>
                {/* Action buttons */}
                {(canManageStatus || canDelete) && (
                    <Box sx={{ display: 'flex', gap: 0.5, width: '100%', justifyContent: 'center', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        {isActioning ? (
                            <CircularProgress size={24} />
                        ) : (
                            <>
                                {canManageStatus && (
                                    <Tooltip title={manager.isActive !== false ? 'Deactivate' : (isPending ? 'Approve' : 'Activate')}>
                                        <IconButton size="small" onClick={() => onToggleActive(manager)} sx={{ color: manager.isActive !== false ? '#ff9800' : '#4caf50' }}>
                                            {manager.isActive !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Tooltip title="Reset Password">
                                    <IconButton size="small" onClick={() => onResetPassword(manager)} sx={{ color: '#1976d2' }}>
                                        <Lock size={18} />
                                    </IconButton>
                                </Tooltip>
                                {canDelete && (
                                    <Tooltip title="Delete">
                                        <IconButton size="small" onClick={() => onDelete(manager)} sx={{ color: '#f44336' }}>
                                            <Trash2 size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </>
                        )}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

const Managers = () => {
    const { user } = useAuth();
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ onlineManagers: 0, busyManagers: 0, activeCalls: 0 });
    const [viewMode, setViewMode] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    // Confirmation dialog
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', color: 'primary' });
    // Reset password dialog
    const [resetDialog, setResetDialog] = useState({ open: false, managerId: null, managerName: '', newPassword: '' });
    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const canManageStatus = ['super_admin', 'supervisor'].includes(user?.role);
    const canDelete = user?.role === 'super_admin';

    const fetchManagers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/managers');
            if (response.data?.success) {
                setManagers(response.data.data || []);
                setStats(response.data.stats || { onlineManagers: 0, busyManagers: 0, activeCalls: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch managers:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchManagers();
        const interval = setInterval(fetchManagers, 30000);
        return () => clearInterval(interval);
    }, [fetchManagers]);

    const handleToggleActive = (manager) => {
        const newStatus = !manager.isActive;
        const isPendingApproval = newStatus && !manager.lastLogin;
        const actionLabel = isPendingApproval ? 'Approve' : (newStatus ? 'Activate' : 'Deactivate');
        setConfirmDialog({
            open: true,
            title: `${actionLabel} Manager`,
            message: isPendingApproval
                ? `Approve ${manager.name} (${manager.email})? They will be able to log in and start taking calls.`
                : `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${manager.name} (${manager.email})?${!newStatus ? ' They will not be able to log in.' : ''}`,
            confirmText: actionLabel,
            color: newStatus ? 'success' : 'warning',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setActionLoading(manager.id);
                try {
                    await api.put(`/admin/managers/${manager.id}/status`, { isActive: newStatus });
                    setSnackbar({ open: true, message: `Manager ${newStatus ? 'activated' : 'deactivated'} successfully`, severity: 'success' });
                    fetchManagers();
                } catch (err) {
                    setSnackbar({ open: true, message: err.response?.data?.message || 'Action failed', severity: 'error' });
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleDelete = (manager) => {
        setConfirmDialog({
            open: true,
            title: 'Delete Manager',
            message: `Are you sure you want to permanently delete ${manager.name} (${manager.email})? This action cannot be undone.`,
            confirmText: 'Delete',
            color: 'error',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setActionLoading(manager.id);
                try {
                    await api.delete(`/admin/managers/${manager.id}`);
                    setSnackbar({ open: true, message: 'Manager deleted successfully', severity: 'success' });
                    fetchManagers();
                } catch (err) {
                    setSnackbar({ open: true, message: err.response?.data?.message || 'Delete failed', severity: 'error' });
                } finally {
                    setActionLoading(null);
                }
            }
        });
    };

    const handleResetPassword = async () => {
        if (!resetDialog.newPassword || resetDialog.newPassword.length < 8) {
            setSnackbar({ open: true, message: 'Password must be at least 8 characters', severity: 'error' });
            return;
        }
        setActionLoading(resetDialog.managerId);
        try {
            await api.put(`/admin/managers/${resetDialog.managerId}/reset-password`, { newPassword: resetDialog.newPassword });
            setSnackbar({ open: true, message: 'Password reset successfully', severity: 'success' });
            setResetDialog({ open: false, managerId: null, managerName: '', newPassword: '' });
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.message || 'Password reset failed', severity: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredManagers = managers.filter(m => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return m.name?.toLowerCase().includes(term) || m.email?.toLowerCase().includes(term);
    });

    return (
        <Box sx={{ display: 'flex', gap: 4 }}>
            {/* Main Content */}
            <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            Manager Management
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Manage manager accounts and access control
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            sx={{ minWidth: 200 }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>,
                            }}
                        />
                        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                            <ToggleButton value="table"><List size={18} /></ToggleButton>
                            <ToggleButton value="card"><GridIcon size={18} /></ToggleButton>
                        </ToggleButtonGroup>
                        <Button startIcon={<RefreshCw size={16} />} onClick={fetchManagers} sx={{ color: 'text.secondary' }}>
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {loading && managers.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Manager</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Live Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Last Login</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                                    {(canManageStatus || canDelete) && (
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredManagers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">No managers found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredManagers.map(mgr => {
                                        const statusConf = STATUS_CONFIG[mgr.status] || STATUS_CONFIG.offline;
                                        const isActioning = actionLoading === mgr.id;
                                        return (
                                            <TableRow key={mgr.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar src={mgr.profileImage} sx={{ width: 36, height: 36, bgcolor: '#e3f2fd', color: '#1976d2', fontSize: 14, fontWeight: 700 }}>
                                                            {mgr.name?.charAt(0)?.toUpperCase()}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={600}>{mgr.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{mgr.email}</Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const isPending = mgr.isActive === false && !mgr.lastLogin;
                                                        const isInactive = mgr.isActive === false && mgr.lastLogin;
                                                        return (
                                                            <Chip
                                                                label={isPending ? 'Pending Approval' : isInactive ? 'Inactive' : 'Active'}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: isPending ? '#fff3e0' : mgr.isActive !== false ? '#e8f5e9' : '#ffebee',
                                                                    color: isPending ? '#e65100' : mgr.isActive !== false ? '#4caf50' : '#f44336',
                                                                    fontWeight: 600, borderRadius: 1
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                    {mgr.lockedUntil && new Date(mgr.lockedUntil) > new Date() && (
                                                        <Chip label="Locked" size="small" sx={{ ml: 0.5, bgcolor: '#fff3e0', color: '#ff9800', fontWeight: 600, borderRadius: 1 }} />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={statusConf.label} size="small" sx={{ bgcolor: statusConf.bg, color: statusConf.color, fontWeight: 600, borderRadius: 1 }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {mgr.lastLogin ? new Date(mgr.lastLogin).toLocaleString() : 'Never'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {mgr.createdAt ? new Date(mgr.createdAt).toLocaleDateString() : '--'}
                                                    </Typography>
                                                </TableCell>
                                                {(canManageStatus || canDelete) && (
                                                    <TableCell align="right">
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                            {isActioning ? (
                                                                <CircularProgress size={24} />
                                                            ) : (
                                                                <>
                                                                    {canManageStatus && (
                                                                        <Tooltip title={mgr.isActive !== false ? 'Deactivate' : (mgr.lastLogin ? 'Activate' : 'Approve')}>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleToggleActive(mgr)}
                                                                                sx={{ color: mgr.isActive !== false ? '#ff9800' : '#4caf50' }}
                                                                            >
                                                                                {mgr.isActive !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                    <Tooltip title="Reset Password">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => setResetDialog({ open: true, managerId: mgr.id, managerName: mgr.name, newPassword: '' })}
                                                                            sx={{ color: '#1976d2' }}
                                                                        >
                                                                            <Lock size={18} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    {canDelete && (
                                                                        <Tooltip title="Delete Manager">
                                                                            <IconButton size="small" onClick={() => handleDelete(mgr)} sx={{ color: '#f44336' }}>
                                                                                <Trash2 size={18} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    /* Card View */
                    <Grid container spacing={3}>
                        {filteredManagers.map(manager => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={manager.id}>
                                <ManagerCard
                                    manager={manager}
                                    canManageStatus={canManageStatus}
                                    canDelete={canDelete}
                                    onToggleActive={handleToggleActive}
                                    onResetPassword={(mgr) => setResetDialog({ open: true, managerId: mgr.id, managerName: mgr.name, newPassword: '' })}
                                    onDelete={handleDelete}
                                    actionLoading={actionLoading}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Right Sidebar Stats */}
            <Box sx={{ width: 300, flexShrink: 0 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                    Overview
                </Typography>

                <Paper sx={{ p: 3, mb: 2, borderRadius: 4, bgcolor: '#0066FF', color: '#fff' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Active Calls</Typography>
                        <Phone size={20} color="white" />
                    </Box>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                        {String(stats.activeCalls || 0).padStart(2, '0')}
                    </Typography>
                </Paper>

                <Paper sx={{ p: 3, mb: 2, borderRadius: 4, bgcolor: '#fff', border: '1px solid', borderColor: 'divider' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>Online Managers</Typography>
                        <Box sx={{ p: 1, bgcolor: '#e8f5e9', borderRadius: 2, color: '#4caf50' }}>
                            <Users size={18} />
                        </Box>
                    </Box>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 1, color: 'text.primary' }}>
                        {String(stats.onlineManagers || 0).padStart(2, '0')}
                    </Typography>
                </Paper>

                <Paper sx={{ p: 3, mb: 2, borderRadius: 4, bgcolor: '#fff', border: '1px solid', borderColor: 'divider' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>Busy Managers</Typography>
                        <Box sx={{ p: 1, bgcolor: '#ffebee', borderRadius: 2, color: '#f44336' }}>
                            <Phone size={18} />
                        </Box>
                    </Box>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 1, color: 'text.primary' }}>
                        {String(stats.busyManagers || 0).padStart(2, '0')}
                    </Typography>
                </Paper>

                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#fff', border: '1px solid', borderColor: 'divider' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>Total Managers</Typography>
                        <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 2, color: '#1976d2' }}>
                            <Users size={18} />
                        </Box>
                    </Box>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 1, color: 'text.primary' }}>
                        {String(managers.length).padStart(2, '0')}
                    </Typography>
                </Paper>
            </Box>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                <DialogTitle sx={{ fontWeight: 700 }}>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmDialog.message}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={confirmDialog.onConfirm} variant="contained" color={confirmDialog.color}>
                        {confirmDialog.confirmText}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetDialog.open} onClose={() => setResetDialog(prev => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Reset Password</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Set a new password for {resetDialog.managerName}.
                    </DialogContentText>
                    <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        value={resetDialog.newPassword}
                        onChange={e => setResetDialog(prev => ({ ...prev, newPassword: e.target.value }))}
                        autoFocus
                        size="small"
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setResetDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button onClick={handleResetPassword} variant="contained" disabled={actionLoading === resetDialog.managerId}>
                        {actionLoading === resetDialog.managerId ? <CircularProgress size={20} /> : 'Reset Password'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Managers;
