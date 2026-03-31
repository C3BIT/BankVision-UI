import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  useMediaQuery, 
  useTheme, 
  IconButton, 
  Button, 
  Alert,
  Dialog,
  DialogContent,
  Paper,
  Slide
} from '@mui/material';
import { CameraAlt, CheckCircle, Close, Error as ErrorIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { uploadCustomerImage } from '../../redux/auth/customerImageSlice';
import { useWebSocket } from '../../context/WebSocketContext';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CaptureCustomerImage = ({ onClose }) => {
  const { socket, customerStartCapture, customerCancelFaceVerification } = useWebSocket();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const webcamRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [status, setStatus] = useState('initializing'); // initializing, ready, countdown, capturing, success, error
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  
  // Timeout refs
  const countdownIntervalRef = useRef(null);
  const captureTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const maxRetries = 3;
  const retryCountRef = useRef(0);

  // Responsive video constraints - optimized for mobile
  const videoConstraints = {
    width: { ideal: isMobile ? 640 : 1280 },
    height: { ideal: isMobile ? 480 : 720 },
    facingMode: "user"
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleCameraReady = useCallback(() => {
    console.log("📸 CUSTOMER: Camera is ready");
    setIsCameraReady(true);
    setStatus('ready');
    setCameraError(null);
  }, []);

  const handleCameraError = useCallback((err) => {
    console.error("📸 CUSTOMER: Camera error:", err);
    setCameraError(err.message || "Failed to access camera");
    setStatus('error');
    setIsCameraReady(false);
    
    // Notify manager
    if (socket) {
      socket.emit("customer:capture-failed", {
        message: "Camera access failed",
        error: err.message
      });
    }
  }, [socket]);

  const handleCancel = useCallback(() => {
    console.log("🚫 Customer cancelled face verification");
    
    // Cleanup timeouts
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }

    // Notify manager
    if (customerCancelFaceVerification) {
      customerCancelFaceVerification();
    }

    // Close modal
    if (onClose) {
      onClose();
    }
  }, [customerCancelFaceVerification, onClose]);

  const captureAndUpload = useCallback(async () => {
    console.log("📸 CUSTOMER: Starting capture and upload");
    
    if (!isCameraReady || !webcamRef.current) {
      console.error("📸 CUSTOMER: Camera not ready");
      setErrorMessage("Camera not ready. Please wait...");
      setStatus('error');
      return;
    }

    setStatus('capturing');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Capture screenshot with retry logic
      let picture = null;
      let attempts = 0;
      
      while (!picture && attempts < maxRetries) {
        picture = webcamRef.current?.getScreenshot();
        if (!picture || picture.length < 1000) {
          console.log(`📸 Capture attempt ${attempts + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        } else {
          break;
        }
      }

      if (!picture || picture.length < 1000) {
        throw new Error("Failed to capture valid image after multiple attempts");
      }

      console.log("📸 CUSTOMER: Image captured successfully, uploading...");

      // Notify manager that upload is starting
      if (socket) {
        socket.emit("customer:capture-uploading", {
          message: "Uploading image..."
        });
      }

      // Convert base64 to Blob
      const base64Data = picture.split(',')[1];
      const binaryString = atob(base64Data);
      const buffer = new ArrayBuffer(binaryString.length);
      const uintArray = new Uint8Array(buffer);

      for (let i = 0; i < binaryString.length; i++) {
        uintArray[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([buffer], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', blob, `customer-image-${Date.now()}.jpg`);

      // Upload with timeout
      const uploadPromise = dispatch(uploadCustomerImage(formData)).unwrap();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Upload timeout")), 30000)
      );

      const data = await Promise.race([uploadPromise, timeoutPromise]);

      // Send image path to manager
      if (socket) {
        socket.emit("customer:send-captured-image", { 
          imagePath: data.imagePath,
          timestamp: Date.now()
        });
        socket.emit("customer:capture-complete", {
          message: "Image captured successfully"
        });
      }

      console.log("✅ CUSTOMER: Image uploaded and sent to manager");
      setStatus('success');
      retryCountRef.current = 0; // Reset retry count on success

      // Auto-close after 2 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);

    } catch (error) {
      console.error("❌ CUSTOMER: Error uploading image:", error);
      setErrorMessage(error.message || "Failed to upload image");
      setStatus('error');
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`🔄 Retrying capture (${retryCountRef.current}/${maxRetries})...`);
        retryTimeoutRef.current = setTimeout(() => {
          setStatus('ready');
          setErrorMessage(null);
        }, 3000);
      } else {
        // Notify manager of failure
        if (socket) {
          socket.emit("customer:capture-failed", {
            message: "Failed to capture/upload image after multiple attempts",
            error: error.message
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isCameraReady, dispatch, socket, onClose]);

  // Listen for manager retake requests
  useEffect(() => {
    if (!socket) return;

    const handleRetakeRequest = () => {
      console.log("🔄 Manager requested retake - resetting");
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
      setStatus('ready');
      setCountdown(0);
      setIsLoading(false);
      setErrorMessage(null);
      retryCountRef.current = 0;
    };

    socket.on('manager:request-retake-image', handleRetakeRequest);

    return () => {
      socket.off('manager:request-retake-image', handleRetakeRequest);
    };
  }, [socket]);

  const startCountdown = useCallback(() => {
    if (status !== 'ready' || isLoading || !isCameraReady) {
      console.warn("📸 CUSTOMER: Cannot start countdown - invalid state");
      return;
    }

    console.log("📸 CUSTOMER: Starting countdown");
    setStatus('countdown');
    setCountdown(3);
    setErrorMessage(null);
    
    // Notify manager
    if (customerStartCapture) {
      customerStartCapture();
    }
  }, [status, isLoading, isCameraReady, customerStartCapture]);

  // Countdown timer effect
  useEffect(() => {
    if (status === 'countdown' && countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (status === 'countdown' && countdown === 0) {
      // Countdown finished, capture now
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      captureAndUpload();
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown, status, captureAndUpload]);

  const handleStartCaptureClick = useCallback(() => {
    if (!isCameraReady) {
      setErrorMessage("Camera not ready. Please wait...");
      return;
    }
    startCountdown();
  }, [isCameraReady, startCountdown]);

  return (
    <Dialog
      open={true}
      onClose={handleCancel}
      maxWidth={false}
      fullScreen={isMobile}
      TransitionComponent={isMobile ? Transition : undefined}
      PaperProps={{
        sx: {
          margin: isMobile ? 0 : 2,
          maxWidth: isMobile ? '100%' : '600px',
          width: isMobile ? '100%' : 'auto',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
          borderRadius: isMobile ? 0 : 3,
          backgroundColor: '#000000',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        },
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: isMobile ? 'flex-end' : 'center',
        },
        zIndex: 10000,
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#000000',
          '&.MuiDialogContent-root': {
            padding: 0,
          },
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleCancel}
          sx={{
            position: 'absolute',
            top: { xs: 12, sm: 16 },
            right: { xs: 12, sm: 16 },
            zIndex: 10001,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#FFFFFF',
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          <Close sx={{ fontSize: { xs: 20, sm: 24 } }} />
        </IconButton>

        {/* Webcam Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            minHeight: { xs: 'calc(100vh - 200px)', sm: '400px' },
            maxHeight: { xs: 'calc(100vh - 200px)', sm: 'none' },
          }}
        >
        {!cameraError ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.95}
            videoConstraints={videoConstraints}
            onUserMedia={handleCameraReady}
            onUserMediaError={handleCameraError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: 'scaleX(-1)',
            }}
          />
        ) : (
          <Box 
            sx={{ 
              textAlign: 'center', 
              p: { xs: 3, sm: 4 },
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ErrorIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: '#FF4444', mb: 2 }} />
            <Typography 
              sx={{ 
                color: '#FFFFFF', 
                fontSize: { xs: '1rem', sm: '1.2rem' }, 
                fontWeight: 600,
                mb: 1 
              }}
            >
              Camera Error
            </Typography>
            <Typography 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: { xs: '0.875rem', sm: '0.9rem' }, 
                mb: 3,
                px: 2,
              }}
            >
              {cameraError}
            </Typography>
            <Button
              variant="contained"
              onClick={handleCancel}
              sx={{
                backgroundColor: '#FF4444',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                '&:hover': { backgroundColor: '#D32F2F' }
              }}
            >
              Close
            </Button>
          </Box>
        )}

        {/* Status Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 60, sm: 20 },
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 1,
            width: '100%',
            maxWidth: { xs: 'calc(100% - 24px)', sm: '500px' },
            px: { xs: 1.5, sm: 0 },
          }}
        >
          {status === 'initializing' && (
            <Paper
              elevation={8}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: { xs: 2, sm: 3 },
                padding: { xs: 1.75, sm: 2.5 },
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1.5, sm: 2 },
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                mx: { xs: 1, sm: 0 },
              }}
            >
              <CircularProgress sx={{ color: '#0066FF' }} size={isMobile ? 20 : 24} />
              <Typography 
                sx={{ 
                  color: '#1A1A1A', 
                  fontSize: { xs: '0.813rem', sm: '0.938rem' }, 
                  fontWeight: 500 
                }}
              >
                Initializing camera...
              </Typography>
            </Paper>
          )}

          {status === 'ready' && isCameraReady && (
            <Paper
              elevation={8}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                borderRadius: { xs: 2, sm: 3 },
                padding: { xs: 2, sm: 3 },
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: { xs: 1.25, sm: 2 },
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                mx: { xs: 1, sm: 0 },
              }}
            >
              <Typography 
                sx={{ 
                  color: '#0066FF', 
                  fontSize: { xs: '0.938rem', sm: '1.125rem' }, 
                  fontWeight: 600,
                  mb: { xs: 0.25, sm: 0.5 },
                }}
              >
                📸 Face Verification
              </Typography>
              <Typography 
                sx={{ 
                  color: '#666666', 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }, 
                  textAlign: 'center',
                  lineHeight: { xs: 1.4, sm: 1.5 },
                  mb: { xs: 0.75, sm: 1 },
                  px: { xs: 0.5, sm: 0 },
                }}
              >
                Manager has initiated face verification.
                {!isMobile && <br />}
                {isMobile && ' '}
                Please look at the camera and click 'Start Capture' when ready.
              </Typography>
              <Button
                variant="contained"
                onClick={handleStartCaptureClick}
                disabled={isLoading}
                fullWidth
                sx={{
                  backgroundColor: '#0066FF',
                  '&:hover': { backgroundColor: '#0052CC' },
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  py: { xs: 1.125, sm: 1.5 },
                  px: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.813rem', sm: '0.938rem' },
                  minHeight: { xs: 40, sm: 44 },
                  '&.Mui-disabled': {
                    backgroundColor: '#E0E0E0',
                    color: '#999999',
                  },
                }}
              >
                Start Capture
              </Button>
            </Paper>
          )}

          {status === 'countdown' && (
            <Paper
              elevation={8}
              sx={{
                backgroundColor: 'rgba(255, 152, 0, 0.95)',
                borderRadius: { xs: 2, sm: 3 },
                padding: { xs: 2, sm: 3 },
                paddingX: { xs: 2.5, sm: 3 },
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                mx: { xs: 1, sm: 0 },
                minWidth: { xs: 'calc(100% - 16px)', sm: 'auto' },
              }}
            >
              <Typography 
                sx={{ 
                  color: '#FFFFFF', 
                  fontSize: { xs: '3.5rem', sm: '4rem' }, 
                  fontWeight: 700, 
                  mb: { xs: 0.5, sm: 0.5 },
                  lineHeight: 1,
                }}
              >
                {countdown}
              </Typography>
              <Typography 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.95)', 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  px: { xs: 0.5, sm: 0 },
                }}
              >
                Get ready! Please look directly at the camera
              </Typography>
            </Paper>
          )}

          {status === 'capturing' && (
            <Paper
              elevation={8}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: { xs: 2, sm: 3 },
                padding: { xs: 1.75, sm: 2.5 },
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                mx: { xs: 1, sm: 0 },
              }}
            >
              <CameraAlt 
                sx={{ 
                  fontSize: { xs: 24, sm: 32 }, 
                  color: '#0066FF',
                  animation: 'pulse 1s infinite',
                }} 
              />
              <Box>
                <Typography 
                  sx={{ 
                    color: '#1A1A1A', 
                    fontSize: { xs: '0.875rem', sm: '1rem' }, 
                    fontWeight: 600 
                  }}
                >
                  Capturing...
                </Typography>
                <Typography 
                  sx={{ 
                    color: '#666666', 
                    fontSize: { xs: '0.688rem', sm: '0.813rem' } 
                  }}
                >
                  Please hold still
                </Typography>
              </Box>
            </Paper>
          )}

          {status === 'success' && (
            <Paper
              elevation={8}
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.95)',
                borderRadius: { xs: 2, sm: 3 },
                padding: { xs: 1.75, sm: 2.5 },
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                mx: { xs: 1, sm: 0 },
              }}
            >
              <CheckCircle sx={{ fontSize: { xs: 24, sm: 32 }, color: '#FFFFFF' }} />
              <Box>
                <Typography 
                  sx={{ 
                    color: '#FFFFFF', 
                    fontSize: { xs: '0.875rem', sm: '1rem' }, 
                    fontWeight: 600 
                  }}
                >
                  Photo Captured!
                </Typography>
                <Typography 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    fontSize: { xs: '0.688rem', sm: '0.813rem' } 
                  }}
                >
                  Sending to manager...
                </Typography>
              </Box>
            </Paper>
          )}

          {status === 'error' && errorMessage && (
            <Alert 
              severity="error"
              icon={<ErrorIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />}
              sx={{
                backgroundColor: 'rgba(244, 67, 54, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: { xs: 2, sm: 3 },
                boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
                mx: { xs: 1, sm: 0 },
                '& .MuiAlert-message': {
                  width: '100%',
                },
              }}
            >
              <Typography 
                sx={{ 
                  color: '#FFFFFF', 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }, 
                  fontWeight: 600 
                }}
              >
                {errorMessage}
              </Typography>
              {retryCountRef.current < maxRetries && (
                <Typography 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: { xs: '0.625rem', sm: '0.75rem' }, 
                    mt: 0.5 
                  }}
                >
                  Retrying in a moment...
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      </Box>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}
      </style>
      </DialogContent>
    </Dialog>
  );
};

export default CaptureCustomerImage;
