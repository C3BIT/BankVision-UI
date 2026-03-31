import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { MANAGER_CHANGE_REQUEST_CONFIG } from '../../../config/changeRequestConfig';
import SimpleManagerChangePanel from '../../common/SimpleManagerChangePanel';
import { sendOtpToCustomer } from '../../../redux/auth/customerSlice';

const PhoneChangeRequest = ({ currentPhone, onBack }) => {
  const dispatch = useDispatch();

  const sendOtpFn = async (phone) => {
    await dispatch(
      sendOtpToCustomer({ phone, checkDuplicate: true })
    ).unwrap();
  };

  return (
    <SimpleManagerChangePanel
      config={MANAGER_CHANGE_REQUEST_CONFIG.phone}
      currentValue={currentPhone}
      onBack={onBack}
      sendOtpFn={sendOtpFn}
    />
  );
};

PhoneChangeRequest.propTypes = {
  currentPhone: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default PhoneChangeRequest;
