import { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton } from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
import BrandLogo from '../BrandLogo/BrandLogo';

const FeedbackScreen = ({ onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    onSubmit({ rating, feedback });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        padding: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          textAlign: 'center',
        }}
      >
        {/* Bank Logo */}
        <Box sx={{ mb: 4 }}>
          <BrandLogo size="medium" />
        </Box>

        {/* Feedback Title */}
        <Typography
          sx={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#0066FF',
            mb: 4,
          }}
        >
          Feedback
        </Typography>

        {/* Feedback Card */}
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            p: 4,
          }}
        >
          {/* Question */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 500,
              color: '#1A1A1A',
              mb: 1,
            }}
          >
            How would you rate the overall user
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 500,
              color: '#1A1A1A',
              mb: 2,
            }}
          >
            experience of our service ?
          </Typography>

          {/* Subtitle */}
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#666666',
              mb: 3,
            }}
          >
            Rate your experience with your RM
          </Typography>

          {/* Star Rating */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton
                key={star}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`⭐ Star ${star} clicked`);
                  setRating(star);
                  setHoverRating(0); // Clear hover state after click
                }}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disableRipple={false}
                sx={{
                  padding: 0.5,
                  cursor: 'pointer',
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {star <= (hoverRating || rating) ? (
                  <Star sx={{ fontSize: 40, color: '#FFA500', pointerEvents: 'none' }} />
                ) : (
                  <StarBorder sx={{ fontSize: 40, color: '#E0E0E0', pointerEvents: 'none' }} />
                )}
              </IconButton>
            ))}
          </Box>

          {/* Rating Selection Hint */}
          {rating === 0 && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#FF6B6B',
                mb: 2,
                textAlign: 'center',
              }}
            >
              Please select a rating to submit feedback
            </Typography>
          )}

          {rating > 0 && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#4CAF50',
                mb: 2,
                textAlign: 'center',
              }}
            >
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good!' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
            </Typography>
          )}

          {/* Did you like it most? */}
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#666666',
              mb: 1,
              textAlign: 'left',
            }}
          >
            Did you like it most?
          </Typography>

          {/* Feedback Text Area */}
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                '& fieldset': {
                  borderColor: '#E0E0E0',
                },
                '&:hover fieldset': {
                  borderColor: '#0066FF',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#0066FF',
                  borderWidth: 2,
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#999999',
                opacity: 1,
              },
            }}
          />

          {/* Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
            }}
          >
            <Button
              fullWidth
              onClick={onSkip}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                color: '#666666',
                borderColor: '#E0E0E0',
                '&:hover': {
                  borderColor: '#999999',
                  backgroundColor: 'transparent',
                },
              }}
              variant="outlined"
            >
              Skip
            </Button>
            <Button
              fullWidth
              onClick={handleSubmit}
              disabled={rating === 0}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#0052CC',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#E0E0E0',
                  color: '#999999',
                },
              }}
              variant="contained"
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FeedbackScreen;
