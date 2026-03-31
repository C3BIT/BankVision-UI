import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Alert,
  Chip,
  Snackbar,
} from '@mui/material';
import { CheckCircle, Error, RemoveRedEye, Warning } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { compareFaces, fetchCustomerImage } from '../../redux/customer/customerImageSlice';

const FaceVerificationPanel = ({ customerName }) => {
  const [captureState, setCaptureState] = useState('initial'); // initial, capturing, captured, error
  const [verificationStatus, setVerificationStatus] = useState('initial'); // initial, processing, success, failed
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [eyeBlinkPassed, setEyeBlinkPassed] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // Timeout refs for cleanup
  const captureTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  const {
    socket,
    requestRetakeImage,
    initiateFaceVerification,
    verifyFaceClientSide,
    faceApiReady,
    currentCall,
    verifyImage,
  } = useWebSocket();

  const { profileImage } = useSelector((state) => state.customerImageInfo);
  const dispatch = useDispatch();

  // Fetch customer profile image on mount
  useEffect(() => {
    if (customerName) {
      dispatch(fetchCustomerImage({ phone: customerName }));
    }
  }, [customerName, dispatch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Listen for captured image from customer
  useEffect(() => {
    if (!socket) return;

    const handleReceivedImage = (data) => {
      console.log("📷 Manager received image from customer:", data);
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
      }
      
      setCurrentImage(data.imagePath);
      setCaptureState('captured');
      setIsLoading(false);
      setErrorMessage(null);
      setEyeBlinkPassed(true);
    };

    const handleVerificationError = (error) => {
      console.error("❌ Face verification error:", error);
      setCaptureState('error');
      setIsLoading(false);
      setErrorMessage(error.message || "Failed to initiate face verification");
      setSnackbarOpen(true);
      
      // Auto-reset after 5 seconds
      retryTimeoutRef.current = setTimeout(() => {
        resetToInitial();
      }, 5000);
    };

    const handleCaptureTimeout = () => {
      console.warn("⏱️ Capture timeout - customer didn't respond");
      setCaptureState('error');
      setIsLoading(false);
      setErrorMessage("Customer didn't respond. Please try again.");
      setSnackbarOpen(true);
    };

    socket.on('manager:received-image-link', handleReceivedImage);
    socket.on('manager:face-verification-error', handleVerificationError);
    socket.on('manager:capture-timeout', handleCaptureTimeout);

    return () => {
      socket.off('manager:received-image-link', handleReceivedImage);
      socket.off('manager:face-verification-error', handleVerificationError);
      socket.off('manager:capture-timeout', handleCaptureTimeout);
    };
  }, [socket]);

  const resetToInitial = () => {
    setCaptureState('initial');
    setVerificationStatus('initial');
    setCurrentImage(null);
    setVerificationResult(null);
    setEyeBlinkPassed(false);
    setErrorMessage(null);
    setIsLoading(false);
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const handleCaptureImage = () => {
    console.log('📸 Capture Image button clicked');
    console.log('📸 currentCall:', currentCall);
    console.log('📸 profileImage:', profileImage);
    console.log('📸 isLoading:', isLoading);
    
    // Validate prerequisites
    if (!currentCall) {
      console.warn('⚠️ No current call found');
      setErrorMessage("No active call. Please ensure you have an active call with the customer.");
      setSnackbarOpen(true);
      return;
    }

    if (!profileImage) {
      console.warn('⚠️ No profile image found');
      setErrorMessage("Customer profile image not available. Please wait for it to load.");
      setSnackbarOpen(true);
      return;
    }

    // Reset any previous errors
    setErrorMessage(null);
    setCaptureState('capturing');
    setIsLoading(true);

    // Set timeout (30 seconds) - if no response, show error
    captureTimeoutRef.current = setTimeout(() => {
      console.warn('⏱️ Capture timeout - no response from customer');
      setCaptureState('error');
      setIsLoading(false);
      setErrorMessage("Request timed out. Customer may not be ready. Please try again.");
      setSnackbarOpen(true);
    }, 30000);

    // Initiate face verification
    console.log('📸 Calling initiateFaceVerification...');
    const success = initiateFaceVerification();
    console.log('📸 initiateFaceVerification returned:', success);
    if (!success) {
      // Error already logged in initiateFaceVerification
      console.error('❌ Failed to initiate face verification');
      setCaptureState('error');
      setIsLoading(false);
      setErrorMessage("Failed to send request. Please check your connection and try again.");
      setSnackbarOpen(true);
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
      }
    } else {
      console.log('✅ Face verification initiated successfully');
    }
  };

  const handleVerifyFace = async () => {
    if (!currentImage || !profileImage) {
      setErrorMessage("Missing images. Please capture again.");
      setSnackbarOpen(true);
      return;
    }

    setVerificationStatus('processing');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let response;

      if (faceApiReady) {
        // Client-side verification using face-api.js
        const clientResult = await verifyFaceClientSide(currentImage, profileImage);
        response = {
          imageMatched: clientResult.matched,
          similarity: clientResult.similarity,
          confidence: clientResult.confidence || clientResult.similarity,
          provider: 'face-api.js (client)',
        };
      } else {
        // Server-side verification using OpenCV
        response = await dispatch(
          compareFaces({
            imagePath1: profileImage,
            imagePath2: currentImage,
          })
        ).unwrap();
        response.provider = 'OpenCV (server)';
      }

      setVerificationResult(response);

      if (response.imageMatched) {
        setVerificationStatus('success');
      } else {
        setVerificationStatus('failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('failed');
      setVerificationResult({ 
        similarity: 0, 
        confidence: 0, 
        imageMatched: false,
        error: error.message || 'Verification failed'
      });
      setErrorMessage(error.message || "Verification failed. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    resetToInitial();
    requestRetakeImage();
    // Re-initiate after a brief delay
    setTimeout(() => {
      handleCaptureImage();
    }, 500);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box>
      {/* Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="error" 
          sx={{ width: '100%' }}
          icon={<Warning />}
        >
          {errorMessage || "An error occurred"}
        </Alert>
      </Snackbar>

      {/* Recent Image Section */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A1A1A',
            mb: 1,
          }}
        >
          Recent Image
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#666666',
            mb: 1.5,
          }}
        >
          Account most recent image
        </Typography>

        <Card
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #E0E0E0',
            height: 180,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#FAFAFA',
          }}
        >
          {profileImage ? (
            <CardMedia
              component="img"
              image={profileImage}
              alt="Account Image"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <CircularProgress size={24} sx={{ mb: 1 }} />
              <Typography sx={{ color: '#999999', fontSize: '0.875rem' }}>
                Loading profile image...
              </Typography>
            </Box>
          )}
        </Card>
      </Box>

      {/* Current Image Section */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A1A1A',
            mb: 1,
          }}
        >
          Current Image
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#666666',
            mb: 1.5,
          }}
        >
          Current video call image
        </Typography>

        <Card
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #E0E0E0',
            height: 180,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#FAFAFA',
            position: 'relative',
          }}
        >
          {isLoading && captureState === 'capturing' ? (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 2, fontSize: '0.875rem', color: '#666666' }}>
                Waiting for customer...
              </Typography>
            </Box>
          ) : captureState === 'error' ? (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Error sx={{ fontSize: 48, color: '#FF4444', mb: 1 }} />
              <Typography sx={{ fontSize: '0.875rem', color: '#FF4444' }}>
                {errorMessage || "Request failed"}
              </Typography>
            </Box>
          ) : currentImage ? (
            <>
              <CardMedia
                component="img"
                image={currentImage}
                alt="Current Image"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </>
          ) : (
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '2px dashed #E0E0E0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 50,
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  border: '2px solid #E0E0E0',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: '60%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 20,
                    height: 15,
                    borderRadius: '0 0 50% 50%',
                    border: '2px solid #E0E0E0',
                    borderTop: 'none',
                  }}
                />
              </Box>
            </Box>
          )}
        </Card>

        {/* Eye Blinking Indicator */}
        {eyeBlinkPassed && currentImage && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <RemoveRedEye sx={{ fontSize: 16, color: '#666666' }} />
            <Typography sx={{ fontSize: '0.75rem', color: '#666666' }}>
              Eye Blinking
            </Typography>
            <Chip
              label="Passed"
              size="small"
              sx={{
                backgroundColor: '#E5F7E5',
                color: '#4CAF50',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 20,
              }}
            />
          </Box>
        )}
      </Box>

      {/* Verification Result */}
      {verificationStatus === 'success' && verificationResult && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Alert
            severity="success"
            icon={<CheckCircle />}
            sx={{
              borderRadius: 2,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Face Verified Successfully
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
              Similarity: {verificationResult.similarity?.toFixed(2)}% | 
              Confidence: {verificationResult.confidence?.toFixed(2)}%
            </Typography>
          </Alert>
        </Box>
      )}

      {verificationStatus === 'failed' && verificationResult && (
        <Alert
          severity="error"
          icon={<Error />}
          sx={{
            mb: 2,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Verification Failed
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
            Similarity: {verificationResult.similarity?.toFixed(2)}% (Required: ≥90%)
            {verificationResult.error && ` - ${verificationResult.error}`}
          </Typography>
        </Alert>
      )}

      {/* Action Buttons */}
      {captureState === 'initial' && (
        <Button
          fullWidth
          onClick={handleCaptureImage}
          disabled={isLoading}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            backgroundColor: '#0066FF',
            color: '#FFFFFF',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#0052CC',
            },
            '&.Mui-disabled': {
              backgroundColor: '#E0E0E0',
              color: '#999999',
            },
          }}
          variant="contained"
        >
          {isLoading ? 'Processing...' : (!profileImage ? 'Loading Profile Image...' : 'Capture Image')}
        </Button>
      )}

      {captureState === 'captured' && currentImage && verificationStatus === 'initial' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            fullWidth
            onClick={handleVerifyFace}
            disabled={!profileImage || isLoading}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              backgroundColor: '#0066FF',
              color: '#FFFFFF',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#0052CC',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E0E0E0',
                color: '#999999',
              },
            }}
            variant="contained"
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ color: '#FFFFFF', mr: 1 }} />
                Verifying...
              </>
            ) : (
              'Verify Now'
            )}
          </Button>

          <Button
            fullWidth
            onClick={handleRetake}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#666666',
              borderColor: '#E0E0E0',
              borderRadius: '8px',
              '&:hover': {
                borderColor: '#999999',
                backgroundColor: 'transparent',
              },
            }}
            variant="outlined"
          >
            Retake
          </Button>
        </Box>
      )}

      {/* Action buttons after verification (success or failed) - Always show Decline and Recapture */}
      {(verificationStatus === 'success' || verificationStatus === 'failed') && verificationResult && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', width: '100%' }}>
          {/* Accept button - only show when verification succeeded */}
          {verificationStatus === 'success' && (
            <Button
              fullWidth
              onClick={() => {
                verifyImage('verified');
                resetToInitial();
              }}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                borderRadius: '8px',
                maxWidth: '100%',
                '&:hover': {
                  backgroundColor: '#43A047',
                },
              }}
              variant="contained"
            >
              Accept
            </Button>
          )}
          
          {/* Decline and Recapture buttons - always available regardless of match score */}
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              fullWidth
              onClick={() => {
                verifyImage('rejected');
                resetToInitial();
              }}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                backgroundColor: '#FF4444',
                color: '#FFFFFF',
                borderRadius: '8px',
                flex: 1,
                '&:hover': {
                  backgroundColor: '#D32F2F',
                },
              }}
              variant="contained"
            >
              Decline
            </Button>
            <Button
              fullWidth
              onClick={handleRetake}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                borderColor: '#0066FF',
                color: '#0066FF',
                borderRadius: '8px',
                flex: 1,
                '&:hover': {
                  borderColor: '#0052CC',
                  backgroundColor: '#E3F2FD',
                },
              }}
              variant="outlined"
            >
              Recapture
            </Button>
          </Box>
        </Box>
      )}

      {/* Error state - show retry button */}
      {captureState === 'error' && verificationStatus !== 'success' && verificationStatus !== 'failed' && (
        <Button
          fullWidth
          onClick={handleRetake}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            backgroundColor: '#FF9800',
            color: '#FFFFFF',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#F57C00',
            },
          }}
          variant="contained"
        >
          Retry
        </Button>
      )}

      {verificationStatus === 'processing' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

FaceVerificationPanel.propTypes = {
  customerName: PropTypes.string.isRequired,
};

export default FaceVerificationPanel;
