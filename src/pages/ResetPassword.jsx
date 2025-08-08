import React, { useState, useEffect } from 'react';
import Alert from '../components/Alert';
import { useAlert } from '../hooks/useAlert';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authUrl } from '../config';

const ResetPasswordForm = ({ onSubmit, onResendOtp, onSuccess }) => {
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { alerts, showAlert, removeAlert } = useAlert();

  const [formData, setFormData] = useState({ password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Extract email from URL
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Password strength helpers
  const validatePassword = password => ({
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /\d/.test(password),
    special:   /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password),
  });

  const getPasswordStrength = password => {
    const checks = validatePassword(password);
    const score = Object.values(checks).filter(Boolean).length;
    if (score < 2) return { strength: 0, label: 'Very Weak', color: 'bg-red-500' };
    if (score < 3) return { strength: 1, label: 'Weak',      color: 'bg-red-400' };
    if (score < 4) return { strength: 2, label: 'Fair',      color: 'bg-yellow-400' };
    if (score < 5) return { strength: 3, label: 'Good',      color: 'bg-blue-400' };
                     return { strength: 4, label: 'Strong',    color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handlePasswordChange = val => {
    setFormData(prev => ({ ...prev, password: val }));
    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
  };

  const validateForm = () => {
    const combined = otpInputs.join('');
    const newErrors = {};

    // OTP validation
    if (!combined) {
      newErrors.otp = 'OTP is required';
    } else if (combined.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits';
    } else if (!/^\d{6}$/.test(combined)) {
      newErrors.otp = 'OTP must contain only numbers';
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (passwordStrength.strength < 3) {
      newErrors.password = 'Password is not strong enough';
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
      const response = await axios.post(
        `${authUrl.BASE_URL}/auth/reset-password/`,
        { email, otp: combined, new_password: formData.password }
      );
      console.log('reset-password response:', response.data);
      // On success, show alert and redirect
      if (response.data.message === 'Password reset successful' ||
          response.data.message === 'Password reset successfully.') {
        showAlert(response.data.message, 'success');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }
      // Otherwise show error
      showAlert(response.data.message || 'Reset failed. Please try again.', 'error');
    } catch (err) {
      console.error(err);
      setErrors({ otp: 'Reset failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      const res = await axios.post(
        `${authUrl.BASE_URL}/auth/resend-otp/`,
        { email }
      );
      showAlert(res.data.message || 'OTP resent', 'success');
      setResendCooldown(60);
      if (onResendOtp) onResendOtp(email);
    } catch (err) {
      console.error('resend-otp error:', err.response?.data || err.message);
      showAlert('Failed to resend OTP', 'error');
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
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpInputs[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Alert alerts={alerts} onRemove={removeAlert} />
      <main className="flex-grow flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
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
                      onChange={e => handleInputChange(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className={`w-12 h-12 text-center text-xl font-bold border rounded-lg focus:ring-2 transition-all duration-200 ${
                        errors.otp ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="0"
                    />
                  ))}
                </div>
                {errors.otp && (
                  <div className="mt-3 text-sm text-red-600 text-center">{errors.otp}</div>
                )}
              </div>
              <div>
                <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => handlePasswordChange(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition-all duration-200 pl-12 pr-12 ${
                      errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Create a strong password"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >{showPassword ? '👁' : '👁'}</button>
                </div>
                {errors.password && <div className="mt-2 text-sm text-red-600">{errors.password}</div>}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex space-x-1">
                      {[0,1,2,3].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password strength: <span className={passwordStrength.strength >= 3 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || otpInputs.join('').length !== 6 || passwordStrength.strength < 3}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⟳</span> Verifying...
                  </span>
                ) : 'Reset Password'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Wrong email address?{' '}
                <Link to="/login" className="text-blue-500 hover:text-purple-500 font-medium transition-colors duration-200">Go back</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordForm;
