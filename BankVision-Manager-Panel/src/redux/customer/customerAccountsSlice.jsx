import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { publicPost, privatePost } from "../../services/apiCaller";

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

// Fetch accounts from CBS (requires manager authentication)
export const fetchCBSAccounts = createAsyncThunk(
  "customer/fetchCBSAccounts",
  async ({ phone }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await privatePost("/cbs/customer/accounts", token, { phone });
      return response.data?.accounts || [];
    } catch (err) {
      console.error("Error fetching CBS accounts:", err);
      return rejectWithValue(err.response);
    }
  }
);

// Fetch cards from CBS (requires manager authentication)
export const fetchCBSCards = createAsyncThunk(
  "customer/fetchCBSCards",
  async ({ phone }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await privatePost("/cbs/customer/cards", token, { phone });
      return response.data?.cards || [];
    } catch (err) {
      console.error("Error fetching CBS cards:", err);
      return rejectWithValue(err.response);
    }
  }
);

// Fetch loans from CBS (requires manager authentication)
export const fetchCBSLoans = createAsyncThunk(
  "customer/fetchCBSLoans",
  async ({ phone }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await privatePost("/cbs/customer/loans", token, { phone });
      return response.data?.loans || [];
    } catch (err) {
      console.error("Error fetching CBS loans:", err);
      return rejectWithValue(err.response);
    }
  }
);

const customerAccountsSlice = createSlice({
  name: "customerAccounts",
  initialState: {
    accounts: [],
    accountDetails: {},
    selectedAccountNumber: null, // Set synchronously on account click — source of truth for "is account selected"
    cbsAccounts: [],
    cbsCards: [],
    cbsLoans: [],
    loading: false,
    error: null,
    message: "",
  },
  reducers: {
    setSelectedAccountNumber: (state, action) => {
      state.selectedAccountNumber = action.payload;
    },
    clearSelectedAccountNumber: (state) => {
      state.selectedAccountNumber = null;
      state.accountDetails = {};
    },
  },
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
        // Keep existing accountDetails during re-fetch so service panels don't flash "no account selected"
      })
      .addCase(fetchCustomerDetailsByAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accountDetails = action.payload;
      })
      .addCase(fetchCustomerDetailsByAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Keep existing accountDetails on failure — don't clear valid account context
        // on a transient network error mid-session
        if (!state.accountDetails?.accountNumber) {
          state.accountDetails = {};
        }
      })

      // CBS Accounts
      .addCase(fetchCBSAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCBSAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.cbsAccounts = action.payload;
      })
      .addCase(fetchCBSAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.cbsAccounts = [];
      })

      // CBS Cards
      .addCase(fetchCBSCards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCBSCards.fulfilled, (state, action) => {
        state.loading = false;
        state.cbsCards = action.payload;
      })
      .addCase(fetchCBSCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.cbsCards = [];
      })

      // CBS Loans
      .addCase(fetchCBSLoans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCBSLoans.fulfilled, (state, action) => {
        state.loading = false;
        state.cbsLoans = action.payload;
      })
      .addCase(fetchCBSLoans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.cbsLoans = [];
      });
  },
});

export const { setSelectedAccountNumber, clearSelectedAccountNumber } = customerAccountsSlice.actions;
export default customerAccountsSlice.reducer;
