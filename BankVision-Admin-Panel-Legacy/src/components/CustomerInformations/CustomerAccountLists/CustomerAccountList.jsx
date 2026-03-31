import {
  List, ListItem, ListItemIcon, ListItemText, Box, Typography, CircularProgress
} from '@mui/material';
import { AccountBalance, ChevronRight } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { fetchCustomerAccountsByPhone } from '../../../redux/customer/customerAccountsSlice';

const ClientAccountList = ({ onAccountSelect, phoneNumber }) => {
  const dispatch = useDispatch();
  const { accounts, loading } = useSelector((state) => state.customerAccounts);

  useEffect(() => {
    if (phoneNumber) {
      dispatch(fetchCustomerAccountsByPhone({ phone: phoneNumber }));
    }
  }, [phoneNumber, dispatch]);

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        pb: 1.5,
        pt: 0,
      }}
    >
      <Typography
        variant="h6"
        align="center"
        sx={{
          color: 'white',
          py: 2,
          fontWeight: 700,
          fontSize: '1.25rem',
          mb: 1,
        }}
      >
        Client's Account List
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} sx={{ color: 'white' }} />
        </Box>
      ) : (
        <List sx={{ width: '100%', px: 1.5 }}>
          {accounts.map((account) => (
            <ListItem
              key={account.accountNumber}
              onClick={() => onAccountSelect(account.accountNumber)}
              sx={{
                backgroundColor: '#EFF1F94D',
                borderRadius: 2,
                mb: 1,
                py: 1.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                border: '1px solid #e0e0e0',
                '&:hover': {
                  backgroundColor: '#e6e8f0',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: '#f0f4f8',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <AccountBalance sx={{ color: '#555', fontSize: 20 }} />
                </Box>
              </ListItemIcon>

              <ListItemText
                primary={
                  <Typography sx={{ fontSize: '0.95rem', color: '#555', fontWeight: 500 }}>
                    Branch: {account.branch}
                  </Typography>
                }
                secondary={
                  <Typography sx={{ fontSize: '0.95rem', color: '#366D8C', fontWeight: 700 }}>
                    A/C : {account.accountNumber}
                  </Typography>
                }
                sx={{ m: 0 }}
              />

              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50',
                  ml: 1,
                  '&:hover': {
                    backgroundColor: '#43A047',
                  },
                }}
              >
                <ChevronRight sx={{ color: 'white', fontSize: 24 }} />
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

ClientAccountList.propTypes = {
  onAccountSelect: PropTypes.func.isRequired,
  phoneNumber: PropTypes.string.isRequired,
};

export default ClientAccountList;
