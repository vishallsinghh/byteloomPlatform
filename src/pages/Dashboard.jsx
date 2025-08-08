// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import ChartCanvas from "../components/dashboard/ChartCanvas";
import TourGuide from "../components/dashboard/TourGuide";

export default function Dashboard() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem("dashboard-tour-completed");
    if (!hasSeenTour) {
      // Delay tour start to let components mount
      setTimeout(() => setShowTour(true), 500);
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
