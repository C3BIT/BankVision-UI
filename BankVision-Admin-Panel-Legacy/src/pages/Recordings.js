import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Download,
  Delete,
  Refresh,
  FiberManualRecord,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';

const API_URL = process.env.REACT_APP_API_URL;

const Recordings = () => {
  const { token } = useSelector((state) => state.auth);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [activeRecordings, setActiveRecordings] = useState([]);

  // Dialog states
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState('');

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/recording/list?page=${page + 1}&limit=${rowsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setRecordings(data.recordings);
        setTotalCount(data.pagination.total);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRecordings = async () => {
    try {
      const response = await fetch(`${API_URL}/recording/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setActiveRecordings(data.recordings);
      }
    } catch (err) {
      console.error('Failed to fetch active recordings:', err);
    }
  };

  useEffect(() => {
    fetchRecordings();
    fetchActiveRecordings();

    // Poll for active recordings
    const interval = setInterval(fetchActiveRecordings, 10000);
    return () => clearInterval(interval);
  }, [page, rowsPerPage]);

  const handleStartRecording = async () => {
    try {
      const response = await fetch(`${API_URL}/recording/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomName }),
      });
      const data = await response.json();
      if (data.success) {
        setStartDialogOpen(false);
        setRoomName('');
        fetchRecordings();
        fetchActiveRecordings();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStopRecording = async (egressId) => {
    try {
      const response = await fetch(`${API_URL}/recording/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ egressId }),
      });
      const data = await response.json();
      if (data.success) {
        fetchRecordings();
        fetchActiveRecordings();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = (recordingId) => {
    // Use direct link with token in URL for simpler download
    const downloadUrl = `${API_URL}/recording/${recordingId}/download?token=${encodeURIComponent(token)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;

    try {
      const response = await fetch(`${API_URL}/recording/${recordingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchRecordings();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recording': return 'error';
      case 'processing': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'deleted': return 'default';
      default: return 'default';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            Call Recordings
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchRecordings();
              fetchActiveRecordings();
            }}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Active Recordings */}
        {activeRecordings.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: 'error.contrastText' }}>
              Active Recordings ({activeRecordings.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {activeRecordings.map((rec) => (
                <Chip
                  key={rec.egressId}
                  icon={<FiberManualRecord sx={{ color: 'red !important' }} />}
                  label={rec.roomName}
                  onDelete={() => handleStopRecording(rec.egressId)}
                  deleteIcon={<Stop />}
                  sx={{ bgcolor: 'white' }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Room</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Manager</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recordings.map((recording) => (
                    <TableRow key={recording.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {recording.callRoom}
                        </Typography>
                      </TableCell>
                      <TableCell>{recording.customerPhone}</TableCell>
                      <TableCell>{recording.managerEmail}</TableCell>
                      <TableCell>
                        <Chip
                          label={recording.status}
                          color={getStatusColor(recording.status)}
                          size="small"
                          icon={recording.status === 'recording' ? <FiberManualRecord /> : null}
                        />
                      </TableCell>
                      <TableCell>{formatDuration(recording.duration)}</TableCell>
                      <TableCell>{formatFileSize(recording.fileSize)}</TableCell>
                      <TableCell>
                        {new Date(recording.startTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {recording.status === 'recording' ? (
                          <IconButton
                            color="error"
                            onClick={() => handleStopRecording(recording.egressId)}
                            title="Stop Recording"
                          >
                            <Stop />
                          </IconButton>
                        ) : (
                          <>
                            {recording.status === 'completed' && (
                              <IconButton
                                color="primary"
                                onClick={() => handleDownload(recording.id)}
                                title="Download"
                              >
                                <Download />
                              </IconButton>
                            )}
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(recording.id)}
                              title="Delete"
                            >
                              <Delete />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recordings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="textSecondary">No recordings found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}
      </Paper>

    </Container>
  );
};

export default Recordings;
