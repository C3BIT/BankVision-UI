import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const sendOtpToCustomer = createAsyncThunk(
  "customer/sendOtpToCustomer",
  async ({ phone, checkDuplicate }, { rejectWithValue }) => {
    try {
      const payload = { phone };
      if (checkDuplicate) payload.checkDuplicate = true;
      const response = await publicPost("/otp/send-phone", payload);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const sendEmailOtpToCustomer = createAsyncThunk(
  "customer/sendEmailOtpToCustomer",
  async ({ email, checkDuplicate }, { rejectWithValue }) => {
    try {
      const payload = { email };
      if (checkDuplicate) payload.checkDuplicate = true;
      const response = await publicPost("/otp/send", payload);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const verifyEmailOtpToCustomer = createAsyncThunk(
  "customer/verifyEmailOtpToCustomer",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/otp/verify-email", { email, otp });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const verifyPhoneOtpToCustomer = createAsyncThunk(
  "customer/verifyPhoneOtpToCustomer",
  async ({ phone, otp }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/otp/verify-phone", { phone, otp });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

const customerSlice = createSlice({
  name: "customer",
  initialState: {
    phoneOtpStatus: null,
    emailOtpStatus: null,
    verifyPhoneOtpStatus: null,
    verifyEmailOtpStatus: null,
    loading: false,
    emailLoading: false,
    verifyLoading: false,
    error: null,
  },
  reducers: {
    resetOtpStatus: (state) => {
      state.phoneOtpStatus = null;
      state.emailOtpStatus = null;
      state.verifyPhoneOtpStatus = null;
      state.verifyEmailOtpStatus = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtpToCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.phoneOtpStatus = null;
      })
      .addCase(sendOtpToCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.phoneOtpStatus = action.payload;
      })
      .addCase(sendOtpToCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.phoneOtpStatus = null;
      })
      .addCase(sendEmailOtpToCustomer.pending, (state) => {
        state.emailLoading = true;
        state.error = null;
        state.emailOtpStatus = null;
      })
      .addCase(sendEmailOtpToCustomer.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.emailOtpStatus = action.payload;
      })
      .addCase(sendEmailOtpToCustomer.rejected, (state, action) => {
        state.emailLoading = false;
        state.error = action.payload;
        state.emailOtpStatus = null;
      })
      .addCase(verifyEmailOtpToCustomer.pending, (state) => {
        state.verifyLoading = true;
        state.error = null;
        state.verifyEmailOtpStatus = null;
      })
      .addCase(verifyEmailOtpToCustomer.fulfilled, (state, action) => {
        state.verifyLoading = false;
        state.verifyEmailOtpStatus = action.payload;
      })
      .addCase(verifyEmailOtpToCustomer.rejected, (state, action) => {
        state.verifyLoading = false;
        state.error = action.payload;
        state.verifyEmailOtpStatus = null;
      })
      .addCase(verifyPhoneOtpToCustomer.pending, (state) => {
        state.verifyLoading = true;
        state.error = null;
        state.verifyPhoneOtpStatus = null;
      })
      .addCase(verifyPhoneOtpToCustomer.fulfilled, (state, action) => {
        state.verifyLoading = false;
        state.verifyPhoneOtpStatus = action.payload;
      })
      .addCase(verifyPhoneOtpToCustomer.rejected, (state, action) => {
        state.verifyLoading = false;
        state.error = action.payload;
        state.verifyPhoneOtpStatus = null;
      });
  },
});

export const { resetOtpStatus } = customerSlice.actions;
export default customerSlice.reducer;
