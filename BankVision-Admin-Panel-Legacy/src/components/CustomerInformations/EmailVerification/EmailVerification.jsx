import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';
import { ArrowBack } from '@mui/icons-material';

const EmailVerification = ({ email, verificationPending, onSendOTP, onBack }) => {
    return (
        <Box sx={{
            width: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {onBack && (
                <Button
                    startIcon={<ArrowBack />}
                    onClick={onBack}
                    sx={{ alignSelf: 'flex-start', mb: 2 }}
                >
                    Back
                </Button>
            )}

            <Typography variant="h6" sx={{ mb: 4, color: 'white' }}>
                Verify Customer
            </Typography>

            <TextField
                fullWidth
                value={email}
                variant="outlined"
                label="Email Address"
                InputProps={{
                    readOnly: true,
                }}
                sx={{
                    mb: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '8px',
                }}
            />

            {verificationPending ? (
                <Button
                    fullWidth
                    variant="contained"
                    disabled
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(to right, #4CAF50, #45a049)',
                        borderRadius: '8px',
                        opacity: 0.7,
                    }}
                >
                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                    Sending OTP...
                </Button>
            ) : (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onSendOTP}
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(to right, #4CAF50, #45a049)',
                        '&:hover': {
                            background: 'linear-gradient(to right, #388E3C, #2e7d32)',
                        },
                        borderRadius: '8px',
                    }}
                >
                    Send OTP
                </Button>
            )}
        </Box>
    );
};

EmailVerification.propTypes = {
    email: PropTypes.string.isRequired,
    verificationPending: PropTypes.bool,
    onSendOTP: PropTypes.func.isRequired,
    onBack: PropTypes.func
};

export default EmailVerification;