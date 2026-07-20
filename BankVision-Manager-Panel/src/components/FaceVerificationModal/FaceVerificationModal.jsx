import { useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { compareFaces, fetchCustomerImage } from '../../redux/customer/customerImageSlice';
import { colors } from '../../styles/tokens';

const FaceVerificationModal = ({ open, onClose, customerName }) => {
  const [currentImage, setCurrentImage] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastProcessedImage, setLastProcessedImage] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const { socket, initiateFaceVerification, verifyImage } = useWebSocket();
  const { profileImage } = useSelector((state) => state.customerImageInfo);
  const { accountDetails, cbsAccounts } = useSelector((state) => state.customerAccounts);
  const dispatch = useDispatch();

  // Reset modal state when opening
  useEffect(() => {
    if (open) {
      setCurrentImage(null);
      setVerificationResult(null);
      setIsVerifying(false);
      setShowResult(false);
      setLastProcessedImage(null);
      setVerifyError(null);

      if (customerName) {
        dispatch(fetchCustomerImage({ phone: customerName }));
      }
    }
  }, [open, customerName, dispatch]);

  useEffect(() => {
    if (!socket || !open) return;

    const handleReceivedImage = (data) => {
      // Prevent processing the same image twice
      if (lastProcessedImage === data.imagePath) {
        console.log('⚠️ Skipping duplicate image:', data.imagePath);
        return;
      }

      console.log('📸 Processing new captured image:', data.imagePath);
      setLastProcessedImage(data.imagePath);
      setCurrentImage(data.imagePath);
      handleVerify(data.imagePath);
    };

    socket.on('manager:received-image-link', handleReceivedImage);

    return () => {
      socket.off('manager:received-image-link', handleReceivedImage);
    };
  }, [socket, open, profileImage, lastProcessedImage]);

  const handleCaptureImage = () => {
    initiateFaceVerification(); // Use the new function
  };

  const handleVerify = async (capturedImagePath) => {
    setIsVerifying(true);
    setShowResult(false);
    setVerifyError(null);

    try {
      const response = await dispatch(
        compareFaces({
          imagePath1: profileImage,
          imagePath2: capturedImagePath,
          accountNo: accountDetails?.accountNumber || cbsAccounts?.[0]?.accountNumber,
        })
      ).unwrap();

      setVerificationResult({
        matched: response.imageMatched,
        similarity: response.similarity || 0,
        confidence: response.confidence || response.similarity || 0,
      });
      setShowResult(true);
    } catch (error) {
      console.error('Verification error:', error);
      // A failed API/service call (OpenCV down, timeout, etc.) is NOT the same
      // as a legitimate face mismatch — surface it distinctly instead of
      // silently rendering a fake "0% no-match" result.
      setVerifyError(
        error?.message || error?.error?.message || 'Face verification service failed. Please retry.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAccept = () => {
    console.log('✅ Manager accepted face verification');
    // Update face verification status and emit to customer
    verifyImage('verified');

    // Reset state and close modal
    setCurrentImage(null);
    setVerificationResult(null);
    setShowResult(false);
    setIsVerifying(false);
    setLastProcessedImage(null);
    setVerifyError(null);

    onClose();
  };

  const handleDecline = () => {
    console.log('❌ Manager declined face verification, requesting retake');

    // Reset state for new capture
    setCurrentImage(null);
    setVerificationResult(null);
    setShowResult(false);
    setLastProcessedImage(null);
    setVerifyError(null);

    // Request retake
    socket.emit('manager:request-retake-image', {
      timestamp: Date.now(),
    });
  };

  const handleClose = () => {
    console.log('🚪 Closing face verification modal without action');

    // Reset all state
    setCurrentImage(null);
    setVerificationResult(null);
    setShowResult(false);
    setIsVerifying(false);
    setLastProcessedImage(null);
    setVerifyError(null);

    onClose();
  };

  const isMatched = verificationResult?.matched;
  const matchPercentage = Math.round(verificationResult?.similarity || 0);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: '600px',
          maxWidth: '90vw',
        },
      }}
    >
      <Box sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 0.5 }}>
              Recent Image
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: colors.textSecondary }}>
              Account most recent image
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 0.5 }}>
              Current Image
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: colors.textSecondary }}>
              Current video call image
            </Typography>
          </Box>
        </Box>

        {/* Image Comparison */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {/* Recent Image */}
          <Box
            sx={{
              flex: 1,
              height: 250,
              backgroundColor: colors.background,
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Recent"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Typography sx={{ color: colors.textMuted }}>No profile image</Typography>
            )}
          </Box>

          {/* Current Image */}
          <Box
            sx={{
              flex: 1,
              height: 250,
              backgroundColor: colors.background,
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {isVerifying ? (
              <CircularProgress />
            ) : currentImage ? (
              <>
                <img
                  src={currentImage}
                  alt="Current"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {isMatched && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: colors.success,
                      borderRadius: '50%',
                      p: 0.5,
                    }}
                  >
                    <CheckCircle sx={{ color: 'white', fontSize: 32 }} />
                  </Box>
                )}
              </>
            ) : (
              <Typography sx={{ color: colors.textMuted }}>Waiting for capture...</Typography>
            )}
          </Box>
        </Box>

        {/* Service/network error — distinct from a legitimate mismatch */}
        {verifyError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {verifyError}
          </Alert>
        )}

        {/* Verification Result */}
        {showResult && verificationResult && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {matchPercentage}% Matched
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: colors.textSecondary, mb: 1 }}>
              At least 90% have to be matched to proceed
            </Typography>
            <LinearProgress
              variant="determinate"
              value={matchPercentage}
              sx={{
                height: 8,
                borderRadius: 1,
                backgroundColor: '#E5E7EB',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: matchPercentage >= 90 ? colors.success : colors.error,
                  borderRadius: 1,
                },
              }}
            />
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', width: '100%' }}>
          {!currentImage && !isVerifying && (
            <Button
              fullWidth
              variant="contained"
              onClick={handleCaptureImage}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                backgroundColor: colors.primary,
                borderRadius: '8px',
                '&:hover': { backgroundColor: colors.primaryDark },
              }}
            >
              Capture Image
            </Button>
          )}

          {/* Service/network error — offer retry (same image) or recapture (new image) */}
          {verifyError && !isVerifying && (
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => handleVerify(currentImage)}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  backgroundColor: colors.primary,
                  borderRadius: '8px',
                  flex: 1,
                  '&:hover': { backgroundColor: colors.primaryDark },
                }}
              >
                Retry Verification
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleDecline}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderColor: colors.primary,
                  color: colors.primary,
                  borderRadius: '8px',
                  flex: 1,
                  '&:hover': {
                    borderColor: colors.primaryDark,
                    backgroundColor: '#E3F2FD',
                  },
                }}
              >
                Recapture
              </Button>
            </Box>
          )}

          {/* Action buttons - Always show Decline and Recapture regardless of match result */}
          {showResult && verificationResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
              {/* Accept button - show when matched, Accept Anyway when not matched */}
              {isMatched ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAccept}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    backgroundColor: colors.success,
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: colors.success },
                  }}
                >
                  Accept
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleAccept}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderColor: colors.warning,
                    color: colors.warning,
                    borderRadius: '8px',
                    '&:hover': {
                      borderColor: colors.warning,
                      backgroundColor: '#FFF3E0',
                    },
                  }}
                >
                  Accept Anyway
                </Button>
              )}
              
              {/* Decline and Recapture buttons - always available */}
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleDecline}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    backgroundColor: colors.error,
                    borderRadius: '8px',
                    flex: 1,
                    '&:hover': { backgroundColor: '#DC2626' },
                  }}
                >
                  Decline
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleDecline}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderColor: colors.primary,
                    color: colors.primary,
                    borderRadius: '8px',
                    flex: 1,
                    '&:hover': {
                      borderColor: colors.primaryDark,
                      backgroundColor: '#E3F2FD',
                    },
                  }}
                >
                  Recapture
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

FaceVerificationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customerName: PropTypes.string,
};

export default FaceVerificationModal;
