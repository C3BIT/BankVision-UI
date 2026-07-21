import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Grid,
    Button, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import api from '../services/api';
import { colors } from '../theme/tokens';

const STATUS_LABELS = {
    online: 'Online',
    busy: 'Busy',
    break: 'Break',
    lunch: 'Lunch',
    prayer: 'Prayer',
    not_ready: 'Not Ready',
    offline: 'Offline',
};

const STATUS_ORDER = ['online', 'busy', 'break', 'lunch', 'prayer', 'not_ready', 'offline'];

const formatHM = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const defaultDates = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

const ManagerActivityReport = () => {
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filterManager, setFilterManager] = useState('');
    const initial = defaultDates();
    const [filterStartDate, setFilterStartDate] = useState(initial.start);
    const [filterEndDate, setFilterEndDate] = useState(initial.end);
    const [appliedFilters, setAppliedFilters] = useState({ startDate: initial.start, endDate: initial.end });

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/admin/manager-activity-report', { params: appliedFilters });
            if (response.data.success) {
                setReport(response.data.data.report);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load activity report');
        } finally {
            setLoading(false);
        }
    }, [appliedFilters]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const handleApply = () => {
        const f = {};
        if (filterManager) f.managerEmail = filterManager;
        if (filterStartDate) f.startDate = filterStartDate;
        if (filterEndDate) f.endDate = filterEndDate;
        setAppliedFilters(f);
    };

    const handleClear = () => {
        const d = defaultDates();
        setFilterManager('');
        setFilterStartDate(d.start);
        setFilterEndDate(d.end);
        setAppliedFilters({ startDate: d.start, endDate: d.end });
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>VBRM Activity Report</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manager presence time and call-handling performance over the selected period
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <span>
                        <Button
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                            onClick={fetchReport}
                            disabled={loading}
                            size="small"
                        >
                            Refresh
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Manager Email"
                            value={filterManager}
                            onChange={(e) => setFilterManager(e.target.value)}
                            size="small"
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            label="From Date"
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            label="To Date"
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" onClick={handleApply} size="small" fullWidth>Apply</Button>
                        <Button variant="outlined" onClick={handleClear} size="small" fullWidth>Clear</Button>
                    </Grid>
                </Grid>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
                {!loading && (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: colors.background }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Manager</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Total Calls</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Completed</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Avg. Call Duration</TableCell>
                                    {STATUS_ORDER.map((s) => (
                                        <TableCell key={s} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{STATUS_LABELS[s]}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {report.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4 + STATUS_ORDER.length} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                            No activity recorded for this period
                                        </TableCell>
                                    </TableRow>
                                ) : report.map((row) => (
                                    <TableRow key={row.managerEmail} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {row.managerName || row.managerEmail}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {row.managerName ? row.managerEmail : ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{row.totalCalls}</TableCell>
                                        <TableCell>{row.completedCalls}</TableCell>
                                        <TableCell>{formatDuration(row.avgCallDurationSeconds)}</TableCell>
                                        {STATUS_ORDER.map((s) => (
                                            <TableCell key={s}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {formatHM(row.statusDurationSeconds?.[s])}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

export default ManagerActivityReport;
