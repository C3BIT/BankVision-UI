import { Box, Paper, Typography, Divider, Avatar } from '@mui/material';
import { useSelector } from 'react-redux';

const UserInfoCard = () => {
    const { manager } = useSelector((state) => state.auth);
  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', mr: 2 }}>
          {manager.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5">Welcome, {manager.name}!</Typography>
          <Typography variant="body2" color="text.secondary">
            {manager.email}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body1" paragraph>
        You have successfully logged in to your account. This is your dashboard.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This is a demo application. In a real application, you would see your personalized content here.
      </Typography>
    </Paper>
  );
};



export default UserInfoCard;