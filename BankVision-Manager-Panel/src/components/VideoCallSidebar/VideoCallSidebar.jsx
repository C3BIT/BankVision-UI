import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Tooltip } from '@mui/material';
import {
  Person as PersonIcon,
  Face as FaceIcon,
  Settings as ServicesIcon,
  VerifiedUser as OTPIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import OTPVerificationPanel from '../OTPVerificationPanel/OTPVerificationPanel';
import CustomerInfoPanel from '../CustomerInfoPanel/CustomerInfoPanel';
import FaceVerificationPanel from '../FaceVerificationPanel/FaceVerificationPanel';
import AccountInfoDisplay from '../AccountInfoDisplay/AccountInfoDisplay';
import ServiceSelector from '../ServiceSelector/ServiceSelector';

const TabPanel = ({ children, value, index }) => {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        height: '100%',
        overflow: 'auto',
      }}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
  );
};

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const VideoCallSidebar = ({
  customerPhone,
  customerName,
  customerEmail,
  onAccountSelect,
  accountDetails,
  onServiceSelect,
  initialTab = 0,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const { phoneVerified, faceVerificationStatus } = useWebSocket();

  // Check if both phone and face verification are complete
  const isFaceVerified = faceVerificationStatus === 'verified';
  const canAccessServices = phoneVerified && isFaceVerified;

  const handleTabChange = (event, newValue) => {
    // Don't allow switching to Services tab if verifications not complete
    if (newValue === 3 && !canAccessServices) {
      return;
    }
    setActiveTab(newValue);
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Tabs Navigation */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: '#F5F5F5',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 64,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 500,
              minHeight: 64,
              color: '#666666',
              padding: '12px 8px',
              '&.Mui-selected': {
                color: '#0066FF',
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#0066FF',
              height: 3,
            },
          }}
        >
          <Tab
            icon={<OTPIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="OTP"
          />
          <Tab
            icon={<PersonIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Customer"
          />
          <Tab
            icon={<FaceIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Face"
          />
          <Tab
            icon={canAccessServices ? <ServicesIcon sx={{ fontSize: 18 }} /> : <LockIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Services"
            disabled={!canAccessServices}
            sx={{
              '&.Mui-disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
              },
            }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* OTP Verification Tab */}
        <TabPanel value={activeTab} index={0}>
          <OTPVerificationPanel
            customerPhone={customerPhone}
            customerEmail={customerEmail}
          />
        </TabPanel>

        {/* Customer Info Tab */}
        <TabPanel value={activeTab} index={1}>
          <CustomerInfoPanel
            customerPhone={customerPhone}
            customerName={customerName}
            onAccountSelect={onAccountSelect}
          />
        </TabPanel>

        {/* Face Verification Tab */}
        <TabPanel value={activeTab} index={2}>
          <FaceVerificationPanel customerName={customerPhone} />
        </TabPanel>

        {/* Services Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Account Info Display */}
            {accountDetails && (
              <AccountInfoDisplay accountDetails={accountDetails} />
            )}

            {/* Service Selector */}
            <ServiceSelector onServiceSelect={onServiceSelect} />
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

VideoCallSidebar.propTypes = {
  customerPhone: PropTypes.string.isRequired,
  customerName: PropTypes.string,
  onAccountSelect: PropTypes.func,
  accountDetails: PropTypes.object,
  onServiceSelect: PropTypes.func,
  initialTab: PropTypes.number,
};

export default VideoCallSidebar;
