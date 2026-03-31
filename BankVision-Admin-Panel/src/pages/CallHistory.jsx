import React, { useState, useEffect, useRef } from 'react';
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
    Button,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Search, RefreshCw } from 'lucide-react';
import api from '../services/api';

const POLL_INTERVAL_MS = 15000; // 15 seconds

const CallHistory = () => {
    const [callLogs, setCallLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [lastUpdated, setLastUpdated] = useState(null);
    const pollRef = useRef(null);
    const rowsPerPage = 10;

    const fetchCallLogs = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            else setRefreshing(true);

            const response = await api.get('/admin/call-logs');
            if (response.data?.success) {
                setCallLogs(response.data.data?.calls || []);
                setLastUpdated(new Date());
            } else {
                setCallLogs([]);
            }
        } catch (error) {
            console.error('Failed to fetch call logs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial fetch + 15s polling
    useEffect(() => {
        fetchCallLogs();

        pollRef.current = setInterval(() => {
            fetchCallLogs({ silent: true });
        }, POLL_INTERVAL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const handleManualRefresh = () => {
        fetchCallLogs({ silent: true });
    };

    const filteredLogs = callLogs.filter(log =>
        log.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.managerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.customerPhone?.includes(searchTerm)
    );

    const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
    const paginatedLogs = filteredLogs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const getStatusChip = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return <Chip label="Completed" size="small" sx={{ bgcolor: 'success.lighter', color: 'success.main', fontWeight: 600, borderRadius: 1 }} />;
            case 'accepted':
                return <Chip label="Active" size="small" sx={{ bgcolor: 'primary.lighter', color: 'primary.main', fontWeight: 600, borderRadius: 1 }} />;
            case 'initiated':
                return <Chip label="Pending" size="small" sx={{ bgcolor: 'warning.lighter', color: 'warning.dark', fontWeight: 600, borderRadius: 1 }} />;
            case 'missed':
                return <Chip label="Missed" size="small" sx={{ bgcolor: 'error.lighter', color: 'error.main', fontWeight: 600, borderRadius: 1 }} />;
            case 'cancelled':
                return <Chip label="Cancelled" size="small" sx={{ bgcolor: 'grey.200', color: 'text.secondary', fontWeight: 600, borderRadius: 1 }} />;
            case 'failed':
            case 'dropped':
                return <Chip label="Dropped" size="small" sx={{ bgcolor: 'error.lighter', color: 'error.main', fontWeight: 600, borderRadius: 1 }} />;
            default:
                return <Chip label={status || 'Unknown'} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary', fontWeight: 600, borderRadius: 1 }} />;
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Call History
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        View comprehensive logs of all video sessions
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {lastUpdated && (
                        <Typography variant="caption" color="text.secondary">
                            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Typography>
                    )}
                    <Tooltip title="Refresh now">
                        <IconButton
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            size="small"
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                                width: 36,
                                height: 36,
                            }}
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                <Search size={20} color="#999" style={{ marginRight: 10 }} />
                <TextField
                    fullWidth
                    placeholder="Search by customer name, phone, or manager..."
                    variant="standard"
                    InputProps={{ disableUnderline: true }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#F5F9FF' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Date &amp; Time</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Customer</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Phone</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Manager</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Duration</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Reference</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <CircularProgress size={30} />
                                </TableCell>
                            </TableRow>
                        ) : filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    No call logs found
                                </TableCell>
                            </TableRow>
                        ) : paginatedLogs.map((log) => (
                            <TableRow key={log.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {new Date(log.createdAt).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                        {log.customerName || 'Unknown'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {log.customerPhone || 'N/A'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                                            {log.managerName?.[0] || 'M'}
                                        </Avatar>
                                        <Typography variant="body2">{log.managerName || 'Unknown'}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {Math.floor((log.duration || 0) / 60)}m {(log.duration || 0) % 60}s
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {getStatusChip(log.status)}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                        {log.referenceNumber || `REF-${log.id.toString().substring(0, 6).toUpperCase()}`}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Component */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
                <Button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    sx={{ minWidth: 40, p: 1, borderRadius: 2 }}
                >
                    Prev
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                    <Button
                        key={i}
                        variant={page === i + 1 ? 'contained' : 'text'}
                        onClick={() => setPage(i + 1)}
                        sx={{
                            minWidth: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: 'none',
                            bgcolor: page === i + 1 ? 'primary.main' : 'transparent',
                            color: page === i + 1 ? 'white' : 'text.primary'
                        }}
                    >
                        {i + 1}
                    </Button>
                ))}
                <Button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    sx={{ minWidth: 40, p: 1, borderRadius: 2 }}
                >
                    Next
                </Button>
            </Box>
        </Box>
    );
};

export default CallHistory;
