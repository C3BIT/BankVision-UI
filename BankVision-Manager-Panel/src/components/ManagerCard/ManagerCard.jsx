import { Box, Paper, Typography, Avatar, FormControl, Select, MenuItem } from '@mui/material';
import {
  Circle,
  Coffee,
  RestaurantMenu,
  Timer,
  Block,
  CheckCircle,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4CAF50', icon: CheckCircle },
  { value: 'busy', label: 'Busy', color: '#F44336', icon: Circle },
  { value: 'break', label: 'In Break', color: '#FF9800', icon: Coffee },
  { value: 'lunch', label: 'At Lunch', color: '#2196F3', icon: RestaurantMenu },
  { value: 'prayer', label: 'Prayer Time', color: '#9C27B0', icon: Timer },
  { value: 'not_ready', label: 'Not Ready', color: '#757575', icon: Block },
];

const ManagerCard = ({ currentStatus = 'online', onStatusChange }) => {
  const { manager } = useSelector((state) => state.auth);

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const getCurrentStatusOption = () => {
    return STATUS_OPTIONS.find(opt => opt.value === currentStatus) || STATUS_OPTIONS[0];
  };

  const currentOption = getCurrentStatusOption();
  const StatusIcon = currentOption.icon;

  return (
    <Paper
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
        borderRadius: 3,
        p: 3,
        color: '#FFFFFF',
      }}
    >
      {/* Manager Section */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.9)',
            mb: 2,
          }}
        >
          Manager
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {/* Profile Image */}
          <Avatar
            src={manager?.profileImage || ''}
            sx={{
              width: 64,
              height: 64,
              border: '3px solid rgba(255, 255, 255, 0.3)',
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {manager?.name?.charAt(0)?.toUpperCase() || 'M'}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            {/* Manager Name */}
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#FFFFFF',
                mb: 0.5,
              }}
            >
              {manager?.name || 'Manager'}
            </Typography>

            {/* Role/Title */}
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              {manager?.role || manager?.designation || 'Relationship Manager'}
            </Typography>
          </Box>
        </Box>

        {/* Status Selector */}
        <FormControl fullWidth size="small">
          <Select
            value={currentStatus}
            onChange={handleStatusChange}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.7)',
              },
              '& .MuiSvgIcon-root': {
                color: '#FFFFFF',
              },
            }}
            renderValue={(selected) => {
              const option = STATUS_OPTIONS.find(opt => opt.value === selected);
              const Icon = option?.icon || Circle;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon sx={{ fontSize: 18, color: '#FFFFFF' }} />
                  <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
                    {option?.label}
                  </Typography>
                </Box>
              );
            }}
          >
            {STATUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon sx={{ color: option.color, fontSize: 18 }} />
                    <Typography variant="body2">{option.label}</Typography>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
};

ManagerCard.propTypes = {
  currentStatus: PropTypes.string,
  onStatusChange: PropTypes.func.isRequired,
};

export default ManagerCard;
