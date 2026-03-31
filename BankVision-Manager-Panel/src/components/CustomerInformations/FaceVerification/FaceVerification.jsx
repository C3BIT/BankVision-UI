import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  Container,
  Alert,
  Stack,
  CircularProgress,
  LinearProgress,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { FaceRetouchingNatural, CheckCircle, CameraAlt, Replay, Error, Psychology, ThumbUp, ThumbDown, Cancel } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { compareFaces, fetchCustomerImage } from '../../../redux/customer/customerImageSlice';
import EmotionDisplay from '../../EmotionDisplay';

const FaceVerification = ({
  customerName,
  onComplete,
}) => {

  const [captureState, setCaptureState] = useState('initial');
  const [capturePhase, setCapturePhase] = useState('initial_request');
  const [verificationStatus, setVerificationStatus] = useState("initial");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [managerDecision, setManagerDecision] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [useClientSide, setUseClientSide] = useState(true);
  const [detectedEmotions, setDetectedEmotions] = useState(null);
  const [managerNotifyingCustomer, setManagerNotifyingCustomer] = useState(false);

  const {
    socket,
    requestRetakeImage,
    requestCaptureImage,
    verifyFaceClientSide,
    faceApiReady,
    customerEmotions,
    initiateFaceVerification, // New emit function
    customerStartedCapture, // New state from useWebSocket
    customerAcknowledgedNotification, // New state from useWebSocket
  } = useWebSocket();
  const { profileImage } = useSelector((state) => state.customerImageInfo);
  const dispatch = useDispatch();

  useEffect(() => {
    if (customerName) {
      dispatch(fetchCustomerImage({ phone: customerName }));
    }
  }, [customerName, dispatch]);

  useEffect(() => {
    if (!socket) return;

    const handleReceivedImage = (data) => {
      setCurrentImage(data.imagePath);
      setCapturePhase('image_captured_ready_to_verify');
      setIsLoading(false);
    };

    socket.on('manager:received-image-link', handleReceivedImage);

    return () => {
      socket.off('manager:received-image-link', handleReceivedImage);
    };
  }, [socket]);

  useEffect(() => {
    if (showProgress && verificationResult) {
      const targetValue = verificationResult.similarity || 0;
      let currentValue = 0;
      const increment = targetValue / 50;
      
      const interval = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
          setProgressValue(targetValue);
          clearInterval(interval);
        } else {
          setProgressValue(currentValue);
        }
      }, 20);

      return () => clearInterval(interval);
    }
  }, [showProgress, verificationResult]);

  useEffect(() => {
    // Listen for customer starting the capture (this is NOT customerAcknowledgedNotification)
    if (customerStartedCapture && capturePhase === 'customer_notified' && isLoading) {
      // Customer has started the countdown, manager UI should reflect this
      // Optionally, set isLoading to false here if you want manager to initiate capture manually
      // For now, assume manager clicks start capture after seeing customer is ready
      setIsLoading(false); // Reset loading state after notification is acknowledged by customer action
    }
  }, [customerStartedCapture, capturePhase, isLoading]);

  useEffect(() => {
    if (customerAcknowledgedNotification && managerNotifyingCustomer) {
      setIsLoading(false);
      setManagerNotifyingCustomer(false);
    }
  }, [customerAcknowledgedNotification, managerNotifyingCustomer]);

  const handleNotifyCustomer = () => {
    setIsLoading(true); // Set loading for notification
    setManagerNotifyingCustomer(true); // Manager is actively notifying customer
    if (initiateFaceVerification) { // Add check here
      initiateFaceVerification(); // Only notify customer
    } else {
      console.error("Error: initiateFaceVerification is not a function or is undefined.");
      setIsLoading(false); // Reset loading if function is missing
      setManagerNotifyingCustomer(false); // Reset notifying state
      return;
    }
    setCapturePhase('customer_notified');
    setVerificationStatus('initial'); // Reset verification status
    setShowProgress(false); // Hide progress
    setVerificationResult(null); // Clear previous results
    setCurrentImage(null); // Clear any previous captured image
    console.log("DEBUG: Manager clicked 'Notify Customer'. customerAcknowledgedNotification:", customerAcknowledgedNotification); // Added log
  };

  const handleStartCapture = () => {
    setIsLoading(true); // Set loading for capture initiation
    requestCaptureImage(); // Only trigger countdown and capture
    setCapturePhase('capturing_in_progress');
    // isLoading will be reset by socket.on('manager:received-image-link')
  };

  const handleRetakeImage = () => {
    requestRetakeImage();
    setCapturePhase('customer_notified'); // Go back to 'customer_notified' after retake
    setCurrentImage(null);
    setVerificationStatus('initial');
    setShowProgress(false);
    setVerificationResult(null);
    setProgressValue(0);
    setIsLoading(false); // Reset loading state
  };

  const handleVerifyFace = async() => {
    setVerificationStatus('processing');
    setIsLoading(true);
    setShowProgress(false);
    setDetectedEmotions(null);
    setCapturePhase('image_captured_ready_to_verify'); // Stay in this phase during verification
    setCapturePhase('image_captured_ready_to_verify'); // Stay in this phase during verification

    try {
      let response;

      if (useClientSide && faceApiReady) {
        // Client-side verification using face-api.js
        console.log('Using client-side face verification (face-api.js)');
        const clientResult = await verifyFaceClientSide(currentImage, profileImage);

        // Map client result to expected format
        response = {
          imageMatched: clientResult.matched,
          similarity: clientResult.similarity,
          confidence: clientResult.confidence || clientResult.similarity,
          provider: 'face-api.js (client)',
        };

        // Store emotions if detected
        if (clientResult.emotions) {
          setDetectedEmotions(clientResult.emotions);
        }
      } else {
        // Server-side verification using OpenCV
        console.log('Using server-side face verification (OpenCV)');
        console.log('📸 Profile Image:', profileImage);
        console.log('📸 Current Image:', currentImage);

        if (!profileImage || !currentImage) {
          throw new Error(`Missing images - Profile: ${!!profileImage}, Current: ${!!currentImage}`);
        }

        response = await dispatch(compareFaces({
          imagePath1: profileImage,
          imagePath2: currentImage
        })).unwrap();
        response.provider = 'OpenCV (server)';
      }

      setVerificationResult(response);
      setShowProgress(true);

      // Always show verification results and let manager decide
      setVerificationStatus("awaiting_decision");
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationResult({ similarity: 0, confidence: 0, imageMatched: false });
      setShowProgress(true);
      setVerificationStatus("awaiting_decision");
    }

    setIsLoading(false);
  };

  const handleAcceptVerification = () => {
    setManagerDecision('accepted');
    setVerificationStatus("success");
    // Emit to backend
    socket?.emit("manager:face-verification-decision", {
      decision: 'accepted',
      aiRecommendation: verificationResult?.imageMatched ? 'match' : 'no_match',
      similarity: verificationResult?.similarity || 0,
      confidence: verificationResult?.confidence || 0,
      managerOverride: verificationResult?.imageMatched === false // true if manager overrode AI rejection
    });
  };

  const handleRejectVerification = () => {
    setManagerDecision('rejected');
    setVerificationStatus("rejected");
    // Emit to backend
    socket?.emit("manager:face-verification-decision", {
      decision: 'rejected',
      aiRecommendation: verificationResult?.imageMatched ? 'match' : 'no_match',
      similarity: verificationResult?.similarity || 0,
      confidence: verificationResult?.confidence || 0,
      managerOverride: verificationResult?.imageMatched === true // true if manager overrode AI acceptance
    });
  };

  const getProgressColor = () => {
    if (!verificationResult) return 'primary';
    const similarity = verificationResult.similarity || 0;
    if (similarity >= 80) return 'success';
    if (similarity >= 60) return 'warning';
    return 'error';
  };

  const bothImagesAvailable = profileImage && currentImage;

  // Manager rejected the verification
  if (verificationStatus === 'rejected') {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignments: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
        color: 'white',
        p: 4,
        textAlign: 'center'
      }}>
        <Cancel sx={{ fontSize: 80, mb: 2, color: 'white' }} />
        <Typography variant="h4" gutterBottom>
          Verification Rejected
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          You have rejected the face verification for {customerName}.
        </Typography>
        {verificationResult && (
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, opacity: 0.9 }}>
              AI Recommendation: {verificationResult.imageMatched ? 'MATCH' : 'NO MATCH'} ({progressValue.toFixed(2)}% similarity)
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
              Manager Override: Verification rejected regardless of AI recommendation
            </Typography>
          </Box>
        )}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            size="large"
            onClick={handleRetakeImage}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: '#ddd',
                bgcolor: 'rgba(255,255,255,0.1)'
              },
            }}
          >
            Try Again
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={onComplete}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            Continue Anyway
          </Button>
        </Stack>
      </Box>
    );
  }

  // Manager accepted the verification
  if (verificationStatus === 'success') {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, #b19cd9 0%, #9370db 100%)',
        color: 'white',
        p: 4,
        textAlign: 'center'
      }}>
        <CheckCircle sx={{ fontSize: 80, mb: 2, color: '#4caf50' }} />
        <Typography variant="h4" gutterBottom>
          Face Verification Accepted
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {customerName}'s identity has been verified and accepted.
        </Typography>
        
        {verificationResult && (
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Similarity Score</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {progressValue.toFixed(2)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(progressValue, 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#4caf50',
                  borderRadius: 4,
                }
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
              Confidence: {verificationResult.confidence ? verificationResult.confidence.toFixed(2) : 'N/A'}%
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.9 }}>
              AI Recommendation: {verificationResult.imageMatched ? 'MATCH' : 'NO MATCH'}
            </Typography>
            {managerDecision && verificationResult.imageMatched === false && (
              <Chip
                label="Manager Override: Accepted despite low similarity"
                size="small"
                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
            )}
          </Box>
        )}
        
        {/* Action buttons - Always show Decline and Recapture even when verification succeeded */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 400, mt: 3, mx: 'auto' }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onComplete}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)',
              borderRadius: '8px',
              '&:hover': {
                opacity: 0.9,
              },
            }}
          >
            Accept & Continue
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<ThumbDown />}
              onClick={handleRejectVerification}
              sx={{
                flex: 1,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                color: '#f44336',
                borderColor: '#f44336',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#d32f2f',
                  bgcolor: 'rgba(244, 67, 54, 0.1)'
                },
              }}
            >
              Decline
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<Replay />}
              onClick={handleRetakeImage}
              sx={{
                flex: 1,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'white',
                borderColor: 'white',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#ddd',
                  bgcolor: 'rgba(255,255,255,0.1)'
                },
              }}
            >
              Recapture
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Container maxWidth="md" sx={{ height: '100%' }}>
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #b19cd9 0%, #9370db 100%)',
            p: 3,
            borderRadius: 2
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <FaceRetouchingNatural sx={{ fontSize: 60, color: 'white' }} />
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: 'white',
                fontWeight: 500,
                mt: 1
              }}
            >
              Face Verification
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'white', mt: 1 }}>
              Verify {customerName}'s identity by matching facial features
            </Typography>

            {/* Provider Toggle */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <Chip
                label={useClientSide ? 'Client-side (Browser)' : 'Server-side (OpenCV)'}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={useClientSide}
                    onChange={(e) => setUseClientSide(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#4caf50' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4caf50' },
                    }}
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Box>
          </Box>

          {verificationStatus === 'failed' && (
            <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
              Verification failed. Images do not match. Please try again.
            </Alert>
          )}

          {verificationStatus === 'processing' && (
            <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                Verifying face... Please wait.
              </Box>
            </Alert>
          )}

          {showProgress && verificationResult && verificationStatus !== 'success' && (
            <Box sx={{ width: '100%', mb: 3 }}>
              <Card sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.95)' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, textAlign: 'center' }}>
                  Verification Results
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Similarity Score</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {progressValue.toFixed(2)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(progressValue, 100)}
                  color={getProgressColor()}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    mb: 1
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Confidence: {verificationResult.confidence ? verificationResult.confidence.toFixed(2) : 'N/A'}%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 'bold',
                      color: verificationResult.imageMatched ? 'success.main' : 'error.main'
                    }}
                  >
                    {verificationResult.imageMatched ? 'MATCH' : 'NO MATCH'}
                  </Typography>
                </Box>
                {verificationResult.provider && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', opacity: 0.6 }}>
                    Provider: {verificationResult.provider}
                  </Typography>
                )}
              </Card>
            </Box>
          )}

          {/* Customer Emotion Display */}
          {detectedEmotions && (
            <Box sx={{ width: '100%', mb: 3 }}>
              <EmotionDisplay
                emotions={detectedEmotions}
                title="Customer Emotion"
                showBreakdown={true}
              />
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              gap: 2,
              mb: 4
            }}
          >
            <Box sx={{ width: '48%' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'white',
                  mb: 1,
                  textAlign: 'center'
                }}
              >
                Account Image
              </Typography>
              <Card
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '3px solid white',
                  boxShadow: 3,
                  height: 200,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: 'rgba(0,0,0,0.1)'
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
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Typography sx={{ color: 'white' }}>No profile image available</Typography>
                )}
              </Card>
              <Typography variant="caption" sx={{ color: 'white', display: 'block', textAlign: 'center', mt: 1 }}>
                From customer records
              </Typography>
            </Box>

            <Box sx={{ width: '48%' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'white',
                  mb: 1,
                  textAlign: 'center'
                }}
              >
                Current Image
              </Typography>
              <Card
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '3px solid white',
                  boxShadow: 3,
                  height: 200,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: 'rgba(0,0,0,0.1)'
                }}
              >
                {isLoading ? (
                  <CircularProgress color="inherit" />
                ) : currentImage ? (
                  <CardMedia
                    component="img"
                    image={currentImage}
                    alt="Current Image"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Typography sx={{ color: 'white' }}>No current image</Typography>
                )}
              </Card>
              <Typography variant="caption" sx={{ color: 'white', display: 'block', textAlign: 'center', mt: 1 }}>
                {captureState === 'initial' ? 'Live video feed' : 'Captured image'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ width: '100%', mt: 2 }}>
            {capturePhase === 'initial_request' && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<CameraAlt />}
                onClick={handleNotifyCustomer}
                disabled={isLoading}
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 'medium',
                  background: 'linear-gradient(135deg, #0066FF 0%, #004CFF 100%)',
                  '&:hover': { opacity: 0.9 },
                }}
              >
                {isLoading && managerNotifyingCustomer ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                    Notifying Customer...
                  </Box>
                ) : (
                  'Notify Customer for Capture'
                )}
              </Button>
            )}

            {capturePhase === 'customer_notified' && (
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  startIcon={<Replay />}
                  onClick={handleRetakeImage} // Retake will go back to 'customer_notified'
                  disabled={isLoading || verificationStatus === 'processing'}
                  sx={{
                    fontSize: '1.1rem',
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': { borderColor: '#ddd' },
                  }}
                >
                  Recapture
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<CameraAlt />}
                  onClick={handleStartCapture}
                  disabled={isLoading || verificationStatus === 'processing'}
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 'medium',
                    background: 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)',
                    '&:hover': { opacity: 0.9 },
                  },
                }}
              >
                  {isLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                      Initiating Capture...
                    </Box>
                  ) : (
                    'Start Capture'
                  )}
                </Button>
              </Stack>
            )}

            {capturePhase === 'capturing_in_progress' && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<CameraAlt />}
                disabled={true} // Always disabled when waiting for customer
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 'medium',
                  background: 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)',
                  '&:hover': { opacity: 0.9 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                  Waiting for Customer...
                </Box>
              </Button>
            )}

            {capturePhase === 'image_captured_ready_to_verify' && currentImage && verificationStatus !== 'failed' && (
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  startIcon={<Replay />}
                  onClick={handleRetakeImage}
                  disabled={isLoading || verificationStatus === 'processing'}
                  sx={{
                    fontSize: '1.1rem',
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': { borderColor: '#ddd' },
                  }}
                >
                  Recapture
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleVerifyFace}
                  disabled={isLoading || verificationStatus === 'processing' || !bothImagesAvailable}
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 'medium',
                    background: bothImagesAvailable
                      ? 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)'
                      : '#ccc',
                    '&:hover': { opacity: 0.9 },
                  }}
                >
                  {verificationStatus === 'processing' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                      Verifying...
                    </Box>
                  ) : (
                    'Verify Face'
                  )}
                </Button>
              </Stack>
            )}


            {(captureState === 'captured' && currentImage && !profileImage) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No profile image found for this customer. Face verification cannot proceed.
              </Alert>
            )}

            {verificationStatus === 'awaiting_decision' && (
              <Box sx={{ width: '100%' }}>
                <Card sx={{ p: 3, mb: 3, bgcolor: 'rgba(255,255,255,0.95)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Psychology sx={{ fontSize: 40, mr: 1, color: verificationResult?.imageMatched ? 'success.main' : 'error.main' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        AI Recommendation
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: verificationResult?.imageMatched ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {verificationResult?.imageMatched ? '✓ MATCH DETECTED' : '✗ NO MATCH'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Similarity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {progressValue.toFixed(2)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(progressValue, 100)}
                    color={getProgressColor()}
                    sx={{ height: 6, borderRadius: 3, mb: 1 }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', opacity: 0.7 }}>
                    Confidence: {verificationResult?.confidence ? verificationResult.confidence.toFixed(2) : 'N/A'}%
                  </Typography>
                </Card>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Manager Decision Required
                  </Typography>
                  <Typography variant="caption">
                    Please review the AI results above and make your final decision. You can accept or reject regardless of the AI recommendation.
                  </Typography>
                </Alert>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<ThumbDown />}
                    onClick={handleRejectVerification}
                    sx={{
                      fontSize: '1.1rem',
                      color: '#f44336',
                      borderColor: '#f44336',
                      '&:hover': {
                        borderColor: '#d32f2f',
                        bgcolor: 'rgba(244, 67, 54, 0.1)'
                      },
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<ThumbUp />}
                    onClick={handleAcceptVerification}
                    sx={{
                      fontSize: '1.1rem',
                      fontWeight: 'medium',
                      background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                      '&:hover': {
                        opacity: 0.9,
                      },
                    }}
                  >
                    Accept
                  </Button>
                </Stack>

                <Button
                  variant="text"
                  fullWidth
                  size="small"
                  startIcon={<Replay />}
                  onClick={handleRetakeImage}
                  sx={{
                    mt: 2,
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)'
                    },
                  }}
                >
                  Recapture Image
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

FaceVerification.propTypes = {
  customerName: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired,
};

export default FaceVerification;