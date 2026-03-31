import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";

export const fetchCustomerImage = createAsyncThunk(
  "customerImage/fetchCustomerImage",
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/customer/profile-image", { phone });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const compareFaces = createAsyncThunk(
  "customerImage/compareFaces",
  async ({ imagePath1, imagePath2 }, { rejectWithValue }) => {
    try {
      const response = await publicPost("/face/compare", {
        imagePath1,
        imagePath2
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const customerImageSlice = createSlice({
  name: "customerImage",
  initialState: {
    profileImage: null,
    loading: false,
    error: null,
    status: 'idle',
    message: '',
    comparisonResult: null,
    comparisonLoading: false,
    comparisonError: null
  },
  reducers: {
    resetCustomerImage: (state) => {
      state.profileImage = null;
      state.loading = false;
      state.error = null;
      state.status = 'idle';
      state.message = '';
      state.comparisonResult = null;
      state.comparisonError = null;
    },
    resetComparison: (state) => {
      state.comparisonResult = null;
      state.comparisonError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerImage.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCustomerImage.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'succeeded';
        state.profileImage = action.payload.profileImage || null;
        state.message = action.payload.message || 'Profile image fetched successfully';
      })
      .addCase(fetchCustomerImage.rejected, (state, action) => {
        state.loading = false;
        state.status = 'failed';
        state.error = action.payload?.error || action.payload || 'Failed to fetch profile image';
        state.message = action.payload?.message || 'Failed to fetch profile image';
        state.profileImage = null;
      })
      
      .addCase(compareFaces.pending, (state) => {
        state.comparisonLoading = true;
        state.comparisonError = null;
      })
      .addCase(compareFaces.fulfilled, (state, action) => {
        state.comparisonLoading = false;
        state.comparisonResult = action.payload?.imageMatched || false;
        state.message = action.payload.message || 'Face comparison successful';
      })
      .addCase(compareFaces.rejected, (state, action) => {
        state.comparisonLoading = false;
        state.comparisonError = action.payload?.error || action.payload || 'Failed to compare faces';
        state.message = action.payload?.message || 'Failed to compare faces';
        state.comparisonResult = null;
      });
  },
});

export const { resetCustomerImage, resetComparison } = customerImageSlice.actions;
export default customerImageSlice.reducer;