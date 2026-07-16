import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Phone as PhoneIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import { colors } from '../../styles/tokens';

const OTPVerificationPanel = ({ customerPhone }) => {
  const {
    phoneVerified,
    verificationPending,
    requestPhoneVerification,
  } = useWebSocket();

  const handleRequestPhoneOTP = () => {
    if (!customerPhone) {
      alert('Customer phone number is required');
      return;
    }
    requestPhoneVerification();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1 }}>
          OTP Verification
        </Typography>
        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
          Request OTP verification for phone and email before proceeding to face verification.
        </Typography>
      </Box>

      {/* Phone OTP Section */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${colors.border}`,
          borderRadius: 2,
          backgroundColor: phoneVerified ? '#F0F9FF' : colors.surface,
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: phoneVerified ? colors.success : colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <PhoneIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                  Phone OTP
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
                  {customerPhone || 'No phone number'}
                </Typography>
              </Box>
            </Stack>

            {phoneVerified ? (
              <Chip
                icon={<CheckCircle sx={{ fontSize: 18 }} />}
                label="Verified"
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            ) : verificationPending.phone ? (
              <Chip
                icon={<HourglassEmpty sx={{ fontSize: 18 }} />}
                label="Pending"
                color="warning"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            ) : (
              <Chip
                label="Not Verified"
                size="small"
                sx={{
                  backgroundColor: '#F3F4F6',
                  color: colors.textSecondary,
                  fontWeight: 600,
                }}
              />
            )}
          </Stack>

          {!phoneVerified && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<SendIcon />}
              onClick={handleRequestPhoneOTP}
              disabled={verificationPending.phone || !customerPhone}
              sx={{
                backgroundColor: colors.primary,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                '&:hover': {
                  backgroundColor: colors.primaryDark,
                },
                '&:disabled': {
                  backgroundColor: colors.border,
                  color: colors.textMuted,
                },
              }}
            >
              {verificationPending.phone ? 'OTP Sent - Waiting for Customer' : 'Send Phone OTP'}
            </Button>
          )}

          {phoneVerified && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Phone number verified successfully!
              </Typography>
            </Alert>
          )}

          {verificationPending.phone && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                OTP sent to {customerPhone}. Waiting for customer to enter the code...
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Completion Status */}
      {phoneVerified && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ✅ Phone OTP verified! You can now proceed to Face Verification.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

OTPVerificationPanel.propTypes = {
  customerPhone: PropTypes.string.isRequired,
};

export default OTPVerificationPanel;
