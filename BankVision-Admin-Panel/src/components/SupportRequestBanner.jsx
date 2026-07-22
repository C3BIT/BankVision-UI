import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import { LifeBuoy, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

// Always-mounted, global (not per-page) banner stack: a manager in any active
// call can request supervisor help, and every connected admin/supervisor sees
// it here until one of them accepts, the manager cancels, or it times out.
const SupportRequestBanner = () => {
    const { socket, assistanceRequests, dismissAssistanceRequest } = useSocket();
    const navigate = useNavigate();

    if (!assistanceRequests.length) return null;

    const handleAccept = (request) => {
        socket?.emit('supervisor:respond-assistance', {
            requestId: request.requestId,
            customerPhone: request.customerPhone,
            response: 'accepted',
        });
        dismissAssistanceRequest(request.requestId);
        navigate('/supervisor', { state: { autoJoinPhone: request.customerPhone } });
    };

    const handleIgnore = (request) => {
        dismissAssistanceRequest(request.requestId);
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                maxWidth: 380,
            }}
        >
            {assistanceRequests.map((request) => (
                <Paper
                    key={request.requestId}
                    elevation={6}
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        borderLeft: '4px solid',
                        borderColor: 'warning.main',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <LifeBuoy size={22} color="#ed6c02" style={{ flexShrink: 0, marginTop: 2 }} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Manager needs help
                                </Typography>
                                {request.urgency === 'high' && (
                                    <Chip label="Urgent" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
                                )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {request.managerName || request.managerEmail} requested support
                                {request.reason ? `: "${request.reason}"` : ''}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="contained" color="warning" onClick={() => handleAccept(request)}>
                                    Accept &amp; Join
                                </Button>
                                <Button size="small" variant="text" onClick={() => handleIgnore(request)}>
                                    Ignore
                                </Button>
                            </Box>
                        </Box>
                        <X
                            size={16}
                            style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.6 }}
                            onClick={() => handleIgnore(request)}
                        />
                    </Box>
                </Paper>
            ))}
        </Box>
    );
};

export default SupportRequestBanner;
