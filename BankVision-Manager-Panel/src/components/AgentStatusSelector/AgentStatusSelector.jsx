import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Circle,
  Coffee,
  RestaurantMenu,
  Timer,
  Block,
  Brightness1,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Available', color: '#4caf50', icon: Circle },
  { value: 'busy', label: 'Busy', color: '#f44336', icon: Circle },
  { value: 'break', label: 'On Break', color: '#ff9800', icon: Coffee },
  { value: 'lunch', label: 'At Lunch', color: '#2196f3', icon: RestaurantMenu },
  { value: 'prayer', label: 'Prayer Time', color: '#9c27b0', icon: Timer },
  { value: 'not_ready', label: 'Not Ready', color: '#757575', icon: Block },
];

const AgentStatusSelector = ({ currentStatus, onStatusChange, compact = false }) => {
  const [status, setStatus] = useState(currentStatus || 'online');

  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  const handleChange = (event) => {
    const newStatus = event.target.value;
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const getCurrentStatusOption = () => {
    return STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0];
  };

  const currentOption = getCurrentStatusOption();
  const StatusIcon = currentOption.icon;

  if (compact) {
    return (
      <Tooltip title={`Status: ${currentOption.label}`}>
        <Chip
          size="small"
          icon={<StatusIcon sx={{ color: `${currentOption.color} !important`, fontSize: 12 }} />}
          label={currentOption.label}
          onClick={(e) => e.target.closest('select')?.click()}
          sx={{
            bgcolor: `${currentOption.color}20`,
            borderColor: currentOption.color,
            '& .MuiChip-label': { fontSize: '0.75rem' }
          }}
          variant="outlined"
        />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 60 }}>
        Status:
      </Typography>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select
          value={status}
          onChange={handleChange}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: currentOption.color,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: currentOption.color,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: currentOption.color,
            },
          }}
          renderValue={(selected) => {
            const option = STATUS_OPTIONS.find(opt => opt.value === selected);
            const Icon = option?.icon || Circle;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon sx={{ color: option?.color, fontSize: 16 }} />
                <Typography variant="body2">{option?.label}</Typography>
              </Box>
            );
          }}
        >
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon sx={{ color: option.color, fontSize: 16 }} />
                  <Typography variant="body2">{option.label}</Typography>
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
};

AgentStatusSelector.propTypes = {
  currentStatus: PropTypes.string,
  onStatusChange: PropTypes.func,
  compact: PropTypes.bool,
};

export default AgentStatusSelector;
