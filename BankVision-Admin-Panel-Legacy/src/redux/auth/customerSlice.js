import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const sendOtpToCustomer = createAsyncThunk(
  "customer/sendOtpToCustomer",
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/otp/send-phone", { phone });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response);
    }
  }
);

export const sendEmailOtpToCustomer = createAsyncThunk(
  "customer/sendEmailOtpToCustomer",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/otp/send", { email });
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
    loading: false,
    emailLoading: false,
    error: null,
  },
  reducers: {
    resetOtpStatus: (state) => {
      state.phoneOtpStatus = null;
      state.emailOtpStatus = null;
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
      });
  },
});

export const { resetOtpStatus } = customerSlice.actions;
export default customerSlice.reducer;
