import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import logger from 'redux-logger';
import authSlice from './auth/authSlice';
import customerReducer from "./auth/customerSlice";
import customerAccountsReducer from './customer/customerAccountsSlice';
import customerImageInfoReducer from './customer/customerImageSlice';

const persistConfig = {
  key: 'authentication',
  storage,
  // Auth is carried by the httpOnly auth_token cookie, not localStorage - only
  // the display-only manager profile is persisted; isAuthenticated is always
  // re-derived from the server via fetchCurrentManager on app load.
  whitelist: ['manager'],
};

const persistedReducer = persistReducer(persistConfig, authSlice);

const rootReducer = combineReducers({
  auth: persistedReducer,
  customer: customerReducer,
  customerAccounts: customerAccountsReducer,
  customerImageInfo: customerImageInfoReducer
});

const middlewares = [];
if (import.meta.env.DEV) {
  middlewares.push(logger);
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).concat(middlewares),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);