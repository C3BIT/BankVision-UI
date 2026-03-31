import {
    Box,
    Skeleton
  } from '@mui/material';

export const AccountDetailsSkeleton = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Skeleton variant="rectangular" width={100} height={100} sx={{ mr: 3, borderRadius: '8px' }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="80%" height={24} sx={{ mb: 1 }} />
        <Skeleton width="70%" height={24} sx={{ mb: 1 }} />
        <Skeleton width="90%" height={24} sx={{ mb: 1 }} />
        <Skeleton width="60%" height={24} sx={{ mb: 1 }} />
        <Skeleton width="50%" height={24} />
      </Box>
    </Box>
  );