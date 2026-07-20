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

// Requires manager authentication — /customer/details is customer-session-only
// (requires the OTP-issued customer_auth_token cookie, which the manager's
// browser never has on a real two-device call) and always 401ed here, which
// the global response interceptor treated as an expired manager session and
// force-logged the manager out mid-call. /cbs/customer/details is the manager
// panel's own route, gated on call ownership instead.
export const fetchCustomerDetailsByAccount = createAsyncThunk(
  "customer/fetchCustomerDetailsByAccount",
  async ({ accountNumber, phone }, { rejectWithValue }) => {
    try {
      const response = await privatePost("/cbs/customer/details", undefined, { accountNumber, phone });
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
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await privatePost("/cbs/customer/accounts", undefined, { phone });
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
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await privatePost("/cbs/customer/cards", undefined, { phone });
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
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await privatePost("/cbs/customer/loans", undefined, { phone });
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
    // Full reset on call end — without this, cbsAccounts/cbsCards/cbsLoans
    // from the outgoing customer stay in Redux until the next customer's
    // fetches resolve, so a manager can briefly see the previous customer's
    // data on the next call.
    resetCustomerAccounts: (state) => {
      state.accounts = [];
      state.accountDetails = {};
      state.selectedAccountNumber = null;
      state.cbsAccounts = [];
      state.cbsCards = [];
      state.cbsLoans = [];
      state.error = null;
      state.message = "";
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

export const { setSelectedAccountNumber, clearSelectedAccountNumber, resetCustomerAccounts } = customerAccountsSlice.actions;
export default customerAccountsSlice.reducer;
