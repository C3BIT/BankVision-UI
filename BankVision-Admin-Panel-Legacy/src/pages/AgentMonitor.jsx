import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Button,
  Badge,
  Divider,
} from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RefreshIcon from '@mui/icons-material/Refresh';
import { io } from 'socket.io-client';

const statusColors = {
  online: '#4CAF50',
  busy: '#FF9800',
  'in-call': '#2196F3',
  break: '#9E9E9E',
  lunch: '#795548',
  prayer: '#673AB7',
  'not-ready': '#F44336',
  offline: '#BDBDBD',
};

const statusLabels = {
  online: 'Online',
  busy: 'Busy',
  'in-call': 'In Call',
  break: 'On Break',
  lunch: 'Lunch',
  prayer: 'Prayer',
  'not-ready': 'Not Ready',
  offline: 'Offline',
};

const AgentCard = ({ agent, onRespondAssistance }) => {
  const needsAssistance = agent.assistanceRequest?.status === 'pending';

  return (
    <Card
      sx={{
        height: '100%',
        border: needsAssistance ? '2px solid #FF9800' : 'none',
        animation: needsAssistance ? 'pulse 1s infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 152, 0, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(255, 152, 0, 0)' },
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: statusColors[agent.status] || statusColors.offline,
                  border: '2px solid white',
                }}
              />
            }
          >
            <Avatar src={agent.profileImage} sx={{ width: 48, height: 48 }}>
              {agent.name?.charAt(0)}
            </Avatar>
          </Badge>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={600}>{agent.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {agent.email}
            </Typography>
          </Box>
          <Chip
            label={statusLabels[agent.status] || 'Unknown'}
            size="small"
            sx={{
              backgroundColor: `${statusColors[agent.status]}20`,
              color: statusColors[agent.status],
              fontWeight: 600,
            }}
          />
        </Box>

        {agent.currentCall && (
          <Box
            sx={{
              p: 1.5,
              backgroundColor: '#E3F2FD',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneInTalkIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontWeight={500}>
                In Call with: {agent.currentCall.customerPhone}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Duration: {agent.currentCall.duration || '0:00'}
            </Typography>
          </Box>
        )}

        {needsAssistance && (
          <Box
            sx={{
              p: 1.5,
              backgroundColor: '#FFF3E0',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <NotificationsActiveIcon fontSize="small" color="warning" />
              <Typography variant="body2" fontWeight={600} color="warning.dark">
                Assistance Requested!
              </Typography>
            </Box>
            {agent.assistanceRequest.reason && (
              <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                Reason: {agent.assistanceRequest.reason}
              </Typography>
            )}
            <Chip
              label={`Urgency: ${agent.assistanceRequest.urgency || 'normal'}`}
              size="small"
              color={agent.assistanceRequest.urgency === 'high' ? 'error' : 'warning'}
            />
            <Button
              size="small"
              variant="contained"
              color="warning"
              sx={{ mt: 1, width: '100%' }}
              onClick={() => onRespondAssistance(agent)}
            >
              Respond
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const AgentMonitor = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [assistanceRequests, setAssistanceRequests] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const WS_URL = process.env.REACT_APP_WS_URL;

    const newSocket = io(WS_URL, {
      transports: ['websocket'],
      query: { token },
    });

    newSocket.on('connect', () => {
      console.log('Admin socket connected');
      newSocket.emit('admin:get-managers');
    });

    newSocket.on('admin:managers-list', (managers) => {
      console.log('Received managers:', managers);
      setAgents(managers);
      setLoading(false);
    });

    newSocket.on('managers:status', (managers) => {
      console.log('Managers status update:', managers);
      setAgents(managers);
    });

    newSocket.on('supervisor:assistance-requested', (request) => {
      console.log('Assistance requested:', request);
      setAssistanceRequests((prev) => [...prev, request]);

      // Update agent with assistance request
      setAgents((prev) =>
        prev.map((agent) =>
          agent.email === request.managerEmail
            ? { ...agent, assistanceRequest: request }
            : agent
        )
      );
    });

    newSocket.on('supervisor:assistance-cancelled', (data) => {
      console.log('Assistance cancelled:', data);
      setAssistanceRequests((prev) =>
        prev.filter((r) => r.requestId !== data.requestId)
      );

      setAgents((prev) =>
        prev.map((agent) =>
          agent.email === data.managerEmail
            ? { ...agent, assistanceRequest: null }
            : agent
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleRespondAssistance = (agent) => {
    if (socket && agent.assistanceRequest) {
      socket.emit('supervisor:respond-assistance', {
        requestId: agent.assistanceRequest.requestId,
        customerPhone: agent.assistanceRequest.customerPhone,
        response: 'Supervisor is aware and monitoring.',
      });

      // Update local state
      setAgents((prev) =>
        prev.map((a) =>
          a.email === agent.email
            ? { ...a, assistanceRequest: { ...a.assistanceRequest, status: 'responded' } }
            : a
        )
      );
    }
  };

  const handleRefresh = () => {
    if (socket) {
      setLoading(true);
      socket.emit('admin:get-managers');
    }
  };

  const onlineAgents = agents.filter((a) => a.status !== 'offline');
  const inCallAgents = agents.filter((a) => a.status === 'in-call' || a.currentCall);
  const pendingAssistance = agents.filter(
    (a) => a.assistanceRequest?.status === 'pending'
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Agent Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time view of all VBRM agents
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="primary">
              {agents.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Agents
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="success.main">
              {onlineAgents.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Online
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="info.main">
              {inCallAgents.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Call
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="warning.main">
              {pendingAssistance.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Need Assistance
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Assistance Alerts */}
      {pendingAssistance.length > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: '#FFF3E0',
            border: '1px solid #FF9800',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <NotificationsActiveIcon color="warning" />
            <Typography fontWeight={600} color="warning.dark">
              {pendingAssistance.length} Agent(s) Requesting Assistance
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Please review and respond to assistance requests below.
          </Typography>
        </Paper>
      )}

      {/* Agent Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : agents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SupportAgentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">No agents connected</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={agent.email}>
              <AgentCard
                agent={agent}
                onRespondAssistance={handleRespondAssistance}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AgentMonitor;
