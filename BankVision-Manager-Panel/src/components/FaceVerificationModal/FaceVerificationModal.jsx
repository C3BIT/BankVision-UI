import { useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { compareFaces, fetchCustomerImage } from '../../redux/customer/customerImageSlice';

const FaceVerificationModal = ({ open, onClose, customerName }) => {
  const [currentImage, setCurrentImage] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastProcessedImage, setLastProcessedImage] = useState(null);

  const { socket, initiateFaceVerification, verifyImage } = useWebSocket();
  const { profileImage } = useSelector((state) => state.customerImageInfo);
  const dispatch = useDispatch();

  // Reset modal state when opening
  useEffect(() => {
    if (open) {
      setCurrentImage(null);
      setVerificationResult(null);
      setIsVerifying(false);
      setShowResult(false);
      setLastProcessedImage(null);

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

    try {
      const response = await dispatch(
        compareFaces({
          imagePath1: profileImage,
          imagePath2: capturedImagePath,
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
      setVerificationResult({
        matched: false,
        similarity: 0,
        confidence: 0,
      });
      setShowResult(true);
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

    onClose();
  };

  const handleDecline = () => {
    console.log('❌ Manager declined face verification, requesting retake');

    // Reset state for new capture
    setCurrentImage(null);
    setVerificationResult(null);
    setShowResult(false);
    setLastProcessedImage(null);

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
            <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
              Account most recent image
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '1.125rem', mb: 0.5 }}>
              Current Image
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
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
              backgroundColor: '#F5F5F5',
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
              <Typography sx={{ color: '#999' }}>No profile image</Typography>
            )}
          </Box>

          {/* Current Image */}
          <Box
            sx={{
              flex: 1,
              height: 250,
              backgroundColor: '#F5F5F5',
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
                      backgroundColor: '#10B981',
                      borderRadius: '50%',
                      p: 0.5,
                    }}
                  >
                    <CheckCircle sx={{ color: 'white', fontSize: 32 }} />
                  </Box>
                )}
              </>
            ) : (
              <Typography sx={{ color: '#999' }}>Waiting for capture...</Typography>
            )}
          </Box>
        </Box>

        {/* Verification Result */}
        {showResult && verificationResult && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {matchPercentage}% Matched
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#666', mb: 1 }}>
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
                  backgroundColor: matchPercentage >= 90 ? '#10B981' : '#EF4444',
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
                backgroundColor: '#0066FF',
                borderRadius: '8px',
                '&:hover': { backgroundColor: '#0052CC' },
              }}
            >
              Capture Image
            </Button>
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
                    backgroundColor: '#4CAF50',
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: '#43A047' },
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
                    borderColor: '#FF9800',
                    color: '#FF9800',
                    borderRadius: '8px',
                    '&:hover': {
                      borderColor: '#F57C00',
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
                    backgroundColor: '#EF4444',
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
                    borderColor: '#0066FF',
                    color: '#0066FF',
                    borderRadius: '8px',
                    flex: 1,
                    '&:hover': {
                      borderColor: '#0052CC',
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
