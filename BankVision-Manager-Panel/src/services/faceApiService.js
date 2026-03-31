/**
 * Face API Service
 *
 * Client-side face detection, recognition, and emotion detection
 * using face-api.js (runs on manager's browser CPU)
 *
 * Features:
 * - Face detection (TinyFaceDetector - fast)
 * - Face recognition (128-d embeddings)
 * - Emotion detection (7 expressions)
 * - Face comparison
 */

import * as faceapi from 'face-api.js';

// Service state
let modelsLoaded = false;
let loadingPromise = null;

// Model path (relative to public folder)
const MODEL_URL = '/models';

// Face matching threshold (0-1, lower = stricter)
const MATCH_THRESHOLD = 0.5;

/**
 * Load all required face-api.js models
 */
export const loadModels = async () => {
  if (modelsLoaded) return true;

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      console.log('[FaceAPI] Loading models...');

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log('[FaceAPI] Models loaded successfully');
      return true;
    } catch (error) {
      console.error('[FaceAPI] Failed to load models:', error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
};

/**
 * Check if models are loaded
 */
export const isReady = () => modelsLoaded;

/**
 * Create an image element from URL or base64
 */
const createImageElement = async (imageSource) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error('Failed to load image: ' + error));

    img.src = imageSource;
  });
};

/**
 * Detect face and extract features from an image
 *
 * @param {string} imageSource - URL or base64 image
 * @returns {Object} - { descriptor, expressions, detection, landmarks }
 */
export const detectFace = async (imageSource) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const img = await createImageElement(imageSource);

    // Detect face with all features
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();

    if (!detection) {
      return {
        faceDetected: false,
        descriptor: null,
        expressions: null,
        detection: null,
        error: 'No face detected'
      };
    }

    // Get dominant emotion
    const expressions = detection.expressions;
    const dominantEmotion = Object.entries(expressions)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return {
      faceDetected: true,
      descriptor: Array.from(detection.descriptor), // 128-d face embedding
      expressions: {
        neutral: expressions.neutral,
        happy: expressions.happy,
        sad: expressions.sad,
        angry: expressions.angry,
        fearful: expressions.fearful,
        disgusted: expressions.disgusted,
        surprised: expressions.surprised,
        dominant: dominantEmotion,
        confidence: expressions[dominantEmotion]
      },
      detection: {
        box: detection.detection.box,
        score: detection.detection.score
      }
    };
  } catch (error) {
    console.error('[FaceAPI] Detection error:', error);
    return {
      faceDetected: false,
      descriptor: null,
      expressions: null,
      error: error.message
    };
  }
};

/**
 * Compare two face descriptors
 *
 * @param {Float32Array|Array} descriptor1 - First face descriptor
 * @param {Float32Array|Array} descriptor2 - Second face descriptor
 * @returns {Object} - { matched, distance, similarity }
 */
export const compareFaces = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) {
    return {
      matched: false,
      distance: 1,
      similarity: 0,
      error: 'Missing descriptor'
    };
  }

  // Convert arrays to Float32Array if needed
  const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
  const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);

  // Calculate Euclidean distance
  const distance = faceapi.euclideanDistance(d1, d2);

  // Convert distance to similarity percentage (0-100)
  // Distance 0 = 100% similar, Distance 0.6 = 0% similar
  const similarity = Math.max(0, Math.min(100, (1 - distance / 0.6) * 100));

  // Check if match
  const matched = distance < MATCH_THRESHOLD;

  return {
    matched,
    distance: Math.round(distance * 1000) / 1000,
    similarity: Math.round(similarity * 100) / 100,
    threshold: MATCH_THRESHOLD
  };
};

/**
 * Full face verification: detect both faces and compare
 *
 * @param {string} capturedImage - Customer's captured image (URL or base64)
 * @param {string} referenceImage - CBS profile image (URL or base64)
 * @returns {Object} - Full verification result with emotions
 */
export const verifyFace = async (capturedImage, referenceImage) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  console.log('[FaceAPI] Starting face verification...');

  try {
    // Detect both faces in parallel
    const [capturedResult, referenceResult] = await Promise.all([
      detectFace(capturedImage),
      detectFace(referenceImage)
    ]);

    // Check if both faces detected
    if (!capturedResult.faceDetected) {
      return {
        verified: false,
        matched: false,
        similarity: 0,
        error: 'No face detected in captured image',
        capturedFace: capturedResult,
        referenceFace: referenceResult,
        emotions: null
      };
    }

    if (!referenceResult.faceDetected) {
      return {
        verified: false,
        matched: false,
        similarity: 0,
        error: 'No face detected in reference image',
        capturedFace: capturedResult,
        referenceFace: referenceResult,
        emotions: capturedResult.expressions
      };
    }

    // Compare face descriptors
    const comparison = compareFaces(
      capturedResult.descriptor,
      referenceResult.descriptor
    );

    console.log(`[FaceAPI] Verification result: similarity=${comparison.similarity}%, matched=${comparison.matched}`);

    return {
      verified: comparison.matched,
      matched: comparison.matched,
      similarity: comparison.similarity,
      distance: comparison.distance,
      threshold: comparison.threshold,
      emotions: capturedResult.expressions,
      capturedFace: {
        detected: true,
        detection: capturedResult.detection
      },
      referenceFace: {
        detected: true,
        detection: referenceResult.detection
      },
      provider: 'face-api.js',
      processedOn: 'client'
    };
  } catch (error) {
    console.error('[FaceAPI] Verification error:', error);
    return {
      verified: false,
      matched: false,
      similarity: 0,
      error: error.message,
      provider: 'face-api.js'
    };
  }
};

/**
 * Detect emotion only (for real-time emotion tracking)
 *
 * @param {string} imageSource - Image URL or base64
 * @returns {Object} - Emotion data
 */
export const detectEmotion = async (imageSource) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const img = await createImageElement(imageSource);

    // Fast detection with expressions only
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!detection) {
      return {
        detected: false,
        emotions: null
      };
    }

    const expressions = detection.expressions;
    const dominant = Object.entries(expressions)
      .reduce((a, b) => a[1] > b[1] ? a : b);

    return {
      detected: true,
      emotions: {
        neutral: Math.round(expressions.neutral * 100),
        happy: Math.round(expressions.happy * 100),
        sad: Math.round(expressions.sad * 100),
        angry: Math.round(expressions.angry * 100),
        fearful: Math.round(expressions.fearful * 100),
        disgusted: Math.round(expressions.disgusted * 100),
        surprised: Math.round(expressions.surprised * 100),
        dominant: dominant[0],
        confidence: Math.round(dominant[1] * 100)
      }
    };
  } catch (error) {
    console.error('[FaceAPI] Emotion detection error:', error);
    return {
      detected: false,
      error: error.message
    };
  }
};

/**
 * Get emoji for emotion
 */
export const getEmotionEmoji = (emotion) => {
  const emojis = {
    neutral: '😐',
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    disgusted: '🤢',
    surprised: '😲'
  };
  return emojis[emotion] || '😐';
};

/**
 * Get color for emotion (for UI display)
 */
export const getEmotionColor = (emotion) => {
  const colors = {
    neutral: '#9e9e9e',
    happy: '#4caf50',
    sad: '#2196f3',
    angry: '#f44336',
    fearful: '#9c27b0',
    disgusted: '#795548',
    surprised: '#ff9800'
  };
  return colors[emotion] || '#9e9e9e';
};

export default {
  loadModels,
  isReady,
  detectFace,
  compareFaces,
  verifyFace,
  detectEmotion,
  getEmotionEmoji,
  getEmotionColor,
  MATCH_THRESHOLD
};
