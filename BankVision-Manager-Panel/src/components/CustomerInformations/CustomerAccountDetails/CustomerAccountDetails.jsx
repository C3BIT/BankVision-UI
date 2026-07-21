import { Box, Typography, List, ListItem, Skeleton } from '@mui/material';
import { Phone, Email, Home, AccountBalance, ChevronRight, PersonOff } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { fetchCustomerDetailsByAccount } from '../../../redux/customer/customerAccountsSlice';
import { colors } from '../../../styles/tokens';

const AccountDetailsSkeleton = () => (
  <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Skeleton variant="rectangular" width={100} height={100} sx={{ mr: 3, borderRadius: 2 }} />
    <Box sx={{ flex: 1 }}>
      {[...Array(5)].map((_, idx) => (
        <Skeleton key={idx} variant="text" height={20} sx={{ mb: 1 }} />
      ))}
    </Box>
  </Box>
);
const CustomerAccountDetails = ({ selectedAccount, customerPhone, onServiceSelect }) => {

  const dispatch = useDispatch();

  const { accountDetails, loading } = useSelector((state) => state.customerAccounts);

  useEffect(() => {
    if (selectedAccount) {
      dispatch(fetchCustomerDetailsByAccount({ accountNumber: selectedAccount, phone: customerPhone }));
    }
  }, [selectedAccount, customerPhone, dispatch]);

  const services = [
    { id: 'phoneChange', icon: <Phone sx={{ color: '#555' }} />, label: 'Mobile Number Change' },
    { id: 'emailChange', icon: <Email sx={{ color: '#555' }} />, label: 'Email Change' },
    { id: 'addressChange', icon: <Home sx={{ color: '#555' }} />, label: 'Address Change' },
    { id: 'accountActivation', icon: <AccountBalance sx={{ color: '#555' }} />, label: 'Dormant Account Activation' }
  ];

  const handlePermissionChangeService = (serviceKey) => {
    onServiceSelect(serviceKey)
  }

  const toImgSrc = (b64) => b64 ? (b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`) : undefined;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{
        width: '100%',
        bgcolor: '#EFF1F94D',
        borderRadius: '12px',
        p: 3,
        border: `1px solid ${colors.border}`,
      }}>
        <Typography variant="h6" sx={{
          color: 'white',
          textAlign: 'center',
          mb: 2,
          fontWeight: 500,
        }}>
          Client's Account Details
        </Typography>

        {loading ? AccountDetailsSkeleton : <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              mr: 3,
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid white'
            }}
          >
            {accountDetails?.profileImage ? (
              <img
                src={toImgSrc(accountDetails.profileImage)}
                alt={accountDetails?.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  backgroundColor: '#eee',
                }}
              >
                <PersonOff sx={{ color: '#999', fontSize: 28 }} />
                <Typography sx={{ color: '#999', fontSize: 10, textAlign: 'center', lineHeight: 1.1 }}>
                  Photo unavailable
                </Typography>
              </Box>
            )}
          </Box>
          <Box>
            <Typography sx={{ color: 'white', mb: 0.5 }}>
              <strong>Name: </strong>{accountDetails?.name}
            </Typography>
            <Typography sx={{ color: 'white', mb: 0.5 }}>
              <strong>Mobile: </strong>{accountDetails?.mobileNumber}
            </Typography>
            <Typography sx={{ color: 'white', mb: 0.5 }}>
              <strong>Email: </strong>{accountDetails?.email}
            </Typography>
            <Typography sx={{ color: 'white', mb: 0.5 }}>
              <strong>Address: </strong>{accountDetails?.address}
            </Typography>
            <Typography sx={{ color: 'white', mb: 0 }}>
              <strong>Branch: </strong>{accountDetails?.branch}
            </Typography>
          </Box>
        </Box>}


      </Box>

      <Box sx={{
        width: '100%',
        bgcolor: "#EFF1F94D",
        borderRadius: '12px',
        p: 3,
        border: `1px solid ${colors.border}`,
      }}>
        <Typography variant="h6" sx={{
          color: 'white',
          textAlign: 'center',
          mb: 2,
          fontWeight: 500,
        }}>
          Services
        </Typography>

        <List sx={{ width: '100%', p: 0, }}>
          {services.map((service) => (
            <ListItem
              key={service.id}
              onClick={() => handlePermissionChangeService(service.id)}
              sx={{
                backgroundColor: '#EFF1F94D',
                borderRadius: '10px',
                mb: 1.5,
                py: 1.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                border: `1px solid ${colors.border}`,
                '&:hover': {
                  backgroundColor: 'rgba(239, 241, 249, 0.4)'
                }
              }}
            >
              <Box sx={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: '#f0f4f8',
                border: `1px solid ${colors.border}`,
                mr: 2
              }}>
                {service.icon}
              </Box>

              <Typography sx={{ flex: 1, color: '#555', fontWeight: 500, fontSize: '0.95rem' }}>
                {service.label}
              </Typography>

              <Box
                sx={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: colors.success,
                  '&:hover': {
                    backgroundColor: colors.success,
                  }
                }}
              >
                <ChevronRight sx={{ color: 'white', fontSize: 22 }} />
              </Box>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

CustomerAccountDetails.propTypes = {
  selectedAccount: PropTypes.string,
  customerPhone: PropTypes.string,
  onServiceSelect: PropTypes.func.isRequired
};

export default CustomerAccountDetails;