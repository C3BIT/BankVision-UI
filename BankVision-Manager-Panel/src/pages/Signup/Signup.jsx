import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Grid, Link, Typography, Stepper, Step, StepLabel } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/common/FormInput';
import PasswordInput from '../../components/common/PasswordInput';
import OtpInput from '../../components/common/OtpInput';
import LoadingButton from '../../components/common/LoadingButton';
import { registerUser, verifyOtp } from '../../redux/auth/authSlice';
import Toast from '../../utils/toast';

// Password requirements matching backend policy
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p) },
];

const COMMON_PASSWORDS = ['password', 'admin', 'test', 'pass', 'letmein', 'welcome', 'qwerty'];

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Signup', 'Verify Email'];
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  
  const [enteredOtp, setEnteredOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (activeStep !== 1) return;
    
    if (timeLeft <= 0) {
      setIsExpired(true);
      Toast.warning('OTP has expired. Please request a new one.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, activeStep]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    else if (formData.name.length < 3) newErrors.name = 'Name must be at least 3 characters long';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';

    // Password validation matching backend policy
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const failedRequirements = PASSWORD_REQUIREMENTS.filter(req => !req.test(formData.password));
      if (failedRequirements.length > 0) {
        newErrors.password = 'Password does not meet all requirements';
      }
      // Check for common passwords
      const lowerPassword = formData.password.toLowerCase();
      if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
        newErrors.password = 'Password is too common or easily guessable';
      }
    }

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await dispatch(registerUser(formData)).unwrap();
      Toast.success('Registration successful! Please verify your email.');
      setActiveStep(1);
    } catch (err) {
      const errorMessage = err.message || 'Failed to send OTP. Please try again.';
      Toast.error(errorMessage);
      setErrors({ submit: errorMessage });
    }
  };

  const handleVerifyOtp = async () => {
    if (isExpired) {
      setEnteredOtp('');
      Toast.warning('OTP has expired. Please resend the code.');
      return;
    }

    try {
      await dispatch(
        verifyOtp({
          email: formData.email,
          otp: enteredOtp,
          username: formData.name,
          password: formData.password,
        })
      ).unwrap();
      Toast.success('Email verified successfully!');
      navigate('/login');
    } catch (err) {
      setEnteredOtp('');
      const errorMessage = err.message || 'Invalid OTP. Please try again.';
      Toast.error(errorMessage);
      setErrors({ otp: errorMessage });
    }
  };

  const handleResendOtp = async () => {
    try {
      await dispatch(registerUser(formData)).unwrap();
      Toast.info('OTP sent successfully. Please check your email.');
      setTimeLeft(120);
      setIsExpired(false);
      setEnteredOtp('');
      setErrors({});
    } catch (err) {
      const errorMessage = err.message || 'Failed to resend OTP. Please try again.';
      Toast.error(errorMessage);
      setErrors({ otp: errorMessage });
    }
  };

  return (
    <AuthLayout 
      title={activeStep === 0 ? "Create Your Account" : "Verify Your Email"}
      subtitle={activeStep === 0 
        ? "Sign up to get started with our application" 
        : `We've sent a 6-digit code to ${formData.email}. Enter it below to continue.`
      }
    >
      <Stepper activeStep={activeStep} sx={{ mb: 4, width: '100%' }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 ? (
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
          <FormInput
            required
            name="name"
            label="Name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            InputProps={{
              startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#DDE2E5',
                },
                '&:hover fieldset': {
                  borderColor: '#DDE2E5',
                },
                backgroundColor: '#EFF1F94D',
              },
            }}
          />
          <FormInput
            required
            name="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            InputProps={{
              startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#DDE2E5',
                },
                '&:hover fieldset': {
                  borderColor: '#DDE2E5',
                },
                backgroundColor: '#EFF1F94D',
              },
            }}
          />
          <PasswordInput
            required
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#DDE2E5',
                },
                '&:hover fieldset': {
                  borderColor: '#DDE2E5',
                },
                backgroundColor: '#EFF1F94D',
              },
            }}
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
              const isMet = formData.password ? req.test(formData.password) : false;
              return (
                <Box key={req.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                  {isMet ? (
                    <CheckCircleIcon sx={{ fontSize: 14, color: '#28a745' }} />
                  ) : (
                    <CancelIcon sx={{ fontSize: 14, color: '#dc3545' }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: isMet ? '#28a745' : '#6c757d',
                      textDecoration: isMet ? 'none' : 'none'
                    }}
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
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#DDE2E5',
                },
                '&:hover fieldset': {
                  borderColor: '#DDE2E5',
                },
                backgroundColor: '#EFF1F94D',
              },
            }}
          />
          {errors.submit && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {errors.submit}
            </Typography>
          )}
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
            Sign Up
          </LoadingButton>
          <Grid container justifyContent="center">
            <Grid item>
              <Link 
                component={RouterLink} 
                to="/login" 
                variant="body2"
                sx={{ color: 'text.secondary' }}
              >
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Time remaining: {formatTime(timeLeft)}
          </Typography>
          <OtpInput
            length={6}
            onComplete={(otp) => setEnteredOtp(otp)}
            inputStyle={{
              width: '40px',
              height: '40px',
              margin: '0 5px',
              border: '1px solid #DDE2E5',
              backgroundColor: '#EFF1F94D',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '16px',
            }}
          />
          {errors.otp && (
            <Typography color="error" align="center" sx={{ mt: 1 }}>
              {errors.otp}
            </Typography>
          )}
          <LoadingButton
            variant="contained"
            fullWidth
            onClick={handleVerifyOtp}
            loading={loading}
            disabled={enteredOtp.length !== 6 || isExpired}
            sx={{ 
              mt: 3,
              background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                opacity: 0.9,
              },
              '&.Mui-disabled': {
                background: '#f5f5f5',
                color: '#bdbdbd',
              },
            }}
          >
            Verify OTP
          </LoadingButton>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Didn't receive code?{' '}
            <LoadingButton
              variant="text"
              size="small"
              onClick={handleResendOtp}
              disabled={loading || timeLeft > 0}
              sx={{
                color: '#13A183',
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
                '&.Mui-disabled': {
                  color: '#bdbdbd',
                },
              }}
            >
              Resend
            </LoadingButton>
          </Typography>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setActiveStep(0)}
              sx={{
                textDecoration: 'none',
                color: '#13A183',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Back to Sign Up
            </Link>
          </Typography>
        </Box>
      )}
    </AuthLayout>
  );
};

export default Signup;