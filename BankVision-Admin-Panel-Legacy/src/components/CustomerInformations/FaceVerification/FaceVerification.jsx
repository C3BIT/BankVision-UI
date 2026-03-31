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
import { FaceRetouchingNatural, CheckCircle, CameraAlt, Replay, Error, Psychology } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { compareFaces, fetchCustomerImage } from '../../../redux/customer/customerImageSlice';
import EmotionDisplay from '../../EmotionDisplay';

const FaceVerification = ({
  customerName,
  onComplete,
  requestFaceVerification
}) => {

  const [captureState, setCaptureState] = useState('initial');
  const [verificationStatus, setVerificationStatus] = useState("initial");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  
  const [currentImage, setCurrentImage] = useState(null);
  const [useClientSide, setUseClientSide] = useState(true); // Default to client-side
  const [detectedEmotions, setDetectedEmotions] = useState(null);

  const {
    socket,
    requestRetakeImage,
    requestCaptureImage,
    verifyFaceClientSide,
    faceApiReady,
    customerEmotions,
  } = useWebSocket();
  const { profileImage } = useSelector((state) => state.customerImage);
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
      setCaptureState('captured');
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

  const handleRequestVerify = () => {
    requestFaceVerification();
    setCaptureState('capturing');
  };

  const handleCaptureImage = () => {
    requestCaptureImage();
    setIsLoading(true);
  };

  const handleRetakeImage = () => {
    requestRetakeImage();
    setCaptureState('capturing');
    setCurrentImage(null);
    setVerificationStatus('initial');
    setShowProgress(false);
    setVerificationResult(null);
    setProgressValue(0);
  };

  const handleVerifyFace = async() => {
    setVerificationStatus('processing');
    setIsLoading(true);
    setShowProgress(false);
    setDetectedEmotions(null);

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
        response = await dispatch(compareFaces({
          imagePath1: profileImage,
          imagePath2: currentImage
        })).unwrap();
        response.provider = 'OpenCV (server)';
      }

      setVerificationResult(response);
      setShowProgress(true);

      if(response.imageMatched){
        setVerificationStatus("success");
      } else {
        setVerificationStatus("failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus("failed");
      setVerificationResult({ similarity: 0, confidence: 0, imageMatched: false });
      setShowProgress(true);
    }

    setIsLoading(false);
  };

  const getProgressColor = () => {
    if (!verificationResult) return 'primary';
    const similarity = verificationResult.similarity || 0;
    if (similarity >= 80) return 'success';
    if (similarity >= 60) return 'warning';
    return 'error';
  };

  const bothImagesAvailable = profileImage && currentImage;

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
          Face Successfully Verified
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {customerName}'s identity has been verified successfully.
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
          </Box>
        )}
        
        <Button
          variant="contained"
          size="large"
          onClick={onComplete}
          sx={{
            mt: 2,
            background: 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)',
            '&:hover': {
              opacity: 0.9,
            },
          }}
        >
          Continue
        </Button>
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
            {captureState === 'initial' && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleRequestVerify}
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 'medium',
                  background: 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
              >
                Request to Verify
              </Button>
            )}

            {captureState === 'capturing' && (
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  startIcon={<Replay />}
                  onClick={handleRetakeImage}
                  disabled={isLoading}
                  sx={{
                    fontSize: '1.1rem',
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: '#ddd',
                    },
                  }}
                >
                  Retake
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<CameraAlt />}
                  onClick={handleCaptureImage}
                  disabled={isLoading}
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 'medium',
                    background: 'linear-gradient(135deg, #13A183 0%, #5EBA4F 100%)',
                    '&:hover': {
                      opacity: 0.9,
                    },
                  }}
                >
                  {isLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                      Capturing...
                    </Box>
                  ) : (
                    'Capture'
                  )}
                </Button>
              </Stack>
            )}

            {(captureState === 'captured' && currentImage && verificationStatus !== 'failed') && (
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
                    '&:hover': {
                      borderColor: '#ddd',
                    },
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
                    '&:hover': {
                      opacity: 0.9,
                    },
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

            {verificationStatus === 'failed' && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleRetakeImage}
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 'medium',
                  background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
              >
                Try Again
              </Button>
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
  requestFaceVerification: PropTypes.func.isRequired
};

export default FaceVerification;