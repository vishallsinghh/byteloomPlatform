// src/components/SignupForm.jsx
import React, { useState } from 'react';

const SignupForm = ({ onSubmit, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password) => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  });

  const getPasswordStrength = (password) => {
    const checks = validatePassword(password);
    const score = Object.values(checks).filter(Boolean).length;
    if (score < 2) return { strength: 0, label: 'Very Weak', color: 'bg-red-500' };
    if (score < 3) return { strength: 1, label: 'Weak', color: 'bg-red-400' };
    if (score < 4) return { strength: 2, label: 'Fair', color: 'bg-yellow-400' };
    if (score < 5) return { strength: 3, label: 'Good', color: 'bg-blue-400' };
    return { strength: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (formData.password.trim()) {
      const pwChecks = validatePassword(formData.password);
      if (!pwChecks.length) newErrors.password = 'Password must be at least 8 characters long';
    }
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.agreeTerms) newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    if (field === 'agreeTerms' && errors.terms) setErrors(prev => ({ ...prev, terms: undefined }));
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
        <p className="mt-2 text-gray-600">Start your journey today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">First name</label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="John"
            />
            {errors.firstName && <div className="mt-2 text-sm text-red-600">{errors.firstName}</div>}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 ${
                errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && <div className="mt-2 text-sm text-red-600">{errors.lastName}</div>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
          <div className="relative">
            <input
              id="signupEmail"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pl-12 ${
                errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="john@example.com"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
          </div>
          {errors.email && <div className="mt-2 text-sm text-red-600">{errors.email}</div>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <input
              id="signupPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pl-12 pr-12 ${
                errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Create a strong password"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? '👁' : '👁'}
            </button>
          </div>
          {errors.password && <div className="mt-2 text-sm text-red-600">{errors.password}</div>}
          {formData.password && (
            <div className="mt-2">
              <div className="flex space-x-1">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded ${i <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'}`} />
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

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pl-12 pr-12 ${
                errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Confirm your password"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirmPassword ? '👁' : '👁'}
            </button>
          </div>
          {errors.confirmPassword && <div className="mt-2 text-sm text-red-600">{errors.confirmPassword}</div>}
        </div>

        {/* Terms */}
        <div>
          <div className="flex items-start">
            <input
              id="agreeTerms"
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
              className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <label htmlFor="agreeTerms" className="ml-2 text-sm text-gray-700">
              I agree to the <a href="#" className="text-blue-500 hover:text-purple-500">Terms of Service</a> and <a href="#" className="text-blue-500 hover:text-purple-500">Privacy Policy</a>
            </label>
          </div>
          {errors.terms && <div className="mt-2 text-sm text-red-600">{errors.terms}</div>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? (
            <span className="flex items-center justify-center"><span className="animate-spin mr-2">⟳</span> Creating account...</span>
          ) : 'Create account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-blue-500 hover:text-purple-500 font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
