import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Switch,
    Alert,
    Snackbar,
    Chip,
    Divider,
    CircularProgress
} from '@mui/material';
import { Settings as SettingsIcon, Shield, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const Settings = () => {
    const [mockFaceApi, setMockFaceApi] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/settings');
            if (response.data?.success) {
                const settings = response.data.data;
                setMockFaceApi(settings.mock_face_api === 'true');
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            setSnackbar({ open: true, message: 'Failed to load settings', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMockFaceToggle = async (event) => {
        const newValue = event.target.checked;
        setSaving(true);

        try {
            const response = await api.put('/admin/settings', {
                key: 'mock_face_api',
                value: String(newValue)
            });

            if (response.data?.success) {
                setMockFaceApi(newValue);
                setSnackbar({
                    open: true,
                    message: newValue
                        ? 'Mock Face API enabled — all verifications will return 70-80% match'
                        : 'Mock Face API disabled — real face verification active',
                    severity: newValue ? 'warning' : 'success'
                });
            }
        } catch (error) {
            console.error('Failed to update setting:', error);
            setSnackbar({ open: true, message: 'Failed to update setting', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                    System Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Configure system-wide behavior for UAT and production environments
                </Typography>
            </Box>

            {/* Face Verification Section */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Shield size={22} />
                    <Typography variant="h6" fontWeight={600}>
                        Face Verification
                    </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                {/* Mock Face API Toggle */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: mockFaceApi ? 'warning.50' : 'grey.50',
                        border: '1px solid',
                        borderColor: mockFaceApi ? 'warning.200' : 'divider',
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Mock Face API
                            </Typography>
                            <Chip
                                label={mockFaceApi ? 'ON' : 'OFF'}
                                size="small"
                                color={mockFaceApi ? 'warning' : 'default'}
                                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                            {mockFaceApi
                                ? 'Mock mode is active. All face verifications will return 70-80% match regardless of the actual face. Use for UAT testing only.'
                                : 'Real face verification is active. Faces must match accurately for verification to pass.'}
                        </Typography>
                    </Box>
                    <Switch
                        checked={mockFaceApi}
                        onChange={handleMockFaceToggle}
                        disabled={saving}
                        color="warning"
                        sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#ED6C02',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#ED6C02',
                            },
                        }}
                    />
                </Box>

                {mockFaceApi && (
                    <Alert
                        severity="warning"
                        icon={<AlertTriangle size={18} />}
                        sx={{ mt: 2, borderRadius: 2 }}
                    >
                        <Typography variant="body2" fontWeight={600}>
                            Mock mode is enabled — DO NOT use in production.
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Every face comparison will return a random match between 70-80% similarity,
                            bypassing the actual OpenCV face recognition service.
                        </Typography>
                    </Alert>
                )}
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Settings;
