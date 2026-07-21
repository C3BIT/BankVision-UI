import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Chip, TextField, Grid,
    Button, CircularProgress, Alert, Tooltip, Card, CardContent,
} from '@mui/material';
import { Refresh, Star, StarBorder, ThumbUp, CheckCircle } from '@mui/icons-material';
import api from '../services/api';
import { colors } from '../theme/tokens';

const RATING_LABELS = {
    1: 'Very Dissatisfied',
    2: 'Dissatisfied',
    3: 'Neutral',
    4: 'Satisfied',
    5: 'Very Satisfied',
};

const StatCard = ({ title, value, icon, color, subtext }) => (
    <Card sx={{ height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderRadius: 3 }}>
        <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color }}>
                        {value}
                    </Typography>
                    {subtext && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {subtext}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        width: 56, height: 56, borderRadius: '50%',
                        backgroundColor: `${color}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color,
                    }}
                >
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const StarRating = ({ rating }) => (
    <Box sx={{ display: 'flex' }}>
        {[1, 2, 3, 4, 5].map((n) =>
            n <= rating ? (
                <Star key={n} sx={{ fontSize: 18, color: colors.primary || '#F5A623' }} />
            ) : (
                <StarBorder key={n} sx={{ fontSize: 18, color: 'text.disabled' }} />
            )
        )}
    </Box>
);

const Feedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [filterManager, setFilterManager] = useState('');
    const [filterMinRating, setFilterMinRating] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [listRes, statsRes] = await Promise.all([
                api.get('/feedback', {
                    params: { page: page + 1, limit: rowsPerPage, ...appliedFilters },
                }),
                api.get('/feedback/statistics', { params: appliedFilters }),
            ]);
            if (listRes.data.success) {
                setFeedbacks(listRes.data.data.feedbacks);
                setTotal(listRes.data.data.pagination.total);
            }
            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load feedback');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, appliedFilters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApply = () => {
        setPage(0);
        const f = {};
        if (filterManager) f.managerEmail = filterManager;
        if (filterMinRating) f.minRating = filterMinRating;
        setAppliedFilters(f);
    };

    const handleClear = () => {
        setFilterManager('');
        setFilterMinRating('');
        setAppliedFilters({});
        setPage(0);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight={700}>Customer Feedback</Typography>
                <Tooltip title="Refresh">
                    <span>
                        <Button
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                            onClick={fetchData}
                            disabled={loading}
                            size="small"
                        >
                            Refresh
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {stats && (
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Average Rating"
                            value={`${stats.averageRating} / 5`}
                            icon={<Star />}
                            color="#F5A623"
                            subtext={`${stats.totalFeedbacks} total responses`}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Satisfaction Rate"
                            value={`${stats.satisfactionRate}%`}
                            icon={<ThumbUp />}
                            color="#10B981"
                            subtext="Rated 4 or 5 stars"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Issues Resolved"
                            value={`${stats.issuesResolvedRate}%`}
                            icon={<CheckCircle />}
                            color={colors.primary}
                            subtext="Of feedback with an issue"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Feedback"
                            value={stats.totalFeedbacks}
                            icon={<Star />}
                            color="#8B5CF6"
                            subtext="Submitted by customers"
                        />
                    </Grid>
                </Grid>
            )}

            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={5}>
                        <TextField
                            label="Manager Email"
                            value={filterManager}
                            onChange={(e) => setFilterManager(e.target.value)}
                            size="small"
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Minimum Rating"
                            type="number"
                            inputProps={{ min: 1, max: 5 }}
                            value={filterMinRating}
                            onChange={(e) => setFilterMinRating(e.target.value)}
                            size="small"
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={3} sx={{ display: 'flex', gap: 1 }}>
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
                                    <TableCell sx={{ fontWeight: 700 }}>Reference #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Customer Phone</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Manager</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Rating</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Comment</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Issue Resolved</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {feedbacks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                            No feedback found
                                        </TableCell>
                                    </TableRow>
                                ) : feedbacks.map((fb) => (
                                    <TableRow key={fb.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: fb.referenceNumber ? 'primary.main' : 'text.disabled' }}>
                                                {fb.referenceNumber || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {fb.customerPhone}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{fb.managerEmail || '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <StarRating rating={fb.rating} />
                                                <Chip
                                                    size="small"
                                                    label={RATING_LABELS[fb.rating] || fb.ratingLabel}
                                                    color={fb.rating >= 4 ? 'success' : fb.rating === 3 ? 'default' : 'error'}
                                                    sx={{ fontSize: '0.7rem' }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 220 }}>
                                            <Tooltip title={fb.feedbackText || ''} placement="top">
                                                <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                                    {fb.feedbackText || '—'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {fb.issueResolved === null || fb.issueResolved === undefined ? (
                                                <Typography variant="body2" color="text.secondary">—</Typography>
                                            ) : (
                                                <Chip
                                                    size="small"
                                                    label={fb.issueResolved ? 'Yes' : 'No'}
                                                    color={fb.issueResolved ? 'success' : 'error'}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                                {new Date(fb.createdAt).toLocaleString('en-GB', {
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

export default Feedback;
