import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const fetchCustomerAccountsByPhone = createAsyncThunk(
  "customer/fetchCustomerAccountsByPhone",
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/customer/find-phone", { phone });
      // API returns { status, data, message } - extract the data array
      return response.data?.data || response.data || [];
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const fetchCustomerDetailsByAccount = createAsyncThunk(
  "customer/fetchCustomerDetailsByAccount",
  async ({ accountNumber, phone }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/customer/details", { accountNumber, phone });
      // API returns { status, data, message } - extract the data
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

const customerAccountsSlice = createSlice({
  name: "customerAccounts",
  initialState: {
    accounts: [],
    accountDetails: {},
    loading: false,
    error: null,
    message: "",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerAccountsByPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.accounts = [];
        state.message = "";
      })
      .addCase(fetchCustomerAccountsByPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = Array.isArray(action.payload) ? action.payload : [];
        state.message = "";
      })
      .addCase(fetchCustomerAccountsByPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.accounts = [];
        state.message = "";
      })

      .addCase(fetchCustomerDetailsByAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.accountDetails = {};
      })
      .addCase(fetchCustomerDetailsByAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accountDetails = action.payload;
      })
      .addCase(fetchCustomerDetailsByAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.accountDetails = {};
      });
  },
});

export default customerAccountsSlice.reducer;
