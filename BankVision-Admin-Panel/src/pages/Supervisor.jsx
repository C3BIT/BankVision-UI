import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Avatar,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Headphones,
    Mic,
    RefreshCw,
    Clock,
    PhoneCall,
    Video
} from 'lucide-react';
import api from '../services/api';
import OpenViduMeetComponent from '../components/video/OpenViduMeetComponent';

const Supervisor = () => {
    const [activeCalls, setActiveCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState(null); // { roomName, mode, customerName }

    const fetchActiveCalls = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/active-calls');
            if (response.data?.success) {
                // active calls data structure depends on API. 
                // Assuming array of { id, customerName, managerName, startTime, roomName }
                setActiveCalls(response.data.data?.activeCalls || []);
            }
        } catch (error) {
            console.error('Failed to fetch active calls:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveCalls();
        const interval = setInterval(fetchActiveCalls, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleJoin = (call, mode) => {
        setSelectedCall({
            roomName: call.callRoom || call.roomName || `room-${call.id}`,
            mode: mode,
            customerName: call.customerName
        });
    };

    const handleLeave = () => {
        setSelectedCall(null);
        fetchActiveCalls(); // Refresh list after leaving
    };

    const ActiveCallsList = () => (
        <Grid container spacing={3}>
            {activeCalls.length === 0 ? (
                <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', bgcolor: 'background.paper', borderRadius: 2 }}>
                        <PhoneCall size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <Typography variant="h6">No active calls at the moment</Typography>
                    </Box>
                </Grid>
            ) : (
                activeCalls.map((call) => (
                    <Grid item xs={12} md={6} lg={4} key={call.id}>
                        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Chip
                                        label="Live"
                                        color="error"
                                        size="small"
                                        icon={<Clock size={12} />}
                                        sx={{ px: 0.5 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Starting {new Date(call.startTime).toLocaleTimeString()}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                                        {call.customerName?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            {call.customerName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            with {call.managerName}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<Headphones size={18} />}
                                        onClick={() => handleJoin(call, 'listen')}
                                    >
                                        Listen
                                    </Button>
                                    <Tooltip title="Whisper to Manager">
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="warning"
                                            startIcon={<Mic size={18} />}
                                            onClick={() => handleJoin(call, 'whisper')}
                                        >
                                            Whisper
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Join with Audio & Video">
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="error"
                                            startIcon={<Video size={18} />}
                                            onClick={() => handleJoin(call, 'barge')}
                                        >
                                            Barge
                                        </Button>
                                    </Tooltip>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))
            )}
        </Grid>
    );

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Active Calls
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Monitor ongoing video sessions
                    </Typography>
                </Box>
                {!selectedCall && (
                    <Button
                        startIcon={<RefreshCw size={20} />}
                        onClick={fetchActiveCalls}
                        variant="outlined"
                    >
                        Refresh
                    </Button>
                )}
            </Box>

            {selectedCall ? (
                <Box>
                    <Button onClick={handleLeave} sx={{ mb: 2 }}>Back to List</Button>
                    <OpenViduMeetComponent
                        roomName={selectedCall.roomName}
                        mode={selectedCall.mode}
                        onLeave={handleLeave}
                        displayName="Supervisor (Admin)"
                    />
                </Box>
            ) : (
                <ActiveCallsList />
            )}
        </Box>
    );
};

export default Supervisor;
