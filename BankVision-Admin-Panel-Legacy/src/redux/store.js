import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import customerReducer from './auth/customerSlice';
import customerAccountsReducer from './customer/customerAccountsSlice';
import customerImageReducer from './customer/customerImageSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customer: customerReducer,
    customerAccounts: customerAccountsReducer,
    customerImage: customerImageReducer,
  },
});
