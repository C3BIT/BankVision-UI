import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';

const NotFound = () => {
  const navigate = useNavigate(); 
  return (
    <AuthLayout
      title="Page Not Found"
      subtitle="Oops! The page you're looking for doesn't exist."
    >
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          The requested page might have been moved or deleted.
        </Typography>
        <Button
          onClick={() => navigate('/signup')}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 2, px: 4 }}
        >
          Go to Signup
        </Button>
      </Box>
    </AuthLayout>
  );
};

export default NotFound;
