import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Button,
    CircularProgress,
    TextField,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Alert
} from '@mui/material';
import {
    Download,
    Search,
    PlayCircle,
    Trash2,
    X
} from 'lucide-react';
import api from '../services/api';

const Recordings = () => {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    // Video player state
    const [playerOpen, setPlayerOpen] = useState(false);
    const [playerRecording, setPlayerRecording] = useState(null);
    const [videoError, setVideoError] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/recordings');
            if (response.data?.success) {
                setRecordings(response.data.data?.recordings || []);
            } else {
                setRecordings([]);
            }
        } catch (error) {
            console.error('Failed to fetch recordings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecordings();
    }, []);

    const handleDownload = (id) => {
        const token = localStorage.getItem('adminToken');
        const downloadUrl = `${api.defaults.baseURL}/admin/recordings/${id}/download?token=${token}`;
        window.open(downloadUrl, '_blank');
    };

    const getStreamUrl = (id) => {
        const token = localStorage.getItem('adminToken');
        return `${api.defaults.baseURL}/admin/recordings/${id}/stream?token=${token}`;
    };

    const handlePlay = (recording) => {
        setPlayerRecording(recording);
        setVideoError(false);
        setVideoLoading(true);
        setPlayerOpen(true);
    };

    const handlePlayerClose = () => {
        setPlayerOpen(false);
        setPlayerRecording(null);
        setVideoError(false);
        setVideoLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this recording? This cannot be undone.')) {
            try {
                await api.delete(`/admin/recordings/${id}`);
                setRecordings(prev => prev.filter(r => r.id !== id));
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Failed to delete recording: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    const filteredRecordings = recordings.filter(rec => {
        const customerName = rec.callLog?.customerName || '';
        const managerName = rec.callLog?.managerName || '';
        const customerPhone = rec.customerPhone || '';
        return (
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerPhone.includes(searchTerm)
        );
    });

    const totalPages = Math.ceil(filteredRecordings.length / rowsPerPage);
    const paginatedRecordings = filteredRecordings.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Recordings
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Access and download call archives
                    </Typography>
                </Box>
            </Box>

            <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                <Search size={20} color="#999" style={{ marginRight: 10 }} />
                <TextField
                    fullWidth
                    placeholder="Search by customer or manager..."
                    variant="standard"
                    InputProps={{ disableUnderline: true }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#F5F9FF' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Date & Time</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Clients Phone</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Manager</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Duration</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>References</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <CircularProgress size={30} />
                                </TableCell>
                            </TableRow>
                        ) : filteredRecordings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    No recordings found
                                </TableCell>
                            </TableRow>
                        ) : paginatedRecordings.map((rec) => (
                            <TableRow key={rec.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {new Date(rec.createdAt).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                        {rec.customerPhone || '+8801700000000'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                                            {(rec.callLog?.managerName || rec.managerEmail)?.[0]}
                                        </Avatar>
                                        <Typography variant="body2">{rec.callLog?.managerName || rec.managerEmail}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {Math.floor(rec.duration / 60)}m {rec.duration % 60}s
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={rec.status?.toUpperCase() || 'COMPLETED'}
                                        size="small"
                                        sx={{
                                            bgcolor: rec.status === 'completed' ? 'success.lighter' :
                                                rec.status === 'failed' ? 'error.lighter' : 'grey.100',
                                            color: rec.status === 'completed' ? 'success.main' :
                                                rec.status === 'failed' ? 'error.main' : 'text.secondary',
                                            fontWeight: 600,
                                            borderRadius: 1
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                        REF-{rec.id.substring(0, 6).toUpperCase()}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                        {rec.status === 'completed' && (
                                            <Tooltip title="Play recording">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handlePlay(rec)}
                                                    sx={{
                                                        bgcolor: 'success.lighter',
                                                        color: 'success.main',
                                                        borderRadius: 2,
                                                        '&:hover': { bgcolor: 'success.light' }
                                                    }}
                                                >
                                                    <PlayCircle size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Download recording">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDownload(rec.id)}
                                                disabled={rec.status !== 'completed'}
                                                sx={{
                                                    bgcolor: 'primary.lighter',
                                                    color: 'primary.main',
                                                    borderRadius: 2,
                                                    '&:hover': { bgcolor: 'primary.light' }
                                                }}
                                            >
                                                <Download size={18} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete recording">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(rec.id)}
                                                sx={{
                                                    bgcolor: 'error.lighter',
                                                    color: 'error.main',
                                                    borderRadius: 2,
                                                    '&:hover': { bgcolor: 'error.light' }
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
                <Button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    sx={{ minWidth: 40, p: 1, borderRadius: 2 }}
                >
                    Prev
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                    <Button
                        key={i}
                        variant={page === i + 1 ? 'contained' : 'text'}
                        onClick={() => setPage(i + 1)}
                        sx={{
                            minWidth: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: 'none',
                            bgcolor: page === i + 1 ? 'primary.main' : 'transparent',
                            color: page === i + 1 ? 'white' : 'text.primary'
                        }}
                    >
                        {i + 1}
                    </Button>
                ))}
                <Button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    sx={{ minWidth: 40, p: 1, borderRadius: 2 }}
                >
                    Next
                </Button>
            </Box>

            {/* Video Player Modal */}
            <Dialog
                open={playerOpen}
                onClose={handlePlayerClose}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            Recording Playback
                        </Typography>
                        {playerRecording && (
                            <Typography variant="caption" color="text.secondary">
                                {playerRecording.customerPhone || 'Unknown'} &bull;{' '}
                                {playerRecording.callLog?.managerName || playerRecording.managerEmail || 'Unknown'} &bull;{' '}
                                {new Date(playerRecording.createdAt).toLocaleString()}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={handlePlayerClose} size="small">
                        <X size={20} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0, bgcolor: '#000', position: 'relative', minHeight: 300 }}>
                    {videoLoading && !videoError && (
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'absolute',
                            inset: 0,
                            zIndex: 1,
                            bgcolor: 'rgba(0,0,0,0.7)'
                        }}>
                            <CircularProgress sx={{ color: 'white' }} />
                        </Box>
                    )}

                    {videoError ? (
                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
                            <Alert severity="error" sx={{ mb: 2 }}>
                                Failed to load recording. The file may be unavailable or corrupted.
                            </Alert>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setVideoError(false);
                                    setVideoLoading(true);
                                }}
                            >
                                Retry
                            </Button>
                        </Box>
                    ) : (
                        playerRecording && (
                            <video
                                key={playerRecording.id}
                                controls
                                autoPlay
                                style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
                                src={getStreamUrl(playerRecording.id)}
                                onLoadedData={() => setVideoLoading(false)}
                                onCanPlay={() => setVideoLoading(false)}
                                onError={() => {
                                    setVideoLoading(false);
                                    setVideoError(true);
                                }}
                            >
                                Your browser does not support the video element.
                            </video>
                        )
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Box>
                        {playerRecording && (
                            <Typography variant="caption" color="text.secondary">
                                Duration: {playerRecording.duration
                                    ? `${Math.floor(playerRecording.duration / 60)}m ${playerRecording.duration % 60}s`
                                    : 'N/A'
                                }
                                {playerRecording.fileSize && (
                                    <> &bull; Size: {(playerRecording.fileSize / (1024 * 1024)).toFixed(1)} MB</>
                                )}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<Download size={16} />}
                            onClick={() => playerRecording && handleDownload(playerRecording.id)}
                        >
                            Download
                        </Button>
                        <Button variant="contained" onClick={handlePlayerClose}>
                            Close
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Recordings;
