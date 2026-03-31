import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Psychology } from '@mui/icons-material';
import PropTypes from 'prop-types';

const EmotionDisplay = ({ emotions, title = 'Detected Emotion', showBreakdown = false }) => {
  if (!emotions) return null;

  // Get the dominant emotion
  const dominantEmotion = emotions.dominant || Object.keys(emotions).reduce((a, b) =>
    emotions[a] > emotions[b] ? a : b, Object.keys(emotions)[0]
  );

  const emotionColors = {
    happy: '#4caf50',
    sad: '#2196f3',
    angry: '#f44336',
    fearful: '#ff9800',
    disgusted: '#9c27b0',
    surprised: '#00bcd4',
    neutral: '#9e9e9e',
  };

  return (
    <Box sx={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 2,
      p: 2,
      width: '100%'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Psychology sx={{ color: emotionColors[dominantEmotion] || '#666' }} />
        <Typography variant="subtitle2">{title}</Typography>
        <Chip
          label={dominantEmotion?.charAt(0).toUpperCase() + dominantEmotion?.slice(1)}
          size="small"
          sx={{
            backgroundColor: emotionColors[dominantEmotion] || '#666',
            color: 'white'
          }}
        />
      </Box>

      {showBreakdown && emotions && typeof emotions === 'object' && (
        <Box sx={{ mt: 1 }}>
          {Object.entries(emotions)
            .filter(([key]) => key !== 'dominant')
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([emotion, value]) => (
              <Box key={emotion} sx={{ mb: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {emotion}
                  </Typography>
                  <Typography variant="caption">
                    {(value * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={value * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: emotionColors[emotion] || '#666',
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>
            ))}
        </Box>
      )}
    </Box>
  );
};

EmotionDisplay.propTypes = {
  emotions: PropTypes.object,
  title: PropTypes.string,
  showBreakdown: PropTypes.bool,
};

export default EmotionDisplay;
