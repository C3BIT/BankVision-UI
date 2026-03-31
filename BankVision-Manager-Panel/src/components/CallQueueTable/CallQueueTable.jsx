import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Pagination,
  Typography,
  CircularProgress,
} from '@mui/material';
import { AccessTime as ClockIcon, FiberManualRecord as DotIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

const CallQueueTable = ({
  queue = [],
  onAcceptCall,
  onRefresh,
  loading = false,
  disabled = false,
}) => {
  const [page, setPage] = useState(1);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const rowsPerPage = 8;

  // Update current time every second to refresh waiting time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const formatWaitTime = (timestamp) => {
    if (!timestamp) return '00:00';
    
    // Handle both number timestamps and ISO string dates (queuedAt from backend)
    let timestampMs;
    if (typeof timestamp === 'string') {
      timestampMs = new Date(timestamp).getTime();
    } else {
      timestampMs = timestamp;
    }
    
    // Use currentTime state instead of Date.now() to trigger re-renders
    const diff = Math.floor((currentTime - timestampMs) / 1000); // seconds

    if (diff < 0) return '00:00'; // Handle edge case where timestamp is in future
    if (diff < 60) return `00:${diff.toString().padStart(2, '0')}`;
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return { bg: '#FFE5E5', color: '#FF4444', label: 'High' };
      case 'medium':
        return { bg: '#FFF4E5', color: '#FF9800', label: 'Medium' };
      case 'low':
        return { bg: '#E5F7E5', color: '#4CAF50', label: 'Low' };
      default:
        return { bg: '#FFF4E5', color: '#FF9800', label: 'Medium' };
    }
  };

  const paginatedQueue = queue.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(queue.length / rowsPerPage);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (queue.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: '#FAFAFA',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No customers in queue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Waiting for incoming calls...
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1A1A1A' }}>
          Clients Call List
        </Typography>
        <Button
          onClick={onRefresh}
          disabled={loading}
          sx={{
            textTransform: 'none',
            color: '#0066FF',
            '&:hover': { backgroundColor: '#E3F2FD' },
          }}
        >
          Refresh
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid #E0E0E0',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
              <TableCell sx={{ fontWeight: 600, color: '#666666' }}>Clients Number</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666666' }}>Waiting Time</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666666' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666666', textAlign: 'right' }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedQueue.map((customer, index) => {
              const priority = getPriorityColor(customer.priority || 'medium');
              return (
                <TableRow
                  key={customer.phone || index}
                  sx={{
                    '&:hover': { backgroundColor: '#FAFAFA' },
                    '&:last-child td': { border: 0 },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DotIcon sx={{ fontSize: 12, color: '#0066FF' }} />
                      <Typography sx={{ fontWeight: 500 }}>
                        {customer.phone || customer.customerPhone || 'Unknown'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ClockIcon sx={{ fontSize: 16, color: '#666666' }} />
                      <Typography variant="body2" sx={{ color: '#666666' }}>
                        {formatWaitTime(customer.timestamp || customer.joinedAt || customer.queuedAt)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={priority.label}
                      size="small"
                      sx={{
                        backgroundColor: priority.bg,
                        color: priority.color,
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: 24,
                        borderRadius: '12px',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      onClick={() => onAcceptCall(customer.phone || customer.customerPhone)}
                      disabled={disabled}
                      sx={{
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        py: 0.75,
                        borderRadius: '8px',
                        '&:hover': {
                          backgroundColor: '#059669',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: '#E0E0E0',
                          color: '#999999',
                        },
                      }}
                    >
                      Accept
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

CallQueueTable.propTypes = {
  queue: PropTypes.arrayOf(
    PropTypes.shape({
      phone: PropTypes.string,
      customerPhone: PropTypes.string,
      priority: PropTypes.string,
      timestamp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      joinedAt: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      queuedAt: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    })
  ),
  onAcceptCall: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default CallQueueTable;
