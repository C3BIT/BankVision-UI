import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  AccessTime as ClockIcon,
  Assessment as ChartIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { useWebSocket } from '../../providers/WebSocketProvider';

const StatCard = ({ icon, label, value, loading = false }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2,
      backgroundColor: '#FAFAFA',
      borderRadius: 2,
      border: '1px solid #E0E0E0',
    }}
  >
    {/* Icon */}
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        backgroundColor: '#E3F2FD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0066FF',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>

    {/* Text */}
    <Box sx={{ flex: 1 }}>
      <Typography
        sx={{
          fontSize: '0.75rem',
          color: '#666666',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <Typography
          sx={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1A1A1A',
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  </Box>
);

const formatDurationToMinSec = (seconds) => {
  if (!seconds || seconds === 0) return '00:00 Min';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} Min`;
};

const PerformanceOverview = ({ managerEmail }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { statsVersion } = useWebSocket();

  const fetchStatistics = useCallback(async () => {
    setLoading(true);

    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const params = {
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        _t: Date.now(), // Cache-busting to ensure fresh data
      };

      if (managerEmail) {
        params.managerEmail = managerEmail;
      }

      const response = await api.get('/call-logs/statistics', { params });

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setStats({
          totalCalls: 0,
          completedCalls: 0,
          avgDuration: 0,
          csatScore: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setStats({
        totalCalls: 0,
        completedCalls: 0,
        avgDuration: 0,
        csatScore: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [managerEmail]);

  useEffect(() => {
    fetchStatistics();
    // Re-fetch after short delay to catch calls that just completed
    // (component remounts after a call ends, but call log may not be committed yet)
    const delayedFetch = setTimeout(fetchStatistics, 3000);
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStatistics, 5 * 60 * 1000);
    return () => {
      clearTimeout(delayedFetch);
      clearInterval(interval);
    };
  }, [fetchStatistics]);

  // Re-fetch when statsVersion changes (incremented by WebSocketProvider on stats:update events)
  // This works even if this component was unmounted when the event fired
  useEffect(() => {
    if (statsVersion > 0) {
      fetchStatistics();
    }
  }, [statsVersion, fetchStatistics]);

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: '#1A1A1A',
          mb: 2,
        }}
      >
        Performance Overview
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Calls Taken Today */}
        <StatCard
          icon={<PhoneIcon />}
          label="Calls Taken Today"
          value={`${stats?.completedCalls || 0} Calls`}
          loading={loading && !stats}
        />

        {/* Average Handle Time */}
        <StatCard
          icon={<ClockIcon />}
          label="Average Handle Time"
          value={formatDurationToMinSec(stats?.avgDuration || 0)}
          loading={loading && !stats}
        />

        {/* CSAT Score */}
        <StatCard
          icon={<ChartIcon />}
          label="CSAT Score"
          value={`${stats?.csatScore || 7}/10`}
          loading={loading && !stats}
        />
      </Box>
    </Box>
  );
};

PerformanceOverview.propTypes = {
  managerEmail: PropTypes.string,
};

export default PerformanceOverview;
