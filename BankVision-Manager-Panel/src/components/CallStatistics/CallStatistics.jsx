import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../services/apiCaller';

const StatCard = ({ icon, label, value, subLabel, color = '#13A183' }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2,
      backgroundColor: `${color}10`,
      borderRadius: 2,
      minWidth: 150,
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        backgroundColor: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: color }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {subLabel && (
        <Typography variant="caption" color="text.secondary">
          {subLabel}
        </Typography>
      )}
    </Box>
  </Box>
);

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

const CallStatistics = ({ managerEmail }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const params = {
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
      };

      if (managerEmail) {
        params.managerEmail = managerEmail;
      }

      const response = await api.get('/call-logs/statistics', { params });

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load statistics');
      // Set default values on error
      setStats({
        totalCalls: 0,
        completedCalls: 0,
        missedCalls: 0,
        cancelledCalls: 0,
        completionRate: 0,
        avgDuration: 0,
        totalTalkTime: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStatistics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [managerEmail]);

  if (loading && !stats) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
          <CircularProgress size={30} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Today's Statistics
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchStatistics} disabled={loading}>
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} md={6} lg={4}>
          <StatCard
            icon={<PhoneCallbackIcon />}
            label="Total Calls"
            value={stats?.totalCalls || 0}
            color="#2196F3"
          />
        </Grid>

        <Grid item xs={6} sm={4} md={6} lg={4}>
          <StatCard
            icon={<CheckCircleIcon />}
            label="Completed"
            value={stats?.completedCalls || 0}
            color="#4CAF50"
          />
        </Grid>

        <Grid item xs={6} sm={4} md={6} lg={4}>
          <StatCard
            icon={<PhoneMissedIcon />}
            label="Missed"
            value={stats?.missedCalls || 0}
            color="#FF9800"
          />
        </Grid>

        <Grid item xs={6} sm={4} md={6} lg={4}>
          <StatCard
            icon={<TrendingUpIcon />}
            label="Success Rate"
            value={`${stats?.completionRate || 0}%`}
            color="#9C27B0"
          />
        </Grid>

        <Grid item xs={6} sm={4} md={6} lg={4}>
          <StatCard
            icon={<AccessTimeIcon />}
            label="Avg Duration"
            value={formatDuration(stats?.avgDuration || 0)}
            color="#00BCD4"
          />
        </Grid>

        <Grid item xs={6} sm={4} md={6} lg={4}>
          <StatCard
            icon={<AccessTimeIcon />}
            label="Total Talk Time"
            value={formatDuration(stats?.totalTalkTime || 0)}
            color="#795548"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary">
        Statistics refresh automatically every 5 minutes
      </Typography>
    </Paper>
  );
};

export default CallStatistics;
