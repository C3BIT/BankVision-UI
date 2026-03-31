/**
 * Change Request Service Registry — Manager Panel
 *
 * To add a new service:
 *   1. Add an entry here.
 *   2. Create a thin wrapper that provides sendOtpFn (see EmailChangeRequest.jsx).
 *   3. Wire socket events in the backend.
 *
 * The generic <SimpleManagerChangePanel> handles all UI, duplicate checking,
 * real-time sync, OTP flow, and update API calls from this config.
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MANAGER_CHANGE_REQUEST_CONFIG = {
  email: {
    serviceKey: 'email',
    label: 'Customer Email Update',
    fieldLabel: 'New Email',
    confirmLabel: 'Confirm Email',
    fieldType: 'email',
    currentLabel: 'Current Email',

    // Socket events: manager → backend → customer
    managerEmitEvent: 'manager:typing-email-new',
    managerConfirmEmitEvent: 'manager:typing-email-confirm',
    // Socket events: customer → backend → manager
    customerTypingNewEvent: 'customer:typing-email-new',
    customerTypingConfirmEvent: 'customer:typing-email-confirm',
    // Event emitted to notify customer that OTP was sent
    otpSentSocketEvent: 'manager:sent-otp-change-email',
    // Submit event payload key
    submitChangeType: 'email',

    // API
    verifyOtpEndpoint: '/otp/verify-email',
    verifyOtpPayload: (value, otp) => ({ email: value, otp }),
    updateEndpoint: '/customer/update-email',
    updatePayload: (accountNumber, value) => ({ accountNumber, email: value }),
    duplicateCheckEndpoint: '/customer/find-email',
    duplicateCheckPayload: (value) => ({ email: value }),

    // OTP sent socket payload builder
    otpSentPayload: (newValue, accountDetails) => ({
      email: newValue,
      phone: accountDetails?.mobileNumber,
      accountNumber: accountDetails?.accountNumber,
      timestamp: new Date().toISOString(),
    }),

    // Validation
    validate: (value) => emailRegex.test(value),
    preprocessInput: (value) => value, // no transform for email
    matchMessage: 'Email addresses match! Ready to send OTP.',
    noMatchMessage: 'Email addresses do not match',
    invalidMessage: 'Email must be a valid format',
    isSameMessage: 'New email cannot be same as current email',
    inputProps: {},
  },

  phone: {
    serviceKey: 'phone',
    label: 'Customer Phone Number Update',
    fieldLabel: 'New Phone Number',
    confirmLabel: 'Confirm Phone Number',
    fieldType: 'tel',
    currentLabel: 'Current Phone Number',

    managerEmitEvent: 'manager:typing-phone-new',
    managerConfirmEmitEvent: 'manager:typing-phone-confirm',
    customerTypingNewEvent: 'customer:typing-phone-new',
    customerTypingConfirmEvent: 'customer:typing-phone-confirm',
    otpSentSocketEvent: 'manager:sent-otp-change-phone',
    submitChangeType: 'phone',

    verifyOtpEndpoint: '/otp/verify-phone',
    verifyOtpPayload: (value, otp) => ({ phone: value, otp }),
    updateEndpoint: '/customer/update-phone',
    updatePayload: (accountNumber, value) => ({ accountNumber, phone: value }),
    duplicateCheckEndpoint: '/customer/find-phone',
    duplicateCheckPayload: (value) => ({ phone: value }),

    otpSentPayload: (newValue, accountDetails) => ({
      phone: newValue,
      accountNumber: accountDetails?.accountNumber,
      timestamp: new Date().toISOString(),
    }),

    validate: (value) => value?.length === 11,
    preprocessInput: (value) => value.replace(/\D/g, '').slice(0, 11),
    matchMessage: 'Phone numbers match! Ready to send OTP.',
    noMatchMessage: 'Phone numbers do not match',
    invalidMessage: 'Phone number must be 11 digits',
    isSameMessage: 'New phone cannot be same as current phone number',
    inputProps: { maxLength: 11 },
  },

  // --- Add new services below ---
  // Example skeleton:
  //
  // nid: {
  //   serviceKey: 'nid',
  //   label: 'Customer NID Update',
  //   fieldLabel: 'New NID',
  //   confirmLabel: 'Confirm NID',
  //   fieldType: 'text',
  //   currentLabel: 'Current NID',
  //   managerEmitEvent: 'manager:typing-nid-new',
  //   managerConfirmEmitEvent: 'manager:typing-nid-confirm',
  //   customerTypingNewEvent: 'customer:typing-nid-new',
  //   customerTypingConfirmEvent: 'customer:typing-nid-confirm',
  //   otpSentSocketEvent: 'manager:sent-otp-change-nid',
  //   submitChangeType: 'nid',
  //   verifyOtpEndpoint: '/otp/verify-phone',
  //   verifyOtpPayload: (value, otp) => ({ phone: value, otp }),
  //   updateEndpoint: '/customer/update-nid',
  //   updatePayload: (accountNumber, value) => ({ accountNumber, nid: value }),
  //   duplicateCheckEndpoint: '/customer/find-nid',
  //   duplicateCheckPayload: (value) => ({ nid: value }),
  //   otpSentPayload: (newValue, accountDetails) => ({ nid: newValue, phone: accountDetails?.mobileNumber, accountNumber: accountDetails?.accountNumber, timestamp: new Date().toISOString() }),
  //   validate: (value) => value?.length === 17,
  //   preprocessInput: (value) => value.replace(/\D/g, '').slice(0, 17),
  //   matchMessage: 'NID numbers match!',
  //   noMatchMessage: 'NID numbers do not match',
  //   invalidMessage: 'NID must be 17 digits',
  //   isSameMessage: 'New NID cannot be same as current NID',
  //   inputProps: { maxLength: 17 },
  // },
};
