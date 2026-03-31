import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ email, otp, username, password }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/manager/registration", {
        name: username,
        email,
        password,
        verificationOtp: otp,
      });
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.error?.message ||
                          "Invalid OTP. Please try again.";
      return rejectWithValue({ message: errorMessage });
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await publicPost("/otp/send", {
        email: userData.email,
      });
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.error?.message ||
                          "Failed to send OTP. Please try again.";
      return rejectWithValue({ message: errorMessage });
    }
  }
);

export const loginManager = createAsyncThunk(
  "auth/loginManager",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/manager/login", {
        email,
        password,
      });
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.error?.message ||
                          "Login failed. Please try again.";
      return rejectWithValue({ message: errorMessage });
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    manager : {},
    pendingVerification: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    token:  null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      state.manager = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingVerification = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.pendingVerification = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginManager.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginManager.fulfilled, (state, action) => {
        state.loading = false;
        state.manager = action.payload.manager;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginManager.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;