// src/components/ForgotPasswordForm.jsx
import React, { useState } from 'react';

const ForgotPasswordForm = ({ onSubmit, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value) => {
    // simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await onSubmit({ email });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Reset password</h2>
        <p className="mt-2 text-gray-600">Enter your email to receive reset instructions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div>
          <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <div className="relative">
            <input
              id="forgotEmail"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pl-12 ${
                errors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Enter your email"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              @
            </span>
          </div>
          {errors.email && <div className="mt-2 text-sm text-red-600">{errors.email}</div>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⟳</span>
              Sending...
            </span>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      {/* Back to login link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-500 hover:text-purple-500 font-medium transition-colors duration-200 flex items-center justify-center mx-auto"
        >
          <span className="mr-2">←</span>
          Back to sign in
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
