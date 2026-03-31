import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Tooltip,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Visibility as ListenIcon,
  RecordVoiceOver as WhisperIcon,
  VolumeUp as BargeIcon,
  SwapHoriz as TakeoverIcon,
  ExitToApp as LeaveIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
  CheckCircle as VerifiedIcon,
  Cancel as UnverifiedIcon,
  Pause as HoldIcon,
  Refresh as RefreshIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import OpenViduMeetComponent from '../components/OpenViduMeetComponent';
import CustomerVerificationScreen from '../components/CustomerVerificationScreen/CustomerVerificationScreen';

const API_URL = process.env.REACT_APP_API_URL;
const WS_URL = process.env.REACT_APP_WS_URL;

const SupervisorDashboard = () => {
  const [activeCalls, setActiveCalls] = useState([]);
  const [assistanceRequests, setAssistanceRequests] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [monitoringMode, setMonitoringMode] = useState(null); // listen, whisper, barge
  const [whisperDialogOpen, setWhisperDialogOpen] = useState(false);
  const [whisperMessage, setWhisperMessage] = useState('');
  const [whisperChat, setWhisperChat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [videoRoomName, setVideoRoomName] = useState(null); // For OpenVidu
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  // Queue state
  const [callQueue, setCallQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({});
  // Verification state (for takeover mode)
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationPending, setVerificationPending] = useState({
    phone: false,
    email: false,
    face: false
  });
  const [callTarget, setCallTarget] = useState(null);
  const socketRef = useRef(null);

  const connectSocket = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    socketRef.current = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Supervisor connected to socket');
      setConnected(true);
      socketRef.current.emit('supervisor:get-active-calls');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Supervisor disconnected');
      setConnected(false);
    });

    socketRef.current.on('supervisor:active-calls', (calls) => {
      setActiveCalls(calls);
      setLoading(false);
    });

    // Queue events
    socketRef.current.on('queue:list', (data) => {
      console.log('📋 Queue list received:', data);
      setCallQueue(data.queue || []);
      setQueueStats(data.stats || {});
    });

    socketRef.current.on('queue:updated', (data) => {
      console.log('📋 Queue updated:', data);
      setCallQueue(data.queue || []);
      setQueueStats(data.stats || {});
    });

    // Request initial queue
    socketRef.current.emit('queue:get');

    socketRef.current.on('supervisor:assistance-requested', (request) => {
      setAssistanceRequests(prev => {
        const exists = prev.find(r => r.requestId === request.requestId);
        if (exists) return prev;
        return [...prev, request];
      });
    });

    socketRef.current.on('supervisor:assistance-cancelled', (data) => {
      setAssistanceRequests(prev =>
        prev.filter(r => r.requestId !== data.requestId)
      );
    });

    socketRef.current.on('supervisor:call-joined', (data) => {
      setSelectedCall(data);
      setMonitoringMode(data.mode || 'listen');
      // Set video room for OpenVidu
      if (data.callRoom) {
        setVideoRoomName(data.callRoom);
        setShowVideoPanel(true);
      }
    });

    socketRef.current.on('supervisor:whisper-active', () => {
      setMonitoringMode('whisper');
    });

    socketRef.current.on('supervisor:whisper-inactive', () => {
      setMonitoringMode('listen');
    });

    socketRef.current.on('supervisor:barge-active', (data) => {
      setMonitoringMode('barge');
      // Use OpenVidu
      if (data.callRoom) {
        setVideoRoomName(data.callRoom);
        setShowVideoPanel(true);
      }
    });

    socketRef.current.on('supervisor:takeover-complete', (data) => {
      setMonitoringMode('takeover');
      // Use OpenVidu
      if (data.callRoom) {
        setVideoRoomName(data.callRoom);
        setShowVideoPanel(true);
      }
      // Set call target for verification screen
      setCallTarget({
        name: data.customerPhone,
        phone: data.customerPhone,
        room: data.callRoom
      });
      // Inherit verification state if passed
      if (data.verificationState) {
        setPhoneVerified(data.verificationState.phoneVerified || false);
        setEmailVerified(data.verificationState.emailVerified || false);
        setVerificationPending(data.verificationState.pending || { phone: false, email: false, face: false });
      }
    });

    socketRef.current.on('supervisor:call-left', () => {
      setSelectedCall(null);
      setMonitoringMode(null);
      setWhisperChat([]);
      setVideoRoomName(null);
      setShowVideoPanel(false);
    });

    socketRef.current.on('supervisor:text-whisper-sent', (msg) => {
      setWhisperChat(prev => [...prev, { ...msg, fromMe: true }]);
    });

    socketRef.current.on('manager:text-whisper-reply', (msg) => {
      setWhisperChat(prev => [...prev, { ...msg, fromMe: false }]);
    });

    // Verification events (for takeover mode)
    socketRef.current.on('customer:phone-verified', () => {
      setPhoneVerified(true);
      setVerificationPending(prev => ({ ...prev, phone: false }));
    });

    socketRef.current.on('customer:email-verified', () => {
      setEmailVerified(true);
      setVerificationPending(prev => ({ ...prev, email: false }));
    });

    socketRef.current.on('manager:face-verification-result', (data) => {
      setVerificationPending(prev => ({ ...prev, face: false }));
    });

    socketRef.current.on('verification:otp-sent', () => {
      setVerificationPending(prev => ({ ...prev, phone: true }));
    });

    // Refresh active calls periodically
    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('supervisor:get-active-calls');
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  const handleJoinCall = (customerPhone, mode = 'listen') => {
    socketRef.current?.emit('supervisor:join-call', { customerPhone, mode });
  };

  const handleStartWhisper = () => {
    if (selectedCall) {
      socketRef.current?.emit('supervisor:start-whisper', {
        customerPhone: selectedCall.customerPhone
      });
    }
  };

  const handleStopWhisper = () => {
    if (selectedCall) {
      socketRef.current?.emit('supervisor:stop-whisper', {
        customerPhone: selectedCall.customerPhone
      });
    }
  };

  const handleBargeIn = () => {
    if (selectedCall) {
      socketRef.current?.emit('supervisor:barge-in', {
        customerPhone: selectedCall.customerPhone
      });
    }
  };

  const handleTakeover = () => {
    if (selectedCall && window.confirm('Are you sure you want to take over this call?')) {
      socketRef.current?.emit('supervisor:takeover-call', {
        customerPhone: selectedCall.customerPhone
      });
    }
  };

  const handleLeaveCall = () => {
    if (selectedCall) {
      socketRef.current?.emit('supervisor:leave-call', {
        customerPhone: selectedCall.customerPhone
      });
    }
    // Reset video panel and verification state
    setVideoRoomName(null);
    setShowVideoPanel(false);
    setCallTarget(null);
    setPhoneVerified(false);
    setEmailVerified(false);
    setVerificationPending({ phone: false, email: false, face: false });
  };

  const handleVideoLeave = () => {
    handleLeaveCall();
  };

  // Verification handlers for takeover mode
  const requestPhoneVerification = () => {
    socketRef.current?.emit('request:phone-verification');
    setVerificationPending(prev => ({ ...prev, phone: true }));
  };

  const requestEmailVerification = (email) => {
    socketRef.current?.emit('request:email-verification', { customerEmail: email });
    setVerificationPending(prev => ({ ...prev, email: true }));
  };

  const requestPhoneChange = () => {
    socketRef.current?.emit('manager:request-phone-change');
  };

  const requestFaceVerification = () => {
    socketRef.current?.emit('manager:request-face-verification', { timestamp: Date.now() });
    setVerificationPending(prev => ({ ...prev, face: true }));
  };

  const handleSendWhisper = () => {
    if (selectedCall && whisperMessage.trim()) {
      socketRef.current?.emit('supervisor:text-whisper', {
        customerPhone: selectedCall.customerPhone,
        message: whisperMessage
      });
      setWhisperMessage('');
    }
  };

  const handleRespondAssistance = (request, response) => {
    socketRef.current?.emit('supervisor:respond-assistance', {
      requestId: request.requestId,
      customerPhone: request.customerPhone,
      response
    });
    setAssistanceRequests(prev =>
      prev.filter(r => r.requestId !== request.requestId)
    );
  };

  const refreshCalls = () => {
    setLoading(true);
    socketRef.current?.emit('supervisor:get-active-calls');
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '0:00';
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Supervisor Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={connected ? 'Connected' : 'Disconnected'}
            color={connected ? 'success' : 'error'}
            size="small"
          />
          <IconButton onClick={refreshCalls} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Assistance Requests */}
      {assistanceRequests.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WarningIcon color="warning" />
            Assistance Requests ({assistanceRequests.length})
          </Typography>
          <Grid container spacing={2}>
            {assistanceRequests.map((request) => (
              <Grid item xs={12} md={6} lg={4} key={request.requestId}>
                <Card sx={{ bgcolor: request.urgency === 'urgent' ? '#ffebee' : '#fff' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {request.managerName || request.managerEmail}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customer: {request.customerPhone}
                    </Typography>
                    {request.reason && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Reason: {request.reason}
                      </Typography>
                    )}
                    <Chip
                      label={request.urgency}
                      size="small"
                      color={request.urgency === 'urgent' ? 'error' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        handleJoinCall(request.customerPhone, 'listen');
                        handleRespondAssistance(request, 'Joining call');
                      }}
                    >
                      Join Call
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleRespondAssistance(request, 'Acknowledged')}
                    >
                      Acknowledge
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Call Queue Section */}
      {callQueue.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Badge badgeContent={callQueue.length} color="warning">
              <PhoneIcon color="warning" />
            </Badge>
            <Typography variant="h6">
              Call Queue
            </Typography>
            <Chip label={`${queueStats.waitingCalls || 0} waiting`} color="warning" size="small" />
            <Chip label={`${queueStats.onlineManagers || 0} online`} color="success" size="small" />
            <Chip label={`${queueStats.busyManagers || 0} busy`} color="error" size="small" />
          </Box>
          <List dense>
            {callQueue.map((item, index) => (
              <ListItem
                key={item.id}
                sx={{
                  border: '1px solid #ffb74d',
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: 'white'
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: item.priority === 'high' ? '#f44336' : '#ff9800', width: 32, height: 32, fontSize: '0.875rem' }}>
                    {index + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={item.customerPhone}
                  secondary={`Waiting since ${new Date(item.queuedAt).toLocaleTimeString()} | Priority: ${item.priority}`}
                />
                <Chip
                  label={item.priority}
                  size="small"
                  color={item.priority === 'high' ? 'error' : 'default'}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Active Calls List */}
        <Grid item xs={12} md={selectedCall ? 6 : 12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Calls ({activeCalls.length})
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : activeCalls.length === 0 ? (
              <Alert severity="info">No active calls at the moment</Alert>
            ) : (
              <List>
                {activeCalls.map((call) => (
                  <ListItem
                    key={call.customerPhone}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: selectedCall?.customerPhone === call.customerPhone ? '#e3f2fd' : 'white'
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Listen">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleJoinCall(call.customerPhone, 'listen')}
                          >
                            <ListenIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Text Whisper">
                          <IconButton
                            size="small"
                            onClick={() => {
                              handleJoinCall(call.customerPhone, 'listen');
                              setWhisperDialogOpen(true);
                            }}
                          >
                            <ChatIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={call.assistanceRequested ? '!' : null}
                        color="error"
                      >
                        <Avatar sx={{ bgcolor: call.isOnHold ? '#ff9800' : '#1976d2' }}>
                          {call.isOnHold ? <HoldIcon /> : <PhoneIcon />}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight="bold">
                            {call.customerPhone}
                          </Typography>
                          {call.isOnHold && <Chip label="On Hold" size="small" color="warning" />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Manager: {call.managerEmail}
                          </Typography>
                          <Typography variant="body2">
                            Duration: {formatDuration(call.startTime)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Tooltip title="Phone Verified">
                              {call.phoneVerified ?
                                <VerifiedIcon fontSize="small" color="success" /> :
                                <UnverifiedIcon fontSize="small" color="disabled" />
                              }
                            </Tooltip>
                            <Tooltip title="Email Verified">
                              {call.emailVerified ?
                                <VerifiedIcon fontSize="small" color="success" /> :
                                <UnverifiedIcon fontSize="small" color="disabled" />
                              }
                            </Tooltip>
                            <Tooltip title="Face Verified">
                              {call.faceVerified ?
                                <VerifiedIcon fontSize="small" color="success" /> :
                                <UnverifiedIcon fontSize="small" color="disabled" />
                              }
                            </Tooltip>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Call Monitor Panel */}
        {selectedCall && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Monitoring: {selectedCall.customerPhone}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Chip
                  label={`Mode: ${monitoringMode?.toUpperCase() || 'NONE'}`}
                  color={
                    monitoringMode === 'whisper' ? 'warning' :
                      monitoringMode === 'barge' ? 'error' :
                        monitoringMode === 'takeover' ? 'secondary' : 'primary'
                  }
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Manager: {selectedCall.managerEmail}
                </Typography>
              </Box>

              {/* OpenVidu Video Panel */}
              {showVideoPanel && videoRoomName && (
                <Box sx={{ mb: 2 }}>
                  <OpenViduMeetComponent
                    roomName={videoRoomName}
                    displayName="Supervisor"
                    mode={monitoringMode || 'listen'}
                    onLeave={handleVideoLeave}
                    showInHalfScreen={true}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Control Buttons */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant={showVideoPanel ? 'contained' : 'outlined'}
                    color="primary"
                    startIcon={<VideocamIcon />}
                    onClick={() => setShowVideoPanel(!showVideoPanel)}
                  >
                    {showVideoPanel ? 'Hide Video' : 'Show Video'}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant={monitoringMode === 'whisper' ? 'contained' : 'outlined'}
                    color="warning"
                    startIcon={<WhisperIcon />}
                    onClick={monitoringMode === 'whisper' ? handleStopWhisper : handleStartWhisper}
                  >
                    {monitoringMode === 'whisper' ? 'Stop Whisper' : 'Start Whisper'}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant={monitoringMode === 'barge' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<BargeIcon />}
                    onClick={handleBargeIn}
                    disabled={monitoringMode === 'barge'}
                  >
                    Barge In
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant={monitoringMode === 'takeover' ? 'contained' : 'outlined'}
                    color="secondary"
                    startIcon={<TakeoverIcon />}
                    onClick={handleTakeover}
                    disabled={monitoringMode === 'takeover'}
                  >
                    Take Over
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<LeaveIcon />}
                    onClick={handleLeaveCall}
                  >
                    Leave Call
                  </Button>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Text Whisper Chat */}
              <Typography variant="subtitle2" gutterBottom>
                Private Chat with Manager
              </Typography>
              <Box
                sx={{
                  height: 200,
                  overflowY: 'auto',
                  bgcolor: '#f5f5f5',
                  p: 1,
                  borderRadius: 1,
                  mb: 1
                }}
              >
                {whisperChat.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    No messages yet
                  </Typography>
                ) : (
                  whisperChat.map((msg) => (
                    <Box
                      key={msg.id}
                      sx={{
                        mb: 1,
                        textAlign: msg.fromMe ? 'right' : 'left'
                      }}
                    >
                      <Chip
                        label={msg.message}
                        size="small"
                        color={msg.fromMe ? 'primary' : 'default'}
                        sx={{ maxWidth: '80%' }}
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message to manager..."
                  value={whisperMessage}
                  onChange={(e) => setWhisperMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendWhisper()}
                />
                <IconButton color="primary" onClick={handleSendWhisper}>
                  <SendIcon />
                </IconButton>
              </Box>

              {/* Takeover Controls - Show verification controls when in takeover mode */}
              {monitoringMode === 'takeover' && callTarget && (
                <CustomerVerificationScreen
                  socket={socketRef.current}
                  callTarget={callTarget}
                  phoneVerified={phoneVerified}
                  emailVerified={emailVerified}
                  verificationPending={verificationPending}
                  requestPhoneVerification={requestPhoneVerification}
                  requestEmailVerification={requestEmailVerification}
                  requestPhoneChange={requestPhoneChange}
                  requestFaceVerification={requestFaceVerification}
                />
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Text Whisper Dialog (alternative UI) */}
      <Dialog
        open={whisperDialogOpen}
        onClose={() => setWhisperDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Text Whisper to Manager</DialogTitle>
        <DialogContent>
          <Box sx={{ height: 300, overflowY: 'auto', mb: 2, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            {whisperChat.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  mb: 1,
                  textAlign: msg.fromMe ? 'right' : 'left'
                }}
              >
                <Chip
                  label={msg.message}
                  color={msg.fromMe ? 'primary' : 'default'}
                />
                <Typography variant="caption" display="block">
                  {msg.senderName} - {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            ))}
          </Box>
          <TextField
            fullWidth
            placeholder="Type a private message..."
            value={whisperMessage}
            onChange={(e) => setWhisperMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendWhisper()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWhisperDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleSendWhisper}>Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupervisorDashboard;
