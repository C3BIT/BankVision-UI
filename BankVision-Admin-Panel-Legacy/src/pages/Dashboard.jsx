import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import TimerIcon from '@mui/icons-material/Timer';
import VerifiedIcon from '@mui/icons-material/VerifiedUser';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import api from '../services/api';

const StatCard = ({ title, value, icon, color, subtext, trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value}
          </Typography>
          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              {trend >= 0 ? (
                <ArrowUpwardIcon fontSize="small" color="success" sx={{ fontSize: 16 }} />
              ) : (
                <ArrowDownwardIcon fontSize="small" color="error" sx={{ fontSize: 16 }} />
              )}
              <Typography
                variant="caption"
                color={trend >= 0 ? 'success.main' : 'error.main'}
                fontWeight="bold"
                sx={{ ml: 0.5 }}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                vs yest
              </Typography>
            </Box>
          )}
          {subtext && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {subtext}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      if (response.data.success) {
        const data = response.data.data;
        setRecentCalls(data.recentCalls || []); // Assuming recentCalls is part of the dashboard data

        // Calculate stats for new cards
        const pendingQueue = data.today?.pendingInQueue || 0;
        const idMatchRate = data.today?.identityMatchSuccessRate || 0; // %
        const otpFailRate = data.today?.otpFailureRate || '0/0';
        const activeManagers = data.today?.activeManagersCount || 0; // You might need to ensure API returns this or calculate from socket data if available here

        setStats({
          ...data, // Keep existing stats structure
          pendingQueue,
          idMatchRate,
          otpFailRate,
          activeManagers,
          yesterdayDeltas: data.today?.yesterdayDeltas || {}
        });
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Today's overview at a glance
      </Typography>

      {/* Real-time Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="🔴 Active Calls"
            value={stats?.realtime?.activeCalls || 0}
            icon={<PhoneIcon />}
            color="#f44336"
            subtext="Live"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="🟢 Online Managers"
            value={stats?.realtime?.onlineManagers || 0}
            icon={<PeopleIcon />}
            color="#4CAF50"
            subtext="Available"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="🟡 Busy Managers"
            value={stats?.realtime?.busyManagers || 0}
            icon={<PeopleIcon />}
            color="#FF9800"
            subtext="On call"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Managers"
            value={stats?.totalManagers || 0}
            icon={<PeopleIcon />}
            color="#607D8B"
          />
        </Grid>
      </Grid>

      {/* Today's Stats Cards */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Today's Statistics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Row 1: Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Calls Today"
            value={stats?.today?.totalCalls || 0}
            icon={<PhoneIcon />}
            color="#1976d2"
            trend={stats.yesterdayDeltas?.totalCalls}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Managers"
            value={stats.activeManagers || 0}
            icon={<PeopleIcon />}
            color="#2e7d32"
            trend={stats.yesterdayDeltas?.activeManagers}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending in Queue"
            value={stats.pendingQueue || 0}
            icon={<AccessTimeIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Duration"
            value={`${Math.floor((stats?.today?.avgDuration || 0) / 60)}m ${(stats?.today?.avgDuration || 0) % 60}s`}
            icon={<TimerIcon />}
            color="#9c27b0"
            trend={stats.yesterdayDeltas?.avgDuration}
          />
        </Grid>

        {/* Row 2: Verification & Security */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Identity Match Rate"
            value={`${stats.idMatchRate}%`}
            icon={<VerifiedIcon />}
            color="#00bcd4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="OTP Failure Rate"
            value={stats.otpFailRate}
            icon={<WarningIcon />}
            color="#f44336"
            subtitle="Failed / Total"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          {/* Sizing spacer or another chart could go here */}
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Call Trend (Last 7 Days)
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.weeklyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { weekday: 'short' });
                    }}
                  />
                  <YAxis />
                  <RechartsTooltip // Using RechartsTooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="#2196F3"
                    strokeWidth={2}
                    name="Total Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    name="Completed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Stats
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Success Rate</Typography>
                <Chip
                  label={`${stats?.today?.totalCalls > 0
                    ? Math.round((stats?.today?.completedCalls / stats?.today?.totalCalls) * 100)
                    : 0}%`}
                  color="success"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Miss Rate</Typography>
                <Chip
                  label={`${stats?.today?.totalCalls > 0
                    ? Math.round((stats?.today?.missedCalls / stats?.today?.totalCalls) * 100)
                    : 0}%`}
                  color="warning"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Online Managers</Typography>
                <Chip
                  label={stats?.realtime?.onlineManagers || 0}
                  color="success"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Active Calls</Typography>
                <Chip
                  label={stats?.realtime?.activeCalls || 0}
                  color="error"
                  size="small"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
