/**
 * Change Request Service Registry
 *
 * To add a new service (e.g. "name change"):
 *   1. Add an entry here with the required fields.
 *   2. Wire the appropriate socket events in the backend.
 *   3. Create a thin wrapper component (see EmailChangeRequest.jsx as reference).
 *
 * The generic <SimpleChangeRequest> component handles all UI and socket logic
 * automatically from this config — no boilerplate needed.
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CHANGE_REQUEST_CONFIG = {
  email: {
    serviceKey: 'email',
    label: 'Email Update',
    fieldLabel: 'New Email',
    fieldType: 'email',
    currentLabel: 'Current Email',
    successMessage: 'Email updated successfully!',

    // Socket event names
    customerEmitEvent: 'typing:email-new',       // customer → backend → manager
    managerTypingEvent: 'manager:typing-email-new', // backend → customer
    otpSentEvent: 'customer:email-change-otp-sent', // backend → customer when OTP sent
    completedChangeType: 'email',                   // used to match customer:change-request-completed
    changedSocketEvent: 'customer:email-changed',   // emitted after customer-side success

    // Payload builders (keep thunks out of config — pass them as props)
    // verifyOtpPayload: OTP for email change is verified via the new email address
    verifyOtpPayload: (_updateInfo, newValue, otp) => ({
      email: newValue,
      otp,
    }),
    updatePayload: (accountNumber, newValue) => ({ accountNumber, email: newValue }),
    successFlag: 'isEmailUpadated',

    validate: (value, currentValue) => {
      if (!value) return '';
      if (value.toLowerCase() === currentValue?.toLowerCase())
        return 'New email cannot be same as current email';
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
      return '';
    },
  },

  phone: {
    serviceKey: 'phone',
    label: 'Phone Number Update',
    fieldLabel: 'New Phone Number',
    fieldType: 'tel',
    currentLabel: 'Current Phone Number',
    successMessage: 'Phone number updated successfully!',

    customerEmitEvent: 'typing:phone-number-new',
    managerTypingEvent: 'manager:typing-phone-new',
    otpSentEvent: 'customer:phone-change-otp-sent',
    completedChangeType: 'phone',
    changedSocketEvent: 'customer:phone-changed',

    // verifyOtpPayload: phone OTP is verified via the NEW phone number
    verifyOtpPayload: (_updateInfo, newValue, otp) => ({ phone: newValue, otp }),
    updatePayload: (accountNumber, newValue) => ({ accountNumber, phone: newValue }),
    successFlag: 'isPhoneUpadated',

    validate: (value, currentValue) => {
      if (!value) return '';
      if (value === currentValue) return 'New phone cannot be same as current phone number';
      if (value.length !== 11) return 'Phone number must be 11 digits';
      return '';
    },
  },

  // --- Add new services below ---
  // Example skeleton:
  //
  // nid: {
  //   serviceKey: 'nid',
  //   label: 'NID Number Update',
  //   fieldLabel: 'New NID Number',
  //   fieldType: 'text',
  //   currentLabel: 'Current NID Number',
  //   successMessage: 'NID updated successfully!',
  //   customerEmitEvent: 'typing:nid-new',
  //   managerTypingEvent: 'manager:typing-nid-new',
  //   otpSentEvent: 'customer:nid-change-otp-sent',
  //   completedChangeType: 'nid',
  //   changedSocketEvent: 'customer:nid-changed',
  //   verifyOtpPayload: (updateInfo, _newValue, otp) => ({ phone: updateInfo?.phone, otp }),
  //   updatePayload: (accountNumber, newValue) => ({ accountNumber, nid: newValue }),
  //   successFlag: 'isNidUpdated',
  //   validate: (value) => value?.length === 17 ? '' : 'NID must be 17 digits',
  // },
};
