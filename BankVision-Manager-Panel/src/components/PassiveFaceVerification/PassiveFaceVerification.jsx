import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import {
  Face as FaceIcon,
  CheckCircle,
  Warning,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { compareFaces, fetchCustomerImage } from '../../redux/customer/customerImageSlice';
import api from '../../services/api';

const PassiveFaceVerification = ({
  videoElement,
  customerPhone,
  callStartTime,
  isCallActive,
  onVerified // Add prop
}) => {
  const dispatch = useDispatch();
  const { profileImage } = useSelector((state) => state.customerImageInfo);

  const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, capturing, verifying, verified, failed
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  // Use a ref for the internal counter so incrementing doesn't recreate `attemptCapture`
  // and cascade the retry effect. Keep state only for display.
  const captureAttemptsRef = useRef(0);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [lastCaptureTime, setLastCaptureTime] = useState(null);

  const captureIntervalRef = useRef(null);
  const verificationTimeoutRef = useRef(null);
  const canvasRef = useRef(null);

  const CAPTURE_DELAY = 5000; // Start capturing 5 seconds after call starts
  const RETRY_DELAY = 3000; // Wait 3 seconds between capture attempts if no face found
  const MAX_ATTEMPTS = 10; // Maximum capture attempts
  const FACE_DETECTION_CONFIDENCE = 0.5; // Minimum confidence for face detection

  // Initialize canvas for frame capture
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Load face-api.js models for face detection
  useEffect(() => {
    const loadFaceApi = async () => {
      try {
        // Check if face-api is available
        if (typeof window !== 'undefined' && window.faceapi) {
          await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
          console.log('✅ Face detection models loaded');
        }
      } catch (error) {
        console.warn('⚠️ Face-api.js not available, will use server-side detection');
      }
    };
    loadFaceApi();
  }, []);

  // Detect face in frame using face-api.js or canvas analysis
  const detectFaceInFrame = async (canvasElement) => {
    try {
      console.log('🔍 Detecting face in frame...');
      console.log('🔍 Canvas element:', canvasElement);
      console.log('🔍 Canvas dimensions:', canvasElement?.width, 'x', canvasElement?.height);

      // Try client-side detection with face-api.js
      if (typeof window !== 'undefined' && window.faceapi) {
        console.log('🔍 Using face-api.js for detection');
        const detections = await window.faceapi.detectAllFaces(
          canvasElement,
          new window.faceapi.TinyFaceDetectorOptions()
        );

        console.log('🔍 Face-api detections:', detections?.length);

        if (detections && detections.length > 0) {
          const detection = detections[0];
          console.log('🔍 Detection details:', {
            score: detection.score,
            box: detection.box
          });

          // Check if face is clear (no blockers) - basic check
          const faceBox = detection.box;
          const faceSize = faceBox.width * faceBox.height;
          const imageSize = canvasElement.width * canvasElement.height;
          const faceRatio = faceSize / imageSize;

          console.log('🔍 Face ratio:', faceRatio, 'Confidence:', detection.score);

          // Face should be reasonably large (at least 5% of image)
          if (faceRatio > 0.05 && detection.score > FACE_DETECTION_CONFIDENCE) {
            console.log('✅ Face detected with sufficient size and confidence');
            return { detected: true, confidence: detection.score };
          } else {
            console.log('⚠️ Face detected but too small or low confidence');
          }
        } else {
          console.log('⚠️ No faces detected by face-api.js');
        }
      } else {
        console.log('⚠️ face-api.js not available, using server-side detection');
      }

      // Fallback: Server will check for face during verification
      // For now, assume face is present if we can capture a frame
      // This allows server-side face detection to handle it
      console.log('✅ Assuming face present (server will verify)');
      return { detected: true, confidence: 0.7 };
    } catch (error) {
      console.warn('❌ Face detection error:', error);
      // Fallback: assume face present, server will verify
      return { detected: true, confidence: 0.6 };
    }
  };

  // Capture frame from video element
  const captureFrame = useCallback(async (targetVideoElement = null) => {
    const videoEl = targetVideoElement || videoElement;
    console.log('📸 Attempting to capture frame...');
    console.log('📸 Video element:', videoEl);
    console.log('📸 Video element type:', typeof videoEl);
    console.log('📸 Video element tagName:', videoEl?.tagName);
    console.log('📸 Video element readyState:', videoEl?.readyState);
    console.log('📸 Video element videoWidth:', videoEl?.videoWidth);
    console.log('📸 Video element videoHeight:', videoEl?.videoHeight);
    console.log('📸 Video element paused:', videoEl?.paused);
    console.log('📸 Video element ended:', videoEl?.ended);

    if (!videoEl) {
      console.log('❌ No video element provided');
      return null;
    }

    // Check if video element is actually a video element
    if (videoEl.tagName !== 'VIDEO' && !videoEl.videoWidth) {
      console.log('❌ Invalid video element - not a video tag or no videoWidth');
      return null;
    }

    if (!videoEl.videoWidth || !videoEl.videoHeight) {
      console.log('⏳ Video not ready yet - dimensions:', {
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
        readyState: videoEl.readyState
      });
      return null;
    }

    // Check if video is actually playing
    if (videoEl.paused || videoEl.ended) {
      console.log('⏳ Video is paused or ended');
      return null;
    }

    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.log('❌ Canvas not initialized');
        return null;
      }

      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log('❌ Could not get canvas context');
        return null;
      }

      console.log('📸 Drawing video to canvas:', {
        videoWidth: videoEl.videoWidth,
        videoHeight: videoEl.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Verify canvas has content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);

      if (!hasContent) {
        console.log('❌ Canvas appears to be empty');
        return null;
      }

      console.log('✅ Canvas has content, converting to blob...');

      // Convert to blob for upload - use lower quality to reduce size
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 1000) { // At least 1KB
            console.log('✅ Frame captured successfully, size:', blob.size, 'bytes');
            // If blob is too large (> 2MB), compress it further
            if (blob.size > 2 * 1024 * 1024) {
              console.log('⚠️ Image too large, compressing further...');
              canvas.toBlob((compressedBlob) => {
                if (compressedBlob) {
                  console.log('✅ Compressed image size:', compressedBlob.size, 'bytes');
                  resolve(compressedBlob);
                } else {
                  resolve(blob); // Fallback to original
                }
              }, 'image/jpeg', 0.7); // Lower quality for compression
            } else {
              resolve(blob);
            }
          } else {
            console.log('❌ Blob is too small or null:', blob?.size);
            resolve(null);
          }
        }, 'image/jpeg', 0.85); // Slightly lower quality to reduce size
      });
    } catch (error) {
      console.error('❌ Error capturing frame:', error);
      console.error('Error stack:', error.stack);
      return null;
    }
  }, [videoElement]);

  // Find customer video element in DOM if not provided (DEFINE FIRST to avoid circular dependency)
  const findCustomerVideoElement = useCallback(() => {
    if (videoElement && videoElement.videoWidth > 0) {
      return videoElement;
    }

    // Try to find customer video in DOM
    const videoElements = document.querySelectorAll('video');
    console.log('🔍 Searching for customer video in DOM, found', videoElements.length, 'video elements');

    for (const videoEl of videoElements) {
      // Look for video element that has actual video data and is playing
      if (videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0 &&
        !videoEl.paused &&
        !videoEl.ended &&
        videoEl.readyState >= 2) {
        // Check if it has a video track (not just audio)
        const stream = videoEl.srcObject;
        if (stream) {
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0 && videoTracks[0].readyState === 'live') {
            console.log('✅ Found valid customer video element in DOM:', {
              videoWidth: videoEl.videoWidth,
              videoHeight: videoEl.videoHeight,
              readyState: videoEl.readyState,
              paused: videoEl.paused
            });
            return videoEl;
          }
        }
      }
    }

    console.log('⚠️ No valid customer video element found in DOM');
    return null;
  }, [videoElement]);

  // Upload image blob and get path
  const uploadImageBlob = useCallback(async (imageBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, `passive-face-${Date.now()}.jpg`);

      console.log('📤 Uploading image blob, size:', imageBlob.size, 'bytes');

      const response = await api.post('/image/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('📥 Upload response:', {
        status: response.data?.status,
        data: response.data?.data,
        message: response.data?.message,
        fullResponse: response.data
      });

      // Backend returns: { status: "success", data: { imagePath: "..." }, message: "..." }
      if (response.data && response.data.status === 'success' && response.data.data) {
        const imagePath = response.data.data.imagePath || response.data.data.path;
        if (imagePath) {
          console.log('✅ Image uploaded successfully:', imagePath);
          return imagePath;
        } else {
          console.error('❌ No imagePath in response data:', response.data.data);
          throw new Error('Upload succeeded but no image path returned');
        }
      } else {
        console.error('❌ Upload failed:', response.data);
        throw new Error(response.data?.message || response.data?.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      if (error.response?.status === 413) {
        console.error('❌ Image too large, trying compression...');
        // Try with more compression
        throw new Error('Image too large even after compression');
      }
      throw error;
    }
  }, []);

  // Verify captured frame against profile image
  const verifyFrame = useCallback(async (imageBlob) => {
    if (!profileImage) {
      console.warn('⚠️ No profile image available');
      return;
    }

    setVerificationStatus('verifying');

    try {
      // Upload the captured image first to get a path
      console.log('📤 Uploading captured frame...');
      const uploadedImagePath = await uploadImageBlob(imageBlob);

      if (!uploadedImagePath) {
        throw new Error('Failed to upload image');
      }

      console.log('✅ Image uploaded, comparing faces...');

      // Now compare using image paths (not base64)
      const response = await dispatch(
        compareFaces({
          imagePath1: profileImage,
          imagePath2: uploadedImagePath,
        })
      ).unwrap();

      const similarity = response.similarity || 0;
      const matched = response.imageMatched || false;

      setMatchPercentage(Math.round(similarity));
      setIsMatched(matched);

      console.log('✅ Face comparison result:', {
        matched,
        similarity,
        threshold: 50
      });

      if (matched && similarity >= 50) {
        setVerificationStatus('verified');
        // Stop capturing once verified
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }

        if (onVerified) {
          console.log('✅ Calling onVerified callback with match percentage:', Math.round(similarity));
          onVerified(Math.round(similarity));
        }
      } else {
        setVerificationStatus('failed');
        // Retry after delay
        setTimeout(() => {
          setVerificationStatus('capturing');
        }, RETRY_DELAY);
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setVerificationStatus('failed');
      // Retry after delay
      setTimeout(() => {
        setVerificationStatus('capturing');
      }, RETRY_DELAY);
    }
  }, [dispatch, profileImage, uploadImageBlob]);

  // Main capture and verification loop (DEFINE AFTER findCustomerVideoElement)
  // Uses captureAttemptsRef (not state) in deps so incrementing the counter does NOT
  // recreate this callback and trigger the retry effect to cascade.
  const attemptCapture = useCallback(async () => {
    if (captureAttemptsRef.current >= MAX_ATTEMPTS) {
      console.log('⚠️ Max capture attempts reached');
      setVerificationStatus('failed');
      return;
    }

    setVerificationStatus('capturing');

    // Try to find video element if not available — no attempt consumed yet
    let actualVideoElement = videoElement;
    if (!actualVideoElement || !actualVideoElement.videoWidth) {
      console.log('🔍 Video element not available, searching DOM...');
      actualVideoElement = findCustomerVideoElement();
      if (!actualVideoElement) {
        console.log('⏳ No video element found, will retry...');
        return; // video not ready — don't count as an attempt
      }
    }

    const frameBlob = await captureFrame(actualVideoElement);

    if (!frameBlob) {
      console.log('⏳ Frame capture failed, retrying...');
      return; // frame not ready — don't count as an attempt
    }

    // Check for face in frame
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas not available for face detection');
      return;
    }

    // Only count as a real attempt once we have a valid frame to verify
    captureAttemptsRef.current += 1;
    setCaptureAttempts(captureAttemptsRef.current);

    console.log('🔍 Checking for face in captured frame...');
    const faceDetection = await detectFaceInFrame(canvas);

    if (faceDetection && faceDetection.detected) {
      console.log('✅ Face detected in frame, verifying...');
      setLastCaptureTime(Date.now());
      await verifyFrame(frameBlob);
    } else {
      console.log('⚠️ No face detected, will retry...');
      setVerificationStatus('capturing');
    }
  }, [videoElement, findCustomerVideoElement, captureFrame, verifyFrame]);

  // Load profile image and check availability
  useEffect(() => {
    if (!customerPhone || !isCallActive) {
      setVerificationStatus('idle');
      return;
    }

    dispatch(fetchCustomerImage({ phone: customerPhone }))
      .unwrap()
      .then((result) => {
        if (!result || !result.profileImage) {
          console.log('⚠️ No profile image available for customer');
          setVerificationStatus('not_available');
        } else {
          console.log('✅ Profile image found, ready for passive verification');
        }
      })
      .catch((error) => {
        console.error('Error fetching profile image:', error);
        setVerificationStatus('not_available');
      });
  }, [customerPhone, isCallActive, dispatch]);

  // Start passive verification when call is active and profile image is available
  useEffect(() => {
    if (!isCallActive || !customerPhone || !callStartTime) {
      return;
    }

    // Don't start if no profile image available
    if (!profileImage || verificationStatus === 'not_available') {
      return;
    }

    // Only start if status is idle (not already started)
    if (verificationStatus !== 'idle') {
      return;
    }

    console.log('🎬 Setting up passive face verification - will start in', CAPTURE_DELAY / 1000, 'seconds');

    // Wait for initial delay before starting capture
    verificationTimeoutRef.current = setTimeout(() => {
      console.log('🎬 Starting passive face verification');
      setVerificationStatus('capturing');
      // attemptCapture will be called by the retry interval
    }, CAPTURE_DELAY);

    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, [isCallActive, customerPhone, callStartTime, profileImage, verificationStatus]);

  // Handle retry logic — fires only when verificationStatus or attemptCapture changes.
  // captureAttempts (display state) is intentionally NOT a dep here: incrementing the
  // display counter must not re-trigger this effect and create another capture cascade.
  useEffect(() => {
    if (verificationStatus === 'capturing') {
      const timeoutId = setTimeout(() => {
        attemptCapture();
      }, 500);

      if (!captureIntervalRef.current) {
        captureIntervalRef.current = setInterval(() => {
          attemptCapture();
        }, RETRY_DELAY);
      }

      return () => {
        clearTimeout(timeoutId);
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
      };
    } else {
      // Stop interval on any non-capturing status (verified, failed, idle)
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationStatus, attemptCapture]);

  // Manual retry — resets counters and restarts the capture loop
  const handleManualRetry = useCallback(() => {
    captureAttemptsRef.current = 0;
    setCaptureAttempts(0);
    setMatchPercentage(0);
    setIsMatched(false);
    setVerificationStatus('capturing');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, []);

  if (!isCallActive) {
    return null;
  }

  // Don't show if no profile image available
  if (verificationStatus === 'not_available') {
    return (
      <Box
        sx={{
          p: 2,
          backgroundColor: '#FFFFFF',
          borderRadius: 2,
          border: '1px solid #E0E0E0',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FaceIcon sx={{ color: '#999', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#999' }}>
            Passive Face Verification
          </Typography>
        </Box>
        <Alert
          severity="info"
          sx={{
            py: 0.5,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            Face verification not available - No profile image found in database
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
        border: '1px solid #E0E0E0',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <FaceIcon sx={{ color: '#0066FF', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Passive Face Verification
        </Typography>
      </Box>

      {verificationStatus === 'idle' && (
        <Typography variant="body2" sx={{ color: '#666', fontSize: '0.75rem' }}>
          Starting verification...
        </Typography>
      )}

      {verificationStatus === 'capturing' && (
        <Box>
          <Typography variant="body2" sx={{ color: '#666', fontSize: '0.75rem', mb: 1 }}>
            Capturing frame... (Attempt {captureAttempts}/{MAX_ATTEMPTS})
          </Typography>
          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
        </Box>
      )}

      {verificationStatus === 'verifying' && (
        <Box>
          <Typography variant="body2" sx={{ color: '#666', fontSize: '0.75rem', mb: 1 }}>
            Verifying face match...
          </Typography>
          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
        </Box>
      )}

      {verificationStatus === 'verified' && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{
            py: 0.5,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Face Verified
            </Typography>
            <Chip
              label={`${matchPercentage}% Match`}
              size="small"
              sx={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                fontWeight: 600,
                height: 20,
              }}
            />
          </Box>
        </Alert>
      )}

      {verificationStatus === 'failed' && captureAttempts < MAX_ATTEMPTS && (
        <Alert
          severity="warning"
          icon={<Warning />}
          sx={{
            py: 0.5,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            {matchPercentage > 0
              ? `Match: ${matchPercentage}% (below threshold). Retrying...`
              : 'No face detected. Retrying...'}
          </Typography>
        </Alert>
      )}

      {verificationStatus === 'failed' && captureAttempts >= MAX_ATTEMPTS && (
        <Alert
          severity="error"
          sx={{
            py: 0.5,
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }}>
            Verification failed after {MAX_ATTEMPTS} attempts
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={handleManualRetry}
            sx={{ fontSize: '0.7rem', py: 0.25, textTransform: 'none' }}
          >
            Retry Verification
          </Button>
        </Alert>
      )}

      {verificationStatus === 'not_available' && (
        <Alert
          severity="info"
          sx={{
            py: 0.5,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            Face verification not available - No profile image found in database
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

PassiveFaceVerification.propTypes = {
  videoElement: PropTypes.instanceOf(HTMLVideoElement),
  customerPhone: PropTypes.string.isRequired,
  callStartTime: PropTypes.number,
  isCallActive: PropTypes.bool.isRequired,
};

export default PassiveFaceVerification;
