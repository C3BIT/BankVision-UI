import { useState } from 'react';
import {
  Box,
  Typography,
  Rating,
  Button,
  Paper,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Star,
  StarBorder,
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const customIcons = {
  1: {
    icon: <SentimentVeryDissatisfied sx={{ fontSize: 40 }} />,
    label: 'Very Dissatisfied',
  },
  2: {
    icon: <SentimentDissatisfied sx={{ fontSize: 40 }} />,
    label: 'Dissatisfied',
  },
  3: {
    icon: <SentimentNeutral sx={{ fontSize: 40 }} />,
    label: 'Neutral',
  },
  4: {
    icon: <SentimentSatisfied sx={{ fontSize: 40 }} />,
    label: 'Satisfied',
  },
  5: {
    icon: <SentimentVerySatisfied sx={{ fontSize: 40 }} />,
    label: 'Very Satisfied',
  },
};

function IconContainer(props) {
  const { value, ...other } = props;
  return <span {...other}>{customIcons[value].icon}</span>;
}

IconContainer.propTypes = {
  value: PropTypes.number.isRequired,
};

const ThankYouScreen = ({
  referenceNumber,
  managerName,
  callDuration,
  onClose,
  onSubmitFeedback
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hover, setHover] = useState(-1);

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);

    try {
      if (onSubmitFeedback) {
        await onSubmitFeedback({
          rating,
          feedback,
          referenceNumber,
          timestamp: new Date().toISOString()
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 500,
        mx: 'auto',
        p: { xs: 3, sm: 4 },
        borderRadius: 3,
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      {/* Success Icon */}
      <Box sx={{ mb: 3 }}>
        <CheckCircle sx={{ fontSize: 80, color: '#4CAF50' }} />
      </Box>

      {/* Thank You Message */}
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Thank You!
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
        Your call with {managerName || 'our representative'} has ended.
      </Typography>

      {/* Reference Number */}
      <Box
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 2,
          p: 2,
          mb: 3
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Reference Number
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          {referenceNumber || `REF${Date.now().toString(36).toUpperCase()}`}
        </Typography>
        {callDuration && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Call Duration: {formatDuration(callDuration)}
          </Typography>
        )}
      </Box>

      {!submitted ? (
        <>
          {/* Rating Section */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            How was your experience?
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Rating
              name="satisfaction-rating"
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              onChangeActive={(event, newHover) => setHover(newHover)}
              IconContainerComponent={IconContainer}
              highlightSelectedOnly
              sx={{
                '& .MuiRating-iconFilled': {
                  color: '#FFD700',
                },
                '& .MuiRating-iconHover': {
                  color: '#FFEA00',
                },
              }}
            />
            {rating !== null && (
              <Typography sx={{ mt: 1 }}>
                {customIcons[hover !== -1 ? hover : rating]?.label || 'Select a rating'}
              </Typography>
            )}
          </Box>

          {/* Feedback Text */}
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Any additional feedback? (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 2,
              }
            }}
          />

          {/* Submit Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            sx={{
              py: 1.5,
              mb: 2,
              backgroundColor: '#4CAF50',
              '&:hover': { backgroundColor: '#388E3C' },
              '&:disabled': { backgroundColor: 'rgba(255,255,255,0.3)' }
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              'Submit Feedback'
            )}
          </Button>

          <Button
            variant="text"
            fullWidth
            onClick={onClose}
            sx={{ color: 'rgba(255,255,255,0.8)' }}
          >
            Skip
          </Button>
        </>
      ) : (
        <>
          {/* Feedback Submitted */}
          <Alert
            severity="success"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              color: 'white',
              '& .MuiAlert-icon': { color: '#4CAF50' }
            }}
          >
            Thank you for your feedback!
          </Alert>

          <Button
            variant="contained"
            fullWidth
            onClick={onClose}
            sx={{
              py: 1.5,
              backgroundColor: 'white',
              color: '#764ba2',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
            }}
          >
            Close
          </Button>
        </>
      )}
    </Paper>
  );
};

ThankYouScreen.propTypes = {
  referenceNumber: PropTypes.string,
  managerName: PropTypes.string,
  callDuration: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  onSubmitFeedback: PropTypes.func
};

export default ThankYouScreen;
