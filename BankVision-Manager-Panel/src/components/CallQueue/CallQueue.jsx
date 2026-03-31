import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Phone,
  AccessTime,
  PriorityHigh,
  Call as CallIcon,
  Refresh,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const CallQueue = ({
  queue = [],
  stats = {},
  onPickCall,
  onRefresh,
  isCallActive = false,
  currentStatus = 'online'
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const canPickCall = currentStatus === 'online' && !isCallActive;

  // Update current time every second to refresh waiting time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatWaitTime = (queuedAt) => {
    if (!queuedAt) return '0s';
    
    // Handle both number timestamps and ISO string dates
    let start;
    if (typeof queuedAt === 'string') {
      start = new Date(queuedAt).getTime();
    } else {
      start = queuedAt;
    }
    
    const diff = Math.floor((currentTime - start) / 1000);

    if (diff < 0) return '0s'; // Handle edge case where timestamp is in future
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        maxWidth: 400,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: '#6366f1',
          color: 'white',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={queue.length} color="error">
            <Phone />
          </Badge>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Call Queue
          </Typography>
        </Box>
        <IconButton size="small" onClick={onRefresh} sx={{ color: 'white' }}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: '#f8fafc',
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Chip
          size="small"
          label={`${stats.waitingCalls || 0} Waiting`}
          color="warning"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${stats.onlineManagers || 0} Online`}
          color="success"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${stats.busyManagers || 0} Busy`}
          color="error"
          variant="outlined"
        />
      </Box>

      <Divider />

      {/* Queue List */}
      {queue.length === 0 ? (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'text.secondary',
          }}
        >
          <Phone sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
          <Typography variant="body2">No calls in queue</Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 300, overflow: 'auto', py: 0 }}>
          {queue.map((item, index) => (
            <ListItem
              key={item.id}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: '#f8fafc' },
              }}
              secondaryAction={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CallIcon />}
                  onClick={() => onPickCall(item.customerPhone)}
                  disabled={!canPickCall}
                  sx={{
                    bgcolor: '#4caf50',
                    '&:hover': { bgcolor: '#388e3c' },
                    '&:disabled': { bgcolor: '#e0e0e0' },
                  }}
                >
                  Pick
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#6366f1' }}>
                  {index + 1}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.customerName || item.customerPhone}
                    </Typography>
                    {item.isGuest && (
                      <Chip
                        size="small"
                        label="Guest"
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#fff3e0', color: '#e65100' }}
                      />
                    )}
                    {item.priority === 'high' && (
                      <Tooltip title="High Priority">
                        <PriorityHigh sx={{ color: 'error.main', fontSize: 16 }} />
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {item.customerName && (
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                        {item.customerPhone}
                      </Typography>
                    )}
                    <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      Waiting: {formatWaitTime(item.queuedAt)}
                    </Typography>
                    <Chip
                      size="small"
                      label={item.priority}
                      color={getPriorityColor(item.priority)}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Footer info */}
      {!canPickCall && queue.length > 0 && (
        <Box sx={{ px: 2, py: 1, bgcolor: '#fff3e0' }}>
          <Typography variant="caption" color="warning.dark">
            {isCallActive
              ? 'Complete current call to pick another'
              : 'Set status to "Available" to pick calls'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

CallQueue.propTypes = {
  queue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      customerPhone: PropTypes.string,
      priority: PropTypes.string,
      queuedAt: PropTypes.string,
      status: PropTypes.string,
    })
  ),
  stats: PropTypes.shape({
    queueLength: PropTypes.number,
    waitingCalls: PropTypes.number,
    totalManagers: PropTypes.number,
    onlineManagers: PropTypes.number,
    busyManagers: PropTypes.number,
  }),
  onPickCall: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
  isCallActive: PropTypes.bool,
  currentStatus: PropTypes.string,
};

export default CallQueue;
