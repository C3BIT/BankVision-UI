import React, { useState, useEffect, useCallback } from 'react';
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
    Chip,
    CircularProgress,
    TextField,
    Avatar,
    Card,
    CardContent,
    Grid,
    InputAdornment
} from '@mui/material';
import {
    People as PeopleIcon,
    CheckCircle as OnlineIcon,
    PhoneInTalk as BusyIcon,
    Coffee as BreakIconMui,
    CloudOff as OfflineIcon,
    Phone as PhoneIcon,
    AccessTime as ClockIcon
} from '@mui/icons-material';
import { Search, Coffee } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const STATUS_CONFIG = {
    online: { color: '#4caf50', bg: '#e8f5e9', label: 'Online' },
    busy: { color: '#f44336', bg: '#ffebee', label: 'Busy' },
    break: { color: '#ff9800', bg: '#fff3e0', label: 'Break' },
    lunch: { color: '#ff9800', bg: '#fff3e0', label: 'Lunch' },
    prayer: { color: '#ff9800', bg: '#fff3e0', label: 'Prayer' },
    not_ready: { color: '#9e9e9e', bg: '#f5f5f5', label: 'Not Ready' },
    offline: { color: '#bdbdbd', bg: '#fafafa', label: 'Offline' },
};

const ACTIVITY_LABELS = {
    'in-call': 'In Call',
    'idle': 'Idle',
    'on-break': 'On Break',
    'offline': 'Offline',
};

const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'online', label: 'Online' },
    { value: 'busy', label: 'Busy' },
    { value: 'break', label: 'On Break' },
    { value: 'offline', label: 'Offline' },
];

const CallTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState('00:00');

    useEffect(() => {
        if (!startTime) return;
        const update = () => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(diff / 60);
            const secs = diff % 60;
            setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [startTime]);

    return (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#f44336' }}>
            {elapsed}
        </Typography>
    );
};

const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};

const timeAgo = (timestamp) => {
    if (!timestamp) return '--';
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const SummaryCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <Box sx={{
                width: 48, height: 48, borderRadius: '50%',
                backgroundColor: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: color, flexShrink: 0
            }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {title}
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color }}>
                    {value}
                </Typography>
            </Box>
        </CardContent>
    </Card>
);

const AgentMonitor = () => {
    const [managers, setManagers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const { socket } = useSocket();

    const fetchData = useCallback(async () => {
        try {
            const response = await api.get('/admin/agent-monitor');
            if (response.data?.success) {
                setManagers(response.data.data.managers || []);
                setSummary(response.data.data.summary || null);
            }
        } catch (error) {
            console.error('Failed to fetch agent monitor data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Real-time status updates via socket — re-fetch immediately on any status change
    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdate = () => {
            fetchData();
        };

        socket.on('managers:status', handleStatusUpdate);
        socket.on('manager:list', handleStatusUpdate);

        return () => {
            socket.off('managers:status', handleStatusUpdate);
            socket.off('manager:list', handleStatusUpdate);
        };
    }, [socket, fetchData]);

    const filteredManagers = managers.filter(m => {
        // Status filter
        if (statusFilter === 'online' && m.status !== 'online') return false;
        if (statusFilter === 'busy' && m.status !== 'busy') return false;
        if (statusFilter === 'break' && !['break', 'lunch', 'prayer'].includes(m.status)) return false;
        if (statusFilter === 'offline' && !['offline', 'not_ready'].includes(m.status)) return false;

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                m.name?.toLowerCase().includes(term) ||
                m.email?.toLowerCase().includes(term)
            );
        }
        return true;
    });

    if (loading && managers.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Agent Monitor
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Real-time view of manager activity and performance
                </Typography>
            </Box>

            {/* Summary Cards */}
            {summary && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6, md: 2.4 }}>
                        <SummaryCard title="Total Agents" value={summary.total} icon={<PeopleIcon />} color="#1976d2" />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2.4 }}>
                        <SummaryCard title="Online" value={summary.online} icon={<OnlineIcon />} color="#4caf50" />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2.4 }}>
                        <SummaryCard title="In Call" value={summary.inCall} icon={<PhoneIcon />} color="#f44336" />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2.4 }}>
                        <SummaryCard title="On Break" value={(summary.break || 0) + (summary.lunch || 0) + (summary.prayer || 0)} icon={<Coffee size={24} />} color="#ff9800" />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2.4 }}>
                        <SummaryCard title="Offline" value={summary.offline + (summary.not_ready || 0)} icon={<OfflineIcon />} color="#9e9e9e" />
                    </Grid>
                </Grid>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {FILTER_OPTIONS.map(opt => (
                        <Chip
                            key={opt.value}
                            label={opt.label}
                            onClick={() => setStatusFilter(opt.value)}
                            variant={statusFilter === opt.value ? 'filled' : 'outlined'}
                            color={statusFilter === opt.value ? 'primary' : 'default'}
                            sx={{ fontWeight: 600 }}
                        />
                    ))}
                </Box>
                <TextField
                    size="small"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    sx={{ ml: 'auto', minWidth: 250 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={18} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* Agent Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Current Call</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Calls Today</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Avg Handle Time</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Last Status Change</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredManagers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">
                                        {searchTerm || statusFilter !== 'all' ? 'No agents match the current filters.' : 'No agents found.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredManagers.map(mgr => {
                                const statusConf = STATUS_CONFIG[mgr.status] || STATUS_CONFIG.offline;
                                return (
                                    <TableRow key={mgr.id} hover>
                                        {/* Agent */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar
                                                    src={mgr.profileImage}
                                                    sx={{ width: 36, height: 36, bgcolor: '#e3f2fd', color: '#1976d2', fontSize: 14, fontWeight: 700 }}
                                                >
                                                    {mgr.name?.charAt(0)?.toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>{mgr.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{mgr.email}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <Chip
                                                label={statusConf.label}
                                                size="small"
                                                sx={{
                                                    bgcolor: statusConf.bg,
                                                    color: statusConf.color,
                                                    fontWeight: 600,
                                                    borderRadius: 1
                                                }}
                                            />
                                        </TableCell>

                                        {/* Activity */}
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={mgr.currentActivity === 'in-call' ? 700 : 400}>
                                                {ACTIVITY_LABELS[mgr.currentActivity] || mgr.currentActivity}
                                            </Typography>
                                        </TableCell>

                                        {/* Current Call */}
                                        <TableCell>
                                            {mgr.activeCall ? (
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {mgr.activeCall.customerName || 'Unknown'}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {mgr.activeCall.customerPhone}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">|</Typography>
                                                        <CallTimer startTime={mgr.activeCall.startTime} />
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">--</Typography>
                                            )}
                                        </TableCell>

                                        {/* Calls Today */}
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={600}>
                                                {mgr.callsHandledToday}
                                            </Typography>
                                        </TableCell>

                                        {/* Avg Handle Time */}
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatDuration(mgr.avgHandleTime)}
                                            </Typography>
                                        </TableCell>

                                        {/* Last Status Change */}
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {timeAgo(mgr.statusChangedAt)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AgentMonitor;
