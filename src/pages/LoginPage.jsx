// src/pages/Home.jsx
import React, { useState } from 'react';

import  LoginForm  from '../components/LoginForm';
import  SignupForm  from '../components/SignupForm';
import  ForgotPasswordForm  from '../components/ForgotPasswordForm';
import  OtpVerificationForm  from '../components/OtpVerificationForm';
import  Alert  from '../components/Alert';
import { useAlert } from '../hooks/useAlert';

const FORM_TYPES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  FORGOT: 'forgot-password',
  OTP: 'otp-verification',
};

export default function Home() {
  const [currentForm, setCurrentForm] = useState(FORM_TYPES.LOGIN);
  const [userEmail, setUserEmail] = useState('');
  const { alerts, showAlert, removeAlert } = useAlert();

  const handleLogin = async (data) => {
    // replace with real API call / authContext.login
    await new Promise((r) => setTimeout(r, 1000));
    showAlert('Successfully signed in! Welcome back.', 'success');
    console.log('Login data:', data);
  };

  const handleSignup = async (data) => {
    await new Promise((r) => setTimeout(r, 1000));
    setUserEmail(data.email);
    showAlert('Account created! Please verify your email with the OTP sent.', 'success');
    setCurrentForm(FORM_TYPES.OTP);
    console.log('Signup data:', data);
  };

  const handleForgotPassword = async (data) => {
    await new Promise((r) => setTimeout(r, 1000));
    showAlert('Password reset link sent! Check your inbox.', 'info');
    console.log('Forgot password data:', data);
  };

  const handleOtpVerification = async (data) => {
    await new Promise((r) => setTimeout(r, 1000));
    const isValid = data.otp === '123456';
    if (isValid) {
      showAlert('OTP verified! You can now log in.', 'success');
      setCurrentForm(FORM_TYPES.LOGIN);
      setUserEmail('');
    } else {
      showAlert('Invalid OTP. Please try again.', 'error');
    }
    console.log('OTP data:', data, 'valid:', isValid);
  };

  const handleResendOtp = async () => {
    await new Promise((r) => setTimeout(r, 1000));
    showAlert('A new OTP has been sent to your email.', 'info');
    console.log('Resent OTP to:', userEmail);
  };

  const renderCurrentForm = () => {
    switch (currentForm) {
      case FORM_TYPES.LOGIN:
        return (
          <LoginForm
            onSubmit={handleLogin}
            onSwitchToSignup={() => setCurrentForm(FORM_TYPES.SIGNUP)}
            onSwitchToForgotPassword={() => setCurrentForm(FORM_TYPES.FORGOT)}
          />
        );
      case FORM_TYPES.SIGNUP:
        return (
          <SignupForm
            onSubmit={handleSignup}
            onSwitchToLogin={() => setCurrentForm(FORM_TYPES.LOGIN)}
          />
        );
      case FORM_TYPES.FORGOT:
        return (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onSwitchToLogin={() => setCurrentForm(FORM_TYPES.LOGIN)}
          />
        );
      case FORM_TYPES.OTP:
        return (
          <OtpVerificationForm
            email={userEmail}
            onSubmit={handleOtpVerification}
            onResendOtp={handleResendOtp}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Alert alerts={alerts} onRemove={removeAlert} />

        <main className="flex-grow flex items-center justify-center">
          <div className="w-full space-y-8">
            {renderCurrentForm()}
          </div>
        </main>
      </div>

    </>
  );
}
