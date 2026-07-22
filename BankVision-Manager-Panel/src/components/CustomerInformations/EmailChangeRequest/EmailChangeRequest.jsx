import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { MANAGER_CHANGE_REQUEST_CONFIG } from '../../../config/changeRequestConfig';
import SimpleManagerChangePanel from '../../common/SimpleManagerChangePanel';
import { sendEmailOtpToCustomer } from '../../../redux/auth/customerSlice';

const EmailChangeRequest = ({ currentEmail, onBack }) => {
  const dispatch = useDispatch();

  const sendOtpFn = async (email) => {
    await dispatch(
      sendEmailOtpToCustomer({ email, checkDuplicate: true })
    ).unwrap();
  };

  return (
    <SimpleManagerChangePanel
      config={MANAGER_CHANGE_REQUEST_CONFIG.email}
      currentValue={currentEmail}
      onBack={onBack}
      sendOtpFn={sendOtpFn}
    />
  );
};

EmailChangeRequest.propTypes = {
  currentEmail: PropTypes.string,
  onBack: PropTypes.func.isRequired,
};

export default EmailChangeRequest;
