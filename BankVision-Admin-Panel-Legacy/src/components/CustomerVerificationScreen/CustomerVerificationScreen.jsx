import { Box, Alert, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { verifyPhoneOtpToCustomer, verifyEmailOtpToCustomer } from "../../redux/auth/customerSlice";
import PropTypes from "prop-types";
import PhoneVerification from "../CustomerInformations/PhoneVerification/PhoneVerification";
import EmailVerification from "../CustomerInformations/EmailVerification/EmailVerification";
import VerificationSuccess from "../CustomerInformations/VerificationSuccess/VerificationSuccess";
import PhoneChangeRequest from "../CustomerInformations/PhoneChangeRequest/PhoneChangeRequest";
import EmailChangeRequest from "../CustomerInformations/EmailChangeRequest/EmailChangeRequest";
import AddressChange from "../CustomerInformations/AddressChange/AddressChange";
import AccountActivation from "../CustomerInformations/AccountActivation/AccountActivation";
import FaceVerification from "../CustomerInformations/FaceVerification/FaceVerification";
import ClientAccountList from "./../CustomerInformations/CustomerAccountLists/CustomerAccountList";
import CustomerAccountDetails from "../CustomerInformations/CustomerAccountDetails/CustomerAccountDetails";

// Supervisor version - accepts socket as prop instead of using WebSocketProvider
const CustomerVerificationScreen = ({
    socket,
    callTarget,
    phoneVerified,
    emailVerified,
    verificationPending,
    requestPhoneVerification,
    requestEmailVerification,
    requestPhoneChange,
    requestFaceVerification,
    accountDetails
}) => {
    const dispatch = useDispatch();
    const [activeService, setActiveService] = useState("phone");
    const [verificationStep, setVerificationStep] = useState("initial");
    const [showAccountList, setShowAccountList] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [phoneChangeAlert, setPhoneChangeAlert] = useState({
        show: false,
        message: '',
        accountNumber: ''
    });

    useEffect(() => {
        setVerificationStep("initial");
    }, [activeService]);

    useEffect(() => {
        if (phoneVerified && activeService === "phone") {
            setVerificationStep("verified");
        }
    }, [phoneVerified, activeService]);

    useEffect(() => {
        if (emailVerified && activeService === "email") {
            setVerificationStep("verified");
        }
    }, [emailVerified, activeService]);

    useEffect(() => {
        if (
            verificationPending?.phone &&
            activeService === "phone" &&
            verificationStep === "initial"
        ) {
            setVerificationStep("verifyOtp");
        }
        if (
            verificationPending?.email &&
            activeService === "email" &&
            verificationStep === "initial"
        ) {
            setVerificationStep("verifyOtp");
        }
        if (
            verificationPending?.face &&
            activeService === "face" &&
            verificationStep === "initial"
        ) {
            setVerificationStep("verifying");
        }
    }, [verificationPending, activeService, verificationStep]);

    useEffect(() => {
        if (socket) {
            socket.on("customer:phone-changed", (data) => {
                const { accountNumber, newPhoneNumber } = data;

                setPhoneChangeAlert({
                    show: true,
                    message: `Customer phone number successfully updated to ${newPhoneNumber}`,
                    accountNumber: accountNumber
                });

                setSelectedAccount(accountNumber);
                setActiveService("changedInfo")

                setTimeout(() => {
                    setPhoneChangeAlert({ show: false, message: '', accountNumber: '' });
                }, 10000);
            });
        }

        return () => {
            if (socket) {
                socket.off("customer:phone-changed");
            }
        };
    }, [socket, selectedAccount]);

    const handleServiceSelect = (service) => {
        if (service === 'phoneChange') {
            requestPhoneChange?.()
        }
        setActiveService(service);
        setVerificationStep("initial");
        setShowAccountList(false);
        setSelectedAccount(null);
        setShowFaceVerification(false);

        // Emit screen sync event to customer with account details
        if (socket && accountDetails) {
            socket.emit("manager:screen-sync", {
                screen: service,
                timestamp: Date.now(),
                accountData: {
                    accountNumber: accountDetails.accountNumber,
                    email: accountDetails.email,
                    mobileNumber: accountDetails.mobileNumber,
                    name: accountDetails.name,
                    address: accountDetails.address,
                    branch: accountDetails.branch
                }
            });
        }
    };

    const handleVerificationComplete = () => {
        if (activeService === "phone") {
            setShowFaceVerification(true);
            setActiveService("face");
            setVerificationStep("initial");
        } else {
            setVerificationStep("initial");
            setShowAccountList(true);
            setSelectedAccount(null);
        }
    };

    const handleFaceVerificationComplete = () => {
        setVerificationStep("initial");
        setShowAccountList(true);
        setSelectedAccount(null);
        setShowFaceVerification(false);
    };

    const handleSendPhoneOTP = async () => {
        if (callTarget?.name && socket) {
            try {
                socket.emit("request:send-otp", { phone: callTarget?.name });
                requestPhoneVerification?.();
            } catch (error) {
                console.error("Failed to send OTP:", error.message);
                toast.error("Failed to send OTP to customer. Please try again.");
            }
        }
    };

    const handleVerifyPhoneOTP = async (otp) => {
        if (callTarget?.name) {
            try {
                await dispatch(
                    verifyPhoneOtpToCustomer({ phone: callTarget?.name, otp })
                ).unwrap();

                toast.success("OTP verified successfully!");

                // Notify customer via socket that it's verified
                if (socket) {
                    socket.emit("customer:phone-verified", {
                        phone: callTarget?.name,
                        verified: true
                    });
                }
            } catch (error) {
                console.error("Failed to verify OTP:", error.message);
                toast.error(error.data?.message || "Invalid OTP. Please try again.");
            }
        }
    };

    const handleVerifyEmailOTP = async (otp) => {
        const email = callTarget?.email || "customer@example.com";
        try {
            await dispatch(
                verifyEmailOtpToCustomer({ email, otp })
            ).unwrap();

            toast.success("Email verified successfully!");

            // Notify customer via socket that it's verified
            if (socket) {
                socket.emit("customer:email-verified", {
                    phone: callTarget?.name,
                    email: email,
                    verified: true
                });
            }
        } catch (error) {
            console.error("Failed to verify email OTP:", error.message);
            toast.error(error.data?.message || "Invalid OTP. Please try again.");
        }
    };

    const handleSendEmailOTP = () => {
        try {
            requestEmailVerification?.(callTarget?.email || "customer@example.com");
        } catch (error) {
            toast.error("Failed to send email verification.");
        }
    };

    const handleRequestFaceVerification = () => {
        setActiveService("face");
        requestFaceVerification?.();
    };

    const handleAccountSelect = (accountId) => {
        setSelectedAccount(accountId);
    };

    const customerPhone = callTarget?.phone || callTarget?.name;

    const renderContent = () => {
        if (selectedAccount) {
            return (
                <CustomerAccountDetails
                    selectedAccount={selectedAccount}
                    customerPhone={customerPhone}
                    onServiceSelect={handleServiceSelect}
                />
            );
        }

        if (showAccountList) {
            return (
                <ClientAccountList
                    phoneNumber={customerPhone}
                    onAccountSelect={handleAccountSelect}
                />
            );
        }

        switch (activeService) {
            case "changedInfo":
                return (
                    <CustomerAccountDetails
                        selectedAccount={selectedAccount}
                        customerPhone={customerPhone}
                        onServiceSelect={handleServiceSelect}
                    />
                );

            case "face":
                if (verificationStep === "verified") {
                    return (
                        <VerificationSuccess
                            title="Face Verification Successful"
                            message="Customer's identity has been verified successfully."
                            onComplete={handleFaceVerificationComplete}
                        />
                    );
                } else {
                    return (
                        <FaceVerification
                            customerName={callTarget?.name}
                            verificationPending={verificationPending?.face}
                            requestFaceVerification={handleRequestFaceVerification}
                            onComplete={handleFaceVerificationComplete}
                        />
                    );
                }

            case "phone":
                if (verificationStep === "verified") {
                    return (
                        <VerificationSuccess onComplete={handleVerificationComplete} />
                    );
                } else if (verificationStep === "verifyOtp") {
                    return (
                        <PhoneVerification
                            phoneNumber={callTarget?.phone || callTarget?.name}
                            verificationPending={verificationPending?.phone}
                            onSendOTP={handleSendPhoneOTP}
                            onVerifyOTP={handleVerifyPhoneOTP}
                            otpSent={true}
                            isVerified={phoneVerified}
                        />
                    );
                } else {
                    return (
                        <PhoneVerification
                            phoneNumber={callTarget?.phone || callTarget?.name}
                            verificationPending={verificationPending?.phone}
                            onSendOTP={handleSendPhoneOTP}
                            onVerifyOTP={handleVerifyPhoneOTP}
                            otpSent={false}
                            isVerified={phoneVerified}
                        />
                    );
                }

            case "email":
                if (verificationStep === "verified") {
                    return (
                        <VerificationSuccess onComplete={handleVerificationComplete} />
                    );
                } else if (verificationStep === "verifyOtp") {
                    return (
                        <PhoneVerification.EnterOTP
                            phoneNumber={callTarget?.email || "customer@example.com"}
                            onVerifyOTP={handleVerifyEmailOTP}
                            verificationPending={false}
                        />
                    );
                } else {
                    return (
                        <EmailVerification
                            email={callTarget?.email || "customer@example.com"}
                            verificationPending={verificationPending?.email}
                            onSendOTP={handleSendEmailOTP}
                        />
                    );
                }

            case "phoneChange":
                return (
                    <PhoneChangeRequest
                        currentPhone={callTarget?.phone || callTarget?.name}
                        onBack={() => setShowAccountList(true)}
                    />
                );

            case "emailChange":
                return (
                    <EmailChangeRequest
                        currentEmail={accountDetails?.email || "customer@example.com"}
                        onBack={() => setShowAccountList(true)}
                    />
                );

            case "addressChange":
                return <AddressChange onBack={() => setShowAccountList(true)} />;

            case "accountActivation":
                return <AccountActivation onBack={() => setShowAccountList(true)} />;

            default:
                return (
                    <PhoneVerification
                        phoneNumber={callTarget?.phone || callTarget?.name}
                        verificationPending={verificationPending?.phone}
                        onSendOTP={handleSendPhoneOTP}
                        onVerifyOTP={handleVerifyPhoneOTP}
                    />
                );
        }
    };

    return (
        <Box
            sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                padding: { xs: "12px", sm: "16px", md: "24px" },
                overflow: "auto",
            }}
        >
            {phoneChangeAlert.show && (
                <Alert
                    severity="success"
                    sx={{
                        marginBottom: 2,
                        animation: 'fadeIn 0.3s ease-in'
                    }}
                >
                    {phoneChangeAlert.message}
                </Alert>
            )}

            {renderContent()}
        </Box>
    );
};

CustomerVerificationScreen.propTypes = {
    socket: PropTypes.object,
    callTarget: PropTypes.shape({
        name: PropTypes.string,
        image: PropTypes.string,
        room: PropTypes.string,
        phone: PropTypes.string,
        email: PropTypes.string,
    }),
    phoneVerified: PropTypes.bool,
    emailVerified: PropTypes.bool,
    verificationPending: PropTypes.shape({
        phone: PropTypes.bool,
        email: PropTypes.bool,
        face: PropTypes.bool,
    }),
    requestPhoneVerification: PropTypes.func,
    requestEmailVerification: PropTypes.func,
    requestPhoneChange: PropTypes.func,
    requestFaceVerification: PropTypes.func,
    accountDetails: PropTypes.object,
};

export default CustomerVerificationScreen;
