import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { CheckCircle, AccountBalance } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const DormantAccountActivationRequest = ({ socket }) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [activated, setActivated] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleActivated = () => setActivated(true);
        socket.on('customer:account-activated', handleActivated);

        return () => {
            socket.off('customer:account-activated', handleActivated);
        };
    }, [socket]);

    if (activated) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, alignItems: 'center' }}>
                <CheckCircle sx={{ fontSize: 64, color: '#4CAF50' }} />
                <Typography variant="h6" sx={{ color: 'white', textAlign: 'center' }}>
                    Account Activated!
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                    Your dormant account has been successfully reactivated.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, alignItems: 'center' }}>
            <AccountBalance sx={{ fontSize: 48, color: 'rgba(255,255,255,0.8)' }} />

            <Typography variant="h6" sx={{ color: 'white', textAlign: 'center', fontWeight: 'medium' }}>
                Dormant Account Activation
            </Typography>

            {accountDetails?.accountNumber && (
                <Box sx={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    width: '100%',
                    textAlign: 'center',
                }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 0.5 }}>
                        Account Number
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, letterSpacing: 2 }}>
                        {accountDetails.accountNumber}
                    </Typography>
                </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Your manager is processing the activation…
                </Typography>
            </Box>
        </Box>
    );
};

DormantAccountActivationRequest.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default DormantAccountActivationRequest;
