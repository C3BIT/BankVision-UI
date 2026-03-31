import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPostFile } from "../../services/apiCaller";

export const uploadCustomerImage = createAsyncThunk(
  "customerImage/upload",
  async (data, { rejectWithValue }) => {
    try {
      const response = await publicPostFile("/image/upload", data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const customerImageSlice = createSlice({
  name: "customerImage",
  initialState: {
    imagePath: null,
    loading: false,
    error: null,
    status: "idle",
    message: null,
  },
  reducers: {
    resetImageState: (state) => {
      state.imagePath = null;
      state.error = null;
      state.message = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadCustomerImage.pending, (state) => {
        state.loading = true;
        state.status = "loading";
        state.error = null;
        state.message = null;
      })
      .addCase(uploadCustomerImage.fulfilled, (state, action) => {
        state.loading = false;
        state.status = "succeeded";
        state.imagePath = action.payload.imagePath;
        state.message = action.payload.message;
      })
      .addCase(uploadCustomerImage.rejected, (state, action) => {
        state.loading = false;
        state.status = "failed";
        state.error = action.payload?.error || action.payload;
        state.message = action.payload?.message || "Image upload failed";
      });
  },
});

export const { resetImageState } = customerImageSlice.actions;
export default customerImageSlice.reducer;