/**
 * EmotionDisplay Component
 *
 * Displays customer's detected emotion with visual indicators
 * Shows dominant emotion, confidence level, and emotion breakdown
 */

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Chip,
  Tooltip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { getEmotionEmoji, getEmotionColor } from '../../services/faceApiService';

const EmotionBar = ({ emotion, value, color }) => (
  <Box sx={{ mb: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
        {getEmotionEmoji(emotion)} {emotion}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {value}%
      </Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={value}
      sx={{
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.1)',
        '& .MuiLinearProgress-bar': {
          backgroundColor: color,
          borderRadius: 3,
        },
      }}
    />
  </Box>
);

const EmotionDisplay = ({
  emotions,
  compact = false,
  showBreakdown = true,
  title = "Customer Emotion",
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!emotions) {
    return null;
  }

  const dominantEmoji = getEmotionEmoji(emotions.dominant);
  const dominantColor = getEmotionColor(emotions.dominant);

  // Compact view - just show emoji and dominant emotion
  if (compact) {
    return (
      <Tooltip title={`${emotions.dominant} (${emotions.confidence}%)`}>
        <Chip
          icon={<span style={{ fontSize: '1.2rem' }}>{dominantEmoji}</span>}
          label={emotions.dominant}
          size="small"
          sx={{
            backgroundColor: `${dominantColor}20`,
            borderColor: dominantColor,
            color: dominantColor,
            textTransform: 'capitalize',
          }}
          variant="outlined"
        />
      </Tooltip>
    );
  }

  // Full view with emotion breakdown
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        {showBreakdown && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      {/* Dominant Emotion */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          backgroundColor: `${dominantColor}10`,
          borderRadius: 2,
          border: `2px solid ${dominantColor}`,
        }}
      >
        <Typography sx={{ fontSize: '2.5rem' }}>{dominantEmoji}</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{ textTransform: 'capitalize', color: dominantColor, fontWeight: 'bold' }}
          >
            {emotions.dominant}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Confidence: {emotions.confidence}%
          </Typography>
        </Box>
      </Box>

      {/* Emotion Breakdown */}
      {showBreakdown && (
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Emotion Breakdown
            </Typography>
            <EmotionBar emotion="happy" value={emotions.happy} color={getEmotionColor('happy')} />
            <EmotionBar emotion="neutral" value={emotions.neutral} color={getEmotionColor('neutral')} />
            <EmotionBar emotion="sad" value={emotions.sad} color={getEmotionColor('sad')} />
            <EmotionBar emotion="angry" value={emotions.angry} color={getEmotionColor('angry')} />
            <EmotionBar emotion="surprised" value={emotions.surprised} color={getEmotionColor('surprised')} />
            <EmotionBar emotion="fearful" value={emotions.fearful} color={getEmotionColor('fearful')} />
            <EmotionBar emotion="disgusted" value={emotions.disgusted} color={getEmotionColor('disgusted')} />
          </Box>
        </Collapse>
      )}
    </Paper>
  );
};

export default EmotionDisplay;
