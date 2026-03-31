import { toast } from 'react-toastify';

const defaultConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};


export const toastSuccess = (message, options = {}) => {
  toast.success(message, { ...defaultConfig, ...options });
};


export const toastError = (message, options = {}) => {
  toast.error(message, { ...defaultConfig, ...options });
};


export const toastInfo = (message, options = {}) => {
  toast.info(message, { ...defaultConfig, ...options });
};


export const toastWarning = (message, options = {}) => {
  toast.warning(message, { ...defaultConfig, ...options });
};

export const showToast = (message, type = 'info', options = {}) => {
  switch (type) {
    case 'success':
      toastSuccess(message, options);
      break;
    case 'error':
      toastError(message, options);
      break;
    case 'warning':
      toastWarning(message, options);
      break;
    case 'info':
    default:
      toastInfo(message, options);
  }
};

const Toast = {
  success: toastSuccess,
  error: toastError,
  info: toastInfo,
  warning: toastWarning,
  show: showToast,
};

export default Toast;