import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import logger from 'redux-logger';
import authSlice from "./auth/authSlice";
import customerReducer from "./auth/customerSlice";
import customerInfoReducer from "./auth/customerInfoSlice"; 
import customerImageReducer from "./auth/customerImageSlice"; 

const persistConfig = {
  key: "authentication",
  storage,
};
const persistedReducer = persistReducer(persistConfig,authSlice);
const combinedReducer = {
  user: persistedReducer,
  customer: customerReducer,
  customerInfo: customerInfoReducer,
  customerImage: customerImageReducer
 
};
const middlewares = [];
if (import.meta.env.DEV) {
  middlewares.push(logger);
}
export const store = configureStore({
  reducer: combinedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).concat(middlewares),
  devTools: import.meta.env.DEV,
});
export const persistor = persistStore(store);