import { useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomerAccountsByPhone, fetchCustomerDetailsByAccount } from '../../redux/customer/customerAccountsSlice';

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return '';
  const str = accountNumber.toString();
  if (str.length <= 6) return str;
  const firstThree = str.substring(0, 3);
  const lastThree = str.substring(str.length - 3);
  const stars = '*'.repeat(str.length - 6);
  return `${firstThree}${stars}${lastThree}`;
};

const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return '';
  const str = cardNumber.toString();
  if (str.length <= 6) return str;
  const firstThree = str.substring(0, 3);
  const lastTwo = str.substring(str.length - 2);
  const stars = '*'.repeat(Math.max(0, str.length - 5));
  return `${firstThree}${stars}${lastTwo}`;
};

const CustomerInfoPanel = ({ customerPhone, customerName, onAccountSelect }) => {
  const dispatch = useDispatch();
  const { accounts, accountDetails, loading } = useSelector((state) => state.customerAccounts);

  useEffect(() => {
    if (customerPhone) {
      dispatch(fetchCustomerAccountsByPhone({ phone: customerPhone }));
    }
  }, [customerPhone, dispatch]);

  // Mock customer info (in real app, this would come from API or Redux)
  const customerInfo = {
    name: customerName || 'Customer',
    mobile: customerPhone || '',
    email: accountDetails?.email || 'N/A',
    address: accountDetails?.address || 'N/A',
  };

  // Mock card and loan data (in real app, these would come from API)
  const cards = accountDetails?.cards || [];
  const loans = accountDetails?.loans || [];

  const handleAccountClick = (accountNumber) => {
    if (onAccountSelect) {
      onAccountSelect(accountNumber);
    }
    dispatch(fetchCustomerDetailsByAccount({ accountNumber, phone: customerPhone }));
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Client's Information */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A1A1A',
            mb: 2,
          }}
        >
          Client's Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#666666', minWidth: 70 }}>
              Name:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 500 }}>
              {customerInfo.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#666666', minWidth: 70 }}>
              Mobile:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 500 }}>
              {customerInfo.mobile}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#666666', minWidth: 70 }}>
              E-mail:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 500 }}>
              {customerInfo.email}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#666666', minWidth: 70 }}>
              Address:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 500 }}>
              {customerInfo.address}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Account List */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A1A1A',
            mb: 2,
          }}
        >
          Account List
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : accounts.length > 0 ? (
          <List sx={{ p: 0 }}>
            {accounts.map((account, index) => (
              <ListItem
                key={account.accountNumber || index}
                onClick={() => handleAccountClick(account.accountNumber)}
                sx={{
                  p: 1.5,
                  mb: 1,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 2,
                  border: '1px solid #E0E0E0',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#F0F0F0',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      backgroundColor: '#E3F2FD',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DescriptionIcon sx={{ fontSize: 18, color: '#0066FF' }} />
                  </Box>
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A' }}>
                      A/C : {account.accountNumber}
                    </Typography>
                  }
                  secondary={
                    <Typography sx={{ fontSize: '0.75rem', color: '#666666', mt: 0.5 }}>
                      {account.accountType || 'Savings Account'}, {account.branch || 'Main Branch'}
                    </Typography>
                  }
                />

                <ChevronRightIcon sx={{ fontSize: 20, color: '#999999' }} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: '#999999', textAlign: 'center', py: 2 }}>
            No accounts found
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Card List */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A1A1A',
            mb: 2,
          }}
        >
          Card List
        </Typography>

        {cards.length > 0 ? (
          <List sx={{ p: 0 }}>
            {cards.map((card, index) => (
              <ListItem
                key={card.cardNumber || index}
                sx={{
                  p: 1.5,
                  mb: 1,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 2,
                  border: '1px solid #E0E0E0',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#F0F0F0',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      backgroundColor: '#FFF4E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CreditCardIcon sx={{ fontSize: 18, color: '#FF9800' }} />
                  </Box>
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A' }}>
                      {maskCardNumber(card.cardNumber)}
                    </Typography>
                  }
                  secondary={
                    <Typography sx={{ fontSize: '0.75rem', color: '#666666', mt: 0.5 }}>
                      {card.cardType || 'Visa Credit Card'} - {card.tier || 'Platinum'}
                    </Typography>
                  }
                />

                <ChevronRightIcon sx={{ fontSize: 20, color: '#999999' }} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: '#999999', textAlign: 'center', py: 2 }}>
            No cards found
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Loan Details */}
      <Box>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1A1A1A',
            mb: 2,
          }}
        >
          Loan Details
        </Typography>

        {loans.length > 0 ? (
          <List sx={{ p: 0 }}>
            {loans.map((loan, index) => (
              <ListItem
                key={loan.loanNumber || index}
                sx={{
                  p: 1.5,
                  mb: 1,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 2,
                  border: '1px solid #E0E0E0',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#F0F0F0',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      backgroundColor: '#E5F7E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AccountBalanceIcon sx={{ fontSize: 18, color: '#4CAF50' }} />
                  </Box>
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A' }}>
                      {maskCardNumber(loan.loanNumber)}
                    </Typography>
                  }
                  secondary={
                    <Typography sx={{ fontSize: '0.75rem', color: '#666666', mt: 0.5 }}>
                      {loan.loanType || 'Personal Loan'} - {loan.status || 'Active'}
                    </Typography>
                  }
                />

                <ChevronRightIcon sx={{ fontSize: 20, color: '#999999' }} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: '#999999', textAlign: 'center', py: 2 }}>
            No loans found
          </Typography>
        )}
      </Box>
    </Box>
  );
};

CustomerInfoPanel.propTypes = {
  customerPhone: PropTypes.string.isRequired,
  customerName: PropTypes.string,
  onAccountSelect: PropTypes.func,
};

export default CustomerInfoPanel;
