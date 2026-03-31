import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const verifyPhoneOtp = createAsyncThunk(
    "customer/verifyPhoneOtp",
    async ({ phone, otp }, { rejectWithValue }) => {
        try {
            const response = await publicPost("/otp/verify-phone", { phone, otp });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response);
        }
    }
);

export const verifyEmailOtp = createAsyncThunk(
    "customer/verifyEmailOtp",
    async ({ email, otp }, { rejectWithValue }) => {
        try {
            const response = await publicPost("/otp/verify-email", { email, otp });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response);
        }
    }
);

const customerSlice = createSlice({
    name: "customer",
    initialState: {
        phoneVerificationPending: false,
        phoneVerified: false,
        emailVerified: false,
        verificationError: null,
        verificationSuccess: null,
        loading: false,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(verifyPhoneOtp.pending, (state) => {
                state.loading = true;
            })
            .addCase(verifyPhoneOtp.fulfilled, (state, action) => {
                state.loading = false;
                state.phoneVerified = true;
                state.verificationSuccess = action.payload;
                state.verificationError = null;
            })
            .addCase(verifyPhoneOtp.rejected, (state, action) => {
                state.loading = false;
                state.phoneVerified = false;
                state.verificationError = action.payload;
                state.verificationSuccess = null;
            })
            .addCase(verifyEmailOtp.pending, (state) => {
                state.loading = true;
            })
            .addCase(verifyEmailOtp.fulfilled, (state, action) => {
                state.loading = false;
                state.emailVerified = true;
                state.verificationSuccess = action.payload;
                state.verificationError = null;
            })
            .addCase(verifyEmailOtp.rejected, (state, action) => {
                state.loading = false;
                state.emailVerified = false;
                state.verificationError = action.payload;
                state.verificationSuccess = null;
            });
    },
});

export default customerSlice.reducer;
