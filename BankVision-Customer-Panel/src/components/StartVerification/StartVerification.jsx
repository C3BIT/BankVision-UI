import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import axios from 'axios';

const StartVerification = ({ onVerified, disabled = false }) => {
  const [verificationMethod, setVerificationMethod] = useState('phone'); // 'phone' or 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTouched, setIsTouched] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const validPrefixes = ['013', '014', '015', '016', '017', '018', '019'];

  const isValidPhone = (phone) => {
    return phone.length === 11 && validPrefixes.includes(phone.substring(0, 3));
  };

  const isValidEmail = (email) => {
    return email.includes('@') && email.includes('.') && email.length > 5;
  };

  const handleMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setVerificationMethod(newMethod);
      setOtpSent(false);
      setOtp('');
      setError('');
      setIsTouched(false);
    }
  };

  const handlePhoneChange = (e) => {
    const input = e.target.value.replace(/\D/g, '');
    if (input.length <= 11) {
      setPhone(input);
      setError('');
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };

  const handleSendOtp = async () => {
    if (verificationMethod === 'phone') {
      if (!isValidPhone(phone)) {
        setError('Please enter a valid 11-digit phone number');
        setIsTouched(true);
        return;
      }
    } else {
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        setIsTouched(true);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (verificationMethod === 'phone') {
        response = await axios.post(`${API_URL}/otp/send-phone`, {
          phone: phone,
        });
      } else {
        response = await axios.post(`${API_URL}/otp/send`, {
          email: email,
        });
      }

      console.log('📋 Full response:', response);
      console.log('📋 response.data:', response.data);
      console.log('📋 response.data.success:', response.data?.success);
      console.log('📋 response.status:', response.status);

      // Check multiple possible success indicators
      const isSuccess = response.data?.success === true ||
        response.data?.status === 'success' ||
        response.status === 200;

      if (isSuccess) {
        console.log('✅ OTP sent successfully, setting otpSent to true');
        console.log('📋 Current otpSent state before update:', otpSent);

        // Force state update
        setOtpSent(true);
        setError('');

        // Use a callback to verify state update
        setTimeout(() => {
          console.log('📋 State update triggered, checking if otpSent is true...');
          // Force a re-render check
          const checkState = () => {
            console.log('🔍 Checking DOM for OTP section...');
            const otpSection = document.querySelector('[data-testid="otp-verification-section"]');
            console.log('🔍 OTP section found:', otpSection);

            if (otpSection) {
              console.log('✅ OTP section is in DOM!');
              otpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Find and focus OTP input
              const otpInput = document.querySelector('#otp-input-field') ||
                document.querySelector('input[placeholder="000000"]');
              if (otpInput) {
                otpInput.focus();
                console.log('✅ OTP input focused');
              }
            } else {
              console.error('❌ OTP section NOT found in DOM! Component may not have re-rendered.');
            }
          };

          // Check immediately and again after a delay
          checkState();
          setTimeout(checkState, 100);
        }, 100);
      } else {
        const errorMsg = response.data?.message || 'Failed to send OTP';
        console.error('❌ OTP send failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);

      // Better error messages for email OTP
      let errorMessage = 'Failed to send OTP. Please try again.';

      if (verificationMethod === 'email') {
        // Safely extract error message
        const errorResponse = error.response?.data?.message || error.message || '';
        const errorString = String(errorResponse); // Convert to string to avoid .includes() errors

        if (errorString.includes('authentication') || errorString.includes('Invalid login') || errorString.includes('EAUTH')) {
          errorMessage = 'Email service configuration error. Please contact support or use phone verification.';
        } else if (errorString.includes('unavailable') || errorString.includes('ECONNREFUSED') || errorString.includes('ECONNECTION')) {
          errorMessage = 'Email service is temporarily unavailable. Please try phone verification or try again later.';
        } else if (errorString.includes('Invalid email') || errorString.includes('email format')) {
          errorMessage = 'Invalid email address. Please check and try again.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error occurred. Email service may be unavailable. Please try phone verification or contact support.';
        } else if (errorString) {
          errorMessage = errorString;
        } else {
          errorMessage = 'Failed to send email OTP. Please try phone verification or contact support.';
        }
      } else {
        // Phone OTP error handling
        const errorResponse = error.response?.data?.message || error.message || '';
        errorMessage = String(errorResponse) || 'Failed to send OTP. Please try again.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (verificationMethod === 'phone') {
        response = await axios.post(`${API_URL}/otp/verify-phone`, {
          phone: phone,
          otp: otp,
        });
      } else {
        response = await axios.post(`${API_URL}/otp/verify-email`, {
          email: email,
          otp: otp,
        });
      }

      console.log('📋 OTP verification response:', response.data);

      // Check multiple success indicators
      const isVerified = response.data?.success === true ||
        response.data?.isVerified === true ||
        response.data?.isEmailVerified === true ||
        response.status === 200;

      if (isVerified) {
        console.log('✅ OTP verified successfully! Calling onVerified callback...');
        // Pass verification info to parent
        const verificationData = {
          method: verificationMethod,
          phoneOrEmail: verificationMethod === 'phone' ? phone : email,
        };
        console.log('📋 Verification data to pass:', verificationData);
        onVerified(verificationData);
      } else {
        const errorMsg = response.data?.message || 'Invalid OTP. Please try again.';
        console.error('❌ OTP verification failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isInputValid = verificationMethod === 'phone'
    ? isValidPhone(phone)
    : isValidEmail(email);

  const isError = isTouched && !isInputValid;

  // Debug: Log current state
  console.log('🔍 StartVerification render - otpSent:', otpSent, 'verificationMethod:', verificationMethod);

  // Effect to track otpSent changes
  useEffect(() => {
    console.log('🔄 otpSent state changed to:', otpSent);
    if (otpSent) {
      console.log('✅ OTP sent state is TRUE - OTP input section should be visible');
      // Force a small delay to ensure DOM is updated
      setTimeout(() => {
        const otpSection = document.querySelector('[data-testid="otp-verification-section"]');
        if (otpSection) {
          console.log('✅ OTP section found in DOM after state change');
          otpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.error('❌ OTP section NOT found even though otpSent is true!');
        }
      }, 50);
    }
  }, [otpSent]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Method Selection */}
      {!otpSent && (
        <>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#666666',
              mb: 2,
            }}
          >
            Start with
          </Typography>

          <ToggleButtonGroup
            value={verificationMethod}
            exclusive
            onChange={handleMethodChange}
            fullWidth
            sx={{
              mb: 3,
              '& .MuiToggleButton-root': {
                py: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                border: '1px solid #E0E0E0',
                '&.Mui-selected': {
                  backgroundColor: '#0066FF',
                  color: '#FFFFFF',
                  borderColor: '#0066FF',
                  '&:hover': {
                    backgroundColor: '#0052CC',
                  },
                },
              },
            }}
          >
            <ToggleButton value="phone" aria-label="phone">
              <PhoneIcon sx={{ mr: 1 }} />
              Phone Number
            </ToggleButton>
            <ToggleButton value="email" aria-label="email">
              <EmailIcon sx={{ mr: 1 }} />
              Email Address
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Phone Input */}
          {verificationMethod === 'phone' && (
            <>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#666666',
                  mb: 1,
                }}
              >
                Mobile Number
              </Typography>
              <TextField
                fullWidth
                placeholder="Ex: 017XXXXXXXX"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => setIsTouched(true)}
                error={isError}
                helperText={isError ? "Please enter a valid Bangladeshi phone number" : ""}
                margin="none"
                variant="outlined"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    fontSize: '1rem',
                    '& fieldset': {
                      borderColor: isError ? '#FF4444' : '#E0E0E0',
                    },
                    '&:hover fieldset': {
                      borderColor: isError ? '#FF4444' : '#0066FF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: isError ? '#FF4444' : '#0066FF',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputBase-input': {
                    padding: '14px 16px',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ color: '#666666', fontWeight: 500 }}>
                        +88
                      </Typography>
                    </InputAdornment>
                  ),
                }}
              />
              <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                This phone number will be visible to the manager to verify your identity. The OTP code will not be visible to the manager.
              </Alert>
            </>
          )}

          {/* Email Input */}
          {verificationMethod === 'email' && (
            <>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#666666',
                  mb: 1,
                }}
              >
                Email Address
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => setIsTouched(true)}
                error={isError}
                helperText={isError ? "Please enter a valid email address" : ""}
                margin="none"
                variant="outlined"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    fontSize: '1rem',
                    '& fieldset': {
                      borderColor: isError ? '#FF4444' : '#E0E0E0',
                    },
                    '&:hover fieldset': {
                      borderColor: isError ? '#FF4444' : '#0066FF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: isError ? '#FF4444' : '#0066FF',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputBase-input': {
                    padding: '14px 16px',
                  },
                }}
              />
              <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                This email address will be visible to the manager to verify your identity. The OTP code will not be visible to the manager.
              </Alert>
            </>
          )}

          {/* Send OTP Button */}
          <Button
            fullWidth
            variant="contained"
            disabled={!isInputValid || loading || disabled}
            onClick={handleSendOtp}
            sx={{
              py: 1.75,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#FFFFFF',
              backgroundColor: '#0066FF',
              borderRadius: '8px',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#0052CC',
                boxShadow: 'none',
                transform: 'translateY(-1px)',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E0E0E0',
                color: '#999999',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </Button>
        </>
      )}

      {/* OTP Verification - ALWAYS SHOW WHEN OTP IS SENT */}
      {otpSent && (
        <Box
          sx={{
            width: '100%',
            mt: 2,
            p: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: 2,
            border: '2px solid #0066FF',
          }}
          data-testid="otp-verification-section"
        >
          {console.log('✅ Rendering OTP verification section - otpSent is true')}
          <Alert
            severity="success"
            sx={{
              mb: 3,
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
                width: '100%',
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              ✅ OTP Sent Successfully!
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {verificationMethod === 'phone'
                ? `OTP has been sent to +88${phone}. Please check your SMS and enter the 6-digit code below.`
                : `OTP has been sent to ${email}. Please check your email inbox (and spam folder) and enter the 6-digit code below.`
              }
            </Typography>
          </Alert>

          <Box sx={{
            mb: 2,
            p: 2,
            backgroundColor: '#F5F5F5',
            borderRadius: 2,
            border: '2px solid #0066FF',
          }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#0066FF',
                mb: 1.5,
                textAlign: 'center',
              }}
            >
              Enter Your 6-Digit OTP Code
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, fontSize: '0.8125rem', borderRadius: 2 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="OTP Code"
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                const input = e.target.value.replace(/\D/g, '');
                if (input.length <= 6) {
                  setOtp(input);
                }
              }}
              autoFocus
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.8rem',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  '& fieldset': {
                    borderColor: '#0066FF',
                    borderWidth: 3,
                  },
                  '&:hover fieldset': {
                    borderColor: '#0052CC',
                    borderWidth: 3,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0066FF',
                    borderWidth: 3,
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '18px',
                  textAlign: 'center',
                  letterSpacing: '0.8rem',
                  fontWeight: 700,
                },
                '& .MuiInputLabel-root': {
                  fontWeight: 600,
                },
              }}
              inputProps={{
                maxLength: 6,
                inputMode: 'numeric',
                pattern: '[0-9]*',
                id: 'otp-input-field',
              }}
            />

            <Button
              fullWidth
              variant="contained"
              disabled={loading || !otp || otp.length !== 6 || disabled}
              onClick={handleVerifyOtp}
              sx={{
                py: 1.75,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                color: '#FFFFFF',
                backgroundColor: '#0066FF',
                borderRadius: '8px',
                boxShadow: 'none',
                mb: 1,
                mt: 2,
                '&:hover': {
                  backgroundColor: '#0052CC',
                  boxShadow: 'none',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#E0E0E0',
                  color: '#999999',
                },
              }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Verifying...' : 'Verify & Start Call'}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setError('');
              }}
              disabled={loading || disabled}
              sx={{
                textTransform: 'none',
                color: '#666666',
              }}
            >
              Change {verificationMethod === 'phone' ? 'Phone Number' : 'Email'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

StartVerification.propTypes = {
  onVerified: PropTypes.func.isRequired, // onVerified({ method: 'phone'|'email', phoneOrEmail: '...' })
  disabled: PropTypes.bool,
};

StartVerification.defaultProps = {
  disabled: false,
};

export default StartVerification;
