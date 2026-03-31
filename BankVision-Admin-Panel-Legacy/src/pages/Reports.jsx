import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0'];

const Reports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Report data
  const [callStats, setCallStats] = useState([]);
  const [managerPerformance, setManagerPerformance] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    completedCalls: 0,
    missedCalls: 0,
    avgDuration: 0,
    avgRating: 0
  });

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { startDate, endDate, limit: 1000 };

      // Fetch call logs
      const response = await api.get('/admin/call-logs', { params });
      const calls = response.data.data.calls || [];

      // Process data for reports
      processCallData(calls);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const processCallData = (calls) => {
    // Daily call statistics
    const dailyStats = {};
    const managerStats = {};
    const statusCounts = {};

    let totalDuration = 0;
    let totalRating = 0;
    let ratingCount = 0;

    calls.forEach(call => {
      // Daily stats
      const date = new Date(call.createdAt).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, total: 0, completed: 0, missed: 0, avgDuration: 0, durations: [] };
      }
      dailyStats[date].total++;
      if (call.status === 'completed') {
        dailyStats[date].completed++;
        if (call.duration) {
          dailyStats[date].durations.push(call.duration);
          totalDuration += call.duration;
        }
      }
      if (call.status === 'missed' || call.status === 'rejected') {
        dailyStats[date].missed++;
      }

      // Manager stats
      const manager = call.managerEmail || call.managerName || 'Unknown';
      if (!managerStats[manager]) {
        managerStats[manager] = { name: manager, calls: 0, completed: 0, avgDuration: 0, durations: [] };
      }
      managerStats[manager].calls++;
      if (call.status === 'completed') {
        managerStats[manager].completed++;
        if (call.duration) {
          managerStats[manager].durations.push(call.duration);
        }
      }

      // Status distribution
      const status = call.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Ratings
      if (call.feedback?.rating) {
        totalRating += call.feedback.rating;
        ratingCount++;
      }
    });

    // Calculate averages
    Object.values(dailyStats).forEach(day => {
      day.avgDuration = day.durations.length > 0
        ? Math.round(day.durations.reduce((a, b) => a + b, 0) / day.durations.length)
        : 0;
      delete day.durations;
    });

    Object.values(managerStats).forEach(mgr => {
      mgr.avgDuration = mgr.durations.length > 0
        ? Math.round(mgr.durations.reduce((a, b) => a + b, 0) / mgr.durations.length)
        : 0;
      mgr.completionRate = mgr.calls > 0 ? Math.round((mgr.completed / mgr.calls) * 100) : 0;
      delete mgr.durations;
    });

    // Sort daily stats by date
    const sortedDailyStats = Object.values(dailyStats).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // Sort manager stats by calls
    const sortedManagerStats = Object.values(managerStats).sort((a, b) => b.calls - a.calls);

    // Status distribution for pie chart
    const statusDistData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    setCallStats(sortedDailyStats);
    setManagerPerformance(sortedManagerStats);
    setStatusDistribution(statusDistData);
    setSummary({
      totalCalls: calls.length,
      completedCalls: calls.filter(c => c.status === 'completed').length,
      missedCalls: calls.filter(c => c.status === 'missed' || c.status === 'rejected').length,
      avgDuration: calls.length > 0 ? Math.round(totalDuration / calls.filter(c => c.duration).length) || 0 : 0,
      avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0
    });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportToCSV = () => {
    let csv = '';

    if (activeTab === 0) {
      // Call statistics
      csv = 'Date,Total Calls,Completed,Missed,Avg Duration (s)\n';
      callStats.forEach(row => {
        csv += `${row.date},${row.total},${row.completed},${row.missed},${row.avgDuration}\n`;
      });
    } else if (activeTab === 1) {
      // Manager performance
      csv = 'Manager,Total Calls,Completed,Completion Rate (%),Avg Duration (s)\n';
      managerPerformance.forEach(row => {
        csv += `${row.name},${row.calls},${row.completed},${row.completionRate},${row.avgDuration}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${activeTab === 0 ? 'calls' : 'managers'}-${startDate}-${endDate}.csv`;
    a.click();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Reports & Analytics
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchReports}
              disabled={loading}
            >
              Generate Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={loading || callStats.length === 0}
            >
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">{summary.totalCalls}</Typography>
              <Typography variant="body2" color="text.secondary">Total Calls</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{summary.completedCalls}</Typography>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">{summary.missedCalls}</Typography>
              <Typography variant="body2" color="text.secondary">Missed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{formatDuration(summary.avgDuration)}</Typography>
              <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{summary.avgRating}</Typography>
              <Typography variant="body2" color="text.secondary">Avg Rating</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Report Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<TrendingIcon />} label="Call Trends" />
          <Tab icon={<PeopleIcon />} label="Agent Performance" />
          <Tab icon={<AssessmentIcon />} label="Status Distribution" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Call Trends Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Daily Call Volume</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={callStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#1976d2" strokeWidth={2} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#2e7d32" strokeWidth={2} />
                      <Line type="monotone" dataKey="missed" name="Missed" stroke="#d32f2f" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Average Call Duration (seconds)</Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={callStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgDuration" name="Avg Duration" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Agent Performance Tab */}
          {activeTab === 1 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Agent Performance</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Agent</TableCell>
                      <TableCell align="right">Total Calls</TableCell>
                      <TableCell align="right">Completed</TableCell>
                      <TableCell align="right">Completion Rate</TableCell>
                      <TableCell align="right">Avg Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {managerPerformance.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{row.calls}</TableCell>
                        <TableCell align="right">{row.completed}</TableCell>
                        <TableCell align="right">{row.completionRate}%</TableCell>
                        <TableCell align="right">{formatDuration(row.avgDuration)}</TableCell>
                      </TableRow>
                    ))}
                    {managerPerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {managerPerformance.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Calls per Agent</Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={managerPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#1976d2" name="Total Calls" />
                      <Bar dataKey="completed" fill="#2e7d32" name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          )}

          {/* Status Distribution Tab */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Call Status Distribution</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Status Breakdown</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statusDistribution.map((row, index) => (
                          <TableRow key={row.name}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: COLORS[index % COLORS.length]
                                  }}
                                />
                                {row.name}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{row.value}</TableCell>
                            <TableCell align="right">
                              {summary.totalCalls > 0
                                ? ((row.value / summary.totalCalls) * 100).toFixed(1)
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default Reports;
