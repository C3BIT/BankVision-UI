import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Chip, TextField, Grid,
    Button, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import api from '../services/api';
import { colors } from '../theme/tokens';

const SERVICE_LABELS = {
    kyc_verification: 'KYC / Identity Verification',
    phone_change: 'Phone Number Change',
    email_change: 'Email Change',
    address_change: 'Address Change',
    dormant_activation: 'Dormant Account Activation',
    general_inquiry: 'General Inquiry',
    complaint: 'Complaint',
    document_request: 'Document Request',
    other: 'Other',
};

const SERVICE_COLORS = {
    kyc_verification: 'primary',
    phone_change: 'secondary',
    email_change: 'info',
    address_change: 'warning',
    dormant_activation: 'error',
    general_inquiry: 'default',
    complaint: 'error',
    document_request: 'default',
    other: 'default',
};

const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [filterManager, setFilterManager] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                limit: rowsPerPage,
                offset: page * rowsPerPage,
                ...appliedFilters,
            };
            const response = await api.get('/call-reports', { params });
            if (response.data.success) {
                setReports(response.data.data.reports);
                setTotal(response.data.data.total);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load reports');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, appliedFilters]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const handleApply = () => {
        setPage(0);
        const f = {};
        if (filterManager) f.managerEmail = filterManager;
        if (filterStartDate) f.startDate = filterStartDate;
        if (filterEndDate) f.endDate = filterEndDate;
        setAppliedFilters(f);
    };

    const handleClear = () => {
        setFilterManager('');
        setFilterStartDate('');
        setFilterEndDate('');
        setAppliedFilters({});
        setPage(0);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight={700}>Call Reports</Typography>
                <Tooltip title="Refresh">
                    <span>
                        <Button
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                            onClick={fetchReports}
                            disabled={loading}
                            size="small"
                        >
                            Refresh
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {/* Filters */}
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
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: colors.background }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Ref #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Manager</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Service Types</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date &amp; Time</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                            No reports found
                                        </TableCell>
                                    </TableRow>
                                ) : reports.map((report) => (
                                    <TableRow key={report.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: report.referenceNumber ? 'primary.main' : 'text.disabled' }}>
                                                {report.referenceNumber || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {report.callLog?.customerName || '—'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                                {report.callLog?.customerPhone || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {report.managerName || report.managerEmail}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {report.managerName ? report.managerEmail : ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(report.serviceTypes || []).map((st) => (
                                                    <Chip
                                                        key={st}
                                                        size="small"
                                                        label={SERVICE_LABELS[st] || st}
                                                        color={SERVICE_COLORS[st] || 'default'}
                                                        sx={{ fontSize: '0.7rem' }}
                                                    />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                {formatDuration(report.callLog?.duration)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 200 }}>
                                            <Tooltip title={report.remarks || ''} placement="top">
                                                <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                                    {report.remarks || '—'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                                {new Date(report.createdAt).toLocaleString('en-GB', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Paper>
        </Box>
    );
};

export default Reports;
