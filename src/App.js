import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import CreateDataset from "./pages/CreateDataset";
import Gallery from "./pages/Gallery";
import Chart from "./pages/Chart";
import Edit from "./pages/Edit";
import Dashboards from "./pages/Dashboards";
import CreateDashboard from "./pages/CreateDashboard";
import ViewDashboard from "./pages/ViewDashboard";
import EditDashboard from "./pages/EditDashboard";
import NotFound from "./pages/NotFound";
import SignupForm from "./pages/Signup";
import ForgotPasswordForm from "./pages/ForgotPassword";
import OtpVerificationForm from "./pages/OtpVerification";
import ResetPasswordForm from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignupForm />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/otp-verification" element={<OtpVerificationForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/create-dataset" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-dataset" element={<CreateDataset />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/chart" element={<Chart />} />
        <Route path="/edit" element={<Edit />} />
        <Route path="/dashboards" element={<Dashboards />} />
        <Route path="/create-dashboard" element={<CreateDashboard />} />
        <Route path="/view-dashboard" element={<ViewDashboard />} />
        <Route path="/edit-dashboard" element={<EditDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
