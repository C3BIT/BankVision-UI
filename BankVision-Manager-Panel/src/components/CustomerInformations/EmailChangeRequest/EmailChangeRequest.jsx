import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { MANAGER_CHANGE_REQUEST_CONFIG } from '../../../config/changeRequestConfig';
import SimpleManagerChangePanel from '../../common/SimpleManagerChangePanel';
import { sendEmailOtpToCustomer } from '../../../redux/auth/customerSlice';

const EmailChangeRequest = ({ currentEmail, onBack }) => {
  const dispatch = useDispatch();

  const sendOtpFn = async (email) => {
    const result = await dispatch(
      sendEmailOtpToCustomer({ email, checkDuplicate: true })
    ).unwrap();
    // Surface the server-issued challenge id so the panel can present it at verify.
    return result?.data?.challengeId || '';
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
