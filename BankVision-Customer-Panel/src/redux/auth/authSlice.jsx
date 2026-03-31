import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { publicPost } from "../../services/apiCaller";


export const createUserLogin = createAsyncThunk(
    "user/login",
    async (data, { rejectWithValue }) => {
      try {
        const response = await publicPost("", data);
        return response.data;
      } catch (err) {
        return rejectWithValue(err.response);
      }
    }
  );

const authSlice = createSlice({
  name: "auth",
  initialState: {
    isAuthenticated: false,
    isLoading: false,
    user: {},
    error: false,
    errorMessage: "",
  },
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = {};
      state.token = "";
      state.error = false;
      state.errorMessage = "";
    },
    errorClean: (state) => {
      state.error = false;
      state.errorMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createUserLogin.pending, (state) => {
      state.isLoading = true;
      state.error = false;
    });
    builder.addCase(createUserLogin.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.errorMessage = "";
      state.token = action.payload.token;
    });
    builder.addCase(createUserLogin.rejected, (state, action) => {
      state.isLoading = false;
      state.error = true;
      state.errorMessage = action.payload.data.message;
    });
  },
});

export const { login, logout, errorClean } = authSlice.actions;
export default authSlice.reducer;