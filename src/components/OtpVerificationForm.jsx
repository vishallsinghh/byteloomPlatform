// src/components/OtpVerificationForm.jsx
import React, { useState, useEffect } from 'react';
import  Alert  from '../components/Alert';
import { useAlert } from '../hooks/useAlert';

const OtpVerificationForm = ({ email, onSubmit, onResendOtp, onSuccess }) => {
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { alerts, showAlert, removeAlert } = useAlert();

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateForm = () => {
    const combined = otpInputs.join('');
    const newErrors = {};
    if (!combined) {
      newErrors.otp = 'OTP is required';
    } else if (combined.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits';
    } else if (!/^\d{6}$/.test(combined)) {
      newErrors.otp = 'OTP must contain only numbers';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const combined = otpInputs.join('');
      const valid = await onSubmit({ otp: combined });
      if (valid) {
        onSuccess();
      } else {
        setErrors({ otp: 'Invalid OTP. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await onResendOtp();
      setResendCooldown(60);
      setOtpInputs(['', '', '', '', '', '']);
      setErrors({});
    } finally {
      setIsResending(false);
    }
  };

  const handleInputChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpInputs];
    next[idx] = val.slice(-1);
    setOtpInputs(next);
    if (errors.otp) setErrors({});
    if (val && idx < 5) {
      const nxt = document.getElementById(`otp-${idx + 1}`);
      nxt?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpInputs[idx] && idx > 0) {
      const prev = document.getElementById(`otp-${idx - 1}`);
      prev?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtpInputs(paste.split(''));
      setErrors({});
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl">📧</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Verify your email</h2>
        <p className="mt-2 text-gray-600">
          We sent a 6-digit code to <br />
          <span className="font-medium text-gray-900">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Enter verification code
          </label>
          <div className="flex justify-center space-x-3">
            {otpInputs.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className={`w-12 h-12 text-center text-xl font-bold border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  errors.otp
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="0"
              />
            ))}
          </div>
          {errors.otp && (
            <div className="mt-3 text-sm text-red-600 text-center">{errors.otp}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || otpInputs.join('').length !== 6}
          className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading
            ? (<span className="flex items-center justify-center">
                 <span className="animate-spin mr-2">⟳</span> Verifying...
               </span>)
            : 'Verify Code'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600 mb-3">Didn't receive the code?</p>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className={`font-medium transition-colors duration-200 ${
            resendCooldown > 0 || isResending
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-500 hover:text-purple-500'
          }`}
        >
          {isResending
            ? (<span className="flex items-center justify-center">
                 <span className="animate-spin mr-2">⟳</span> Sending...
               </span>)
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : 'Resend code'}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Wrong email address?{' '}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-blue-500 hover:text-purple-500 font-medium transition-colors duration-200"
          >
            Go back
          </button>
        </p>
      </div>
    </div>
  );
};

export default OtpVerificationForm;
