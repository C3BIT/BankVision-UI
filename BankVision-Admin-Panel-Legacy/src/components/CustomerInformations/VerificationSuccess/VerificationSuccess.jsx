import { Box, Typography, Button } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import PropTypes from 'prop-types';

const VerificationSuccess = ({ onComplete }) => {
    return (
        <Box sx={{
            width: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Box sx={{
                width:'100%',
                height:'300px',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#EFF1F94D',
                borderRadius: '12px',
                border:'1px solid white',
                mb: 3,
            }}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mb: 2,

                    }}
                >
                    <CheckCircle sx={{ fontSize: 60, color: '#4CAF50' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    OTP Verified Successfully
                </Typography>
            </Box>

            <Button
                fullWidth
                variant="contained"
                onClick={onComplete}
                sx={{
                    py: 1.5,
                    background: 'linear-gradient(to right, #4CAF50, #45a049)',
                    '&:hover': {
                        background: 'linear-gradient(to right, #388E3C, #2e7d32)',
                    },
                    borderRadius: '8px',
                }}
            >
                Ok
            </Button>
        </Box>
    );
};

VerificationSuccess.propTypes = {
    onComplete: PropTypes.func.isRequired
};

export default VerificationSuccess;