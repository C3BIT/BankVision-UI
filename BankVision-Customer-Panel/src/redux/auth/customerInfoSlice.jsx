import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const updateCustomerPhone = createAsyncThunk(
  "customerInfo/updateCustomerPhone",
  async ({ accountNumber, phone }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/customer/update-phone", { accountNumber, phone });
      // API returns { status, data, message } - extract the data
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const updateCustomerEmail = createAsyncThunk(
  "customerInfo/updateCustomerEmail",
  async ({ accountNumber, email }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/customer/update-email", { accountNumber, email });
      // API returns { status, data, message } - extract the data
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const updateCustomerAddress = createAsyncThunk(
  "customerInfo/updateCustomerAddress",
  async ({ accountNumber, address }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/customer/update-address", { accountNumber, address });
      // API returns { status, data, message } - extract the data
      return response.data?.data || response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const fetchCustomerDetailsByAccount = createAsyncThunk(
    "customerDetails/fetchCustomerDetailsByAccount",
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

const customerInfoSlice = createSlice({
  name: "customerInfo",
  initialState: {
    phoneUpdatePending: false,
    phoneUpdated: false,
    emailUpdated: false,
    addressUpdated: false,
    updateError: null,
    accountDetails : {},
    updateSuccess: null,
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateCustomerPhone.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCustomerPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.phoneUpdated = !!action.payload;
        state.updateSuccess = action.payload?.message || null;
        state.updateError = null;
      })
      .addCase(updateCustomerPhone.rejected, (state, action) => {
        state.loading = false;
        state.phoneUpdated = false;
        state.updateError = action.payload;
        state.updateSuccess = null;
      })
      .addCase(updateCustomerEmail.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCustomerEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.emailUpdated = !!action.payload;
        state.updateSuccess = action.payload?.message || null;
        state.updateError = null;
      })
      .addCase(updateCustomerEmail.rejected, (state, action) => {
        state.loading = false;
        state.emailUpdated = false;
        state.updateError = action.payload;
        state.updateSuccess = null;
      })
      .addCase(updateCustomerAddress.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCustomerAddress.fulfilled, (state, action) => {
        state.loading = false;
        state.addressUpdated = !!action.payload;
        state.updateSuccess = action.payload?.message || null;
        state.updateError = null;
      })
      .addCase(updateCustomerAddress.rejected, (state, action) => {
        state.loading = false;
        state.addressUpdated = false;
        state.updateError = action.payload;
        state.updateSuccess = null;
      })
      .addCase(fetchCustomerDetailsByAccount.pending, (state) => {
        state.loading = true;
        state.accountDetails = {};
      })
      .addCase(fetchCustomerDetailsByAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accountDetails = action.payload;
        state.error = null;
      })
      .addCase(fetchCustomerDetailsByAccount.rejected, (state, action) => {
        state.loading = false;
        state.accountDetails = {};
        state.error = action.payload;
      });
  },
});

export default customerInfoSlice.reducer;
