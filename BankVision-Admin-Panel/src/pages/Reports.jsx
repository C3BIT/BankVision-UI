import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Reports = () => {
    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Reports
            </Typography>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">
                    Detailed Reporting Module coming soon.
                </Typography>
            </Paper>
        </Box>
    );
};

export default Reports;
