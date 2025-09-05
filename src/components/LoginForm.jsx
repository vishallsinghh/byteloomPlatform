// src/components/LoginForm.jsx
// @ts-nocheck
import React, { useState, useContext } from "react";
import axios from "axios";
import { url, authUrl } from "../config";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
// ——— NEW UI DEPENDENCIES ———
import { motion } from "framer-motion";
import FloatingCharts from "../components/FloatingCharts";
import Navbar from "./NavbarPlatform";
// ——— TOASTIFY ———
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const gradients = {
  purple: "from-slate-900 via-purple-900 to-slate-900",
  indigo: "from-indigo-900 via-purple-900 to-pink-900",
  blue: "from-blue-900 via-indigo-900 to-purple-900",
};

export default function LoginForm({
  onSubmit,
  onSwitchToSignup,
  onSwitchToForgotPassword,
}) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  // fallback redirect unused now
  // const from = location.state?.from?.pathname || "/";

  // simple email validation
  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warn("Please fix the highlighted errors before submitting.");
      return;
    }
    setIsLoading(true);
    try {
      const email = formData.email.trim();
      const password = formData.password.trim();
      const { data } = await axios.post(
        `${authUrl.BASE_URL}/auth/login/`,
        JSON.stringify({ email, password }),
        { headers: { "Content-Type": "application/json" } }
      );

      const { token, user } = data;
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));

      await login({ email, password });
      toast.success("Logged in successfully! Redirecting to dashboard...");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1500);
    } catch (err) {
      toast.error(err.response.data.errors.errors[0]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
      <Navbar />
      <ToastContainer position="top-right" className="!m-0" autoClose={5000} hideProgressBar />
      <div className="min-h-screen flex !mt-0">
        {/* Left Side - Animated Dashboard Preview */}
        <div
          className={`hidden lg:flex lg:w-3/5 bg-gradient-to-br ${gradients.purple} relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-black/20"></div>
          <FloatingCharts />
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "3s" }}
          ></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl animate-pulse"
            style={{ animationDuration: "3s", animationDelay: "1.5s" }}
          ></div>
        </div>
        {/* Right Side - Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-1 flex gap-2 flex-col my-4 items-center justify-center">
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome Back
              </h1>
              <p className="text-center">
                Log in to access your personalized dashboards and unlock powerful data insights.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
              <div className="text-center mb-8">
                <p className="mt-2 text-gray-600">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="loginEmail"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="loginEmail"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
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

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="loginPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="loginPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pl-12 pr-12 ${
                        errors.password
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="Enter your password"
                    />
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                      🔒
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? "👁" : "👁"}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="mt-2 text-sm text-red-600">
                      {errors.password}
                    </div>
                  )}
                </div>

                {/* Remember me and Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) =>
                        handleInputChange("rememberMe", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2">Remember me</span>
                  </label>
                  <Link
                    to={"/forgot-password"}
                    onClick={onSwitchToForgotPassword}
                    className="text-sm text-blue-500 hover:text-purple-500 transition-colors duration-200"
                  >
                    Forgot password?
                  </Link>
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
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              {/* Sign up link */}
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to={"/sign-up"}
                    className="text-blue-500 hover:text-purple-500 font-medium transition-colors duration-200"
                  >
                    Sign up for free
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
