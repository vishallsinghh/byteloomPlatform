// src/components/ForgotPasswordForm.jsx
import React, { useState } from "react";
import axios from "axios"; // + you need axios
import { authUrl } from "../config"; //  and your API base
import { useAlert } from "../hooks/useAlert"; //  for showing alerts
import Alert from "../components/Alert";
import { Link, useNavigate } from "react-router-dom"; // + for navigation

const ForgotPasswordForm = ({ onSubmit, onSwitchToLogin }) => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { alerts, showAlert, removeAlert } = useAlert(); // + init alerts
  const navigate = useNavigate();

  const validateEmail = (value) => {
    // simple email regex
    return /^[^\s@]@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      //  call your forgot-password endpoint
      const response = await axios.post(
        `${authUrl.BASE_URL}/auth/forgot-password/`,
        { email }
      );
      console.log('forgot-password response:', response.data);
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      showAlert(response.data.message || 'Reset link sent', 'success');
     
    } catch (err) {
      console.error('forgot-password error:', err);
      showAlert(err.response?.data?.message || 'Failed to send reset link', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Alert alerts={alerts} onRemove={removeAlert} />

      <main className="flex-grow flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Reset password
              </h2>
              <p className="mt-2 text-gray-600">
                Enter your email to receive reset instructions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="forgotEmail"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
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
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Enter your email"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    @
                  </span>
                </div>
                {errors.email && (
                  <div className="mt-2 text-sm text-red-600">
                    {errors.email}
                  </div>
                )}
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
                  "Reset Password"
                )}
              </button>
            </form>

            {/* Back to login link */}
            <div className="mt-6 text-center">
              <Link
              to={"/login"}
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-500 hover:text-purple-500 font-medium transition-colors duration-200 flex items-center justify-center mx-auto"
              >
                <span className="mr-2">←</span>
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordForm;
