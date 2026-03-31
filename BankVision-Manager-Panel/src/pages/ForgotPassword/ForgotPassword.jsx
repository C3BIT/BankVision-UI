import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Grid, Link, Typography, Stepper, Step, StepLabel } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/common/FormInput';
import PasswordInput from '../../components/common/PasswordInput';
import OtpInput from '../../components/common/OtpInput';
import LoadingButton from '../../components/common/LoadingButton';
import Toast from '../../utils/toast';
import api from '../../services/apiCaller';

// Password requirements matching backend policy
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p) },
];

const steps = ['Enter Email', 'Verify OTP', 'Reset Password'];

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();

    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/manager/forgot-password', { email });
      Toast.success('OTP sent to your email!');
      setActiveStep(1);
      startCountdown();
    } catch (error) {
      Toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();

    if (otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setActiveStep(2);
    Toast.info('OTP verified. Please set your new password.');
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();

    const newErrors = {};
    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else {
      const failedRequirements = PASSWORD_REQUIREMENTS.filter(req => !req.test(newPassword));
      if (failedRequirements.length > 0) {
        newErrors.newPassword = 'Password does not meet all requirements';
      }
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post('/manager/reset-password', {
        email,
        otp,
        newPassword
      });
      Toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      Toast.error(error.response?.data?.message || 'Failed to reset password');
      if (error.response?.data?.message?.includes('OTP')) {
        setActiveStep(1);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box component="form" noValidate onSubmit={handleSendOtp} sx={{ mt: 2, width: '100%' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email address and we'll send you an OTP to reset your password.
            </Typography>
            <FormInput
              required
              name="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({});
              }}
              error={errors.email}
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#DDE2E5' },
                  '&:hover fieldset': { borderColor: '#DDE2E5' },
                  backgroundColor: '#EFF1F94D',
                },
              }}
              fullWidth
              margin="normal"
            />
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={loading}
              sx={{
                mt: 3,
                mb: 2,
                background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                  opacity: 0.9,
                },
              }}
            >
              Send OTP
            </LoadingButton>
          </Box>
        );

      case 1:
        return (
          <Box component="form" noValidate onSubmit={handleVerifyOtp} sx={{ mt: 2, width: '100%' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the 6-digit OTP sent to {email}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <OtpInput
                length={6}
                onComplete={(value) => {
                  setOtp(value);
                  setErrors({});
                }}
              />
            </Box>
            {errors.otp && (
              <Typography color="error" variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                {errors.otp}
              </Typography>
            )}
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={loading}
              disabled={otp.length !== 6}
              sx={{
                mt: 2,
                mb: 2,
                background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                  opacity: 0.9,
                },
              }}
            >
              Verify OTP
            </LoadingButton>
            <Box sx={{ textAlign: 'center' }}>
              {countdown > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Resend OTP in {countdown}s
                </Typography>
              ) : (
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleResendOtp}
                  sx={{ textDecoration: 'none', color: 'primary.main', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  Resend OTP
                </Link>
              )}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box component="form" noValidate onSubmit={handleResetPassword} sx={{ mt: 2, width: '100%' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a new password for your account.
            </Typography>
            <PasswordInput
              required
              name="newPassword"
              label="New Password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              error={errors.newPassword}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#DDE2E5' },
                  '&:hover fieldset': { borderColor: '#DDE2E5' },
                  backgroundColor: '#EFF1F94D',
                },
              }}
              fullWidth
              margin="normal"
            />
            {/* Password Requirements */}
            <Box sx={{
              mt: 1,
              mb: 2,
              p: 1.5,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
              border: '1px solid #e9ecef'
            }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#495057', mb: 1, display: 'block' }}>
                Password Requirements:
              </Typography>
              {PASSWORD_REQUIREMENTS.map((req) => {
                const isMet = newPassword ? req.test(newPassword) : false;
                return (
                  <Box key={req.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                    {isMet ? (
                      <CheckCircleIcon sx={{ fontSize: 14, color: '#28a745' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 14, color: '#dc3545' }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{ color: isMet ? '#28a745' : '#6c757d' }}
                    >
                      {req.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <PasswordInput
              required
              name="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#DDE2E5' },
                  '&:hover fieldset': { borderColor: '#DDE2E5' },
                  backgroundColor: '#EFF1F94D',
                },
              }}
              fullWidth
              margin="normal"
            />
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={loading}
              startIcon={<LockResetIcon />}
              sx={{
                mt: 3,
                mb: 2,
                background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                  opacity: 0.9,
                },
              }}
            >
              Reset Password
            </LoadingButton>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout title="Forgot Password" subtitle="Reset your account password">
      <Box sx={{ width: '100%', mt: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStep()}

        <Grid container justifyContent="center" sx={{ mt: 2 }}>
          <Grid item>
            <Link
              component={RouterLink}
              to="/login"
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              Back to Login
            </Link>
          </Grid>
        </Grid>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPassword;
