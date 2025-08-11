// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import ChartCanvas from "../components/dashboard/ChartCanvas";
import TourGuide from "../components/dashboard/TourGuide";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const [showTour, setShowTour] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem("dashboard-tour-completed");
    if (!hasSeenTour) {
      // Delay tour start to let components mount
      setTimeout(() => setShowTour(true), 500);
    }
       const token = localStorage.getItem("accessToken");
        if (!token) {
          toast.error("Auth Error: No access token found.");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }
  }, []);

  const handleTourComplete = () => {
    setShowTour(false);
    localStorage.setItem("dashboard-tour-completed", "true");
  };

  const handleTourSkip = () => {
    setShowTour(false);
    localStorage.setItem("dashboard-tour-completed", "true");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <ChartCanvas />
      <TourGuide
        isActive={showTour}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
      />
    </div>
  );
}
