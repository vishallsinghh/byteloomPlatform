// src/components/dashboard/TourGuide.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ChevronLeft } from "lucide-react";

const tourSteps = [
  {
    id: "welcome",
    title: "Welcome to ByteLoom!",
    description:
      "Let's take a quick tour to get you started with creating amazing charts and dashboards.",
    target: "",
    position: "top",
  },
  {
    id: "Create connection with your database",
    title: "Add Your First Database",
    description:
      "Click here to add a new database. You can fetch all your tables and create charts from them.",
    target: "[data-tour='create-connection']",
    position: "bottom",
  },
  {
    id: "sidebar-toggle",
    title: "Navigation Menu",
    description:
      "Use this hamburger menu to expand or collapse the sidebar. The sidebar shows your database tables and connections.",
    target: "[data-tour='sidebar-toggle']",
    position: "right",
  },
  {
    id: "end",
    title: "Voila! You're Ready to Create Charts",
    description:
      "Enter your database credentials and start building your first chart",
    target: "",
    position: "right",
  },
];

export default function TourGuide({ isActive, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [resizeTrigger, setResizeTrigger] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const step = tourSteps[currentStep];
    if (step.target) {
      const el = document.querySelector(step.target);
      setHighlightedElement(el);
    } else {
      setHighlightedElement(null);
    }
  }, [currentStep, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const onResize = () => setResizeTrigger((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isActive]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  function getTooltipPosition() {
    if (!highlightedElement) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    const rect = highlightedElement.getBoundingClientRect();
    const step = tourSteps[currentStep];
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile
      ? Math.min(window.innerWidth - 40, 320)
      : 320;
    const tooltipHeight = 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (isMobile) {
      return { bottom: 20, left: 20, right: 20, transform: "none" };
    }

    let pos = {};
    switch (step.position) {
      case "bottom":
        pos = {
          top: rect.bottom + 20,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case "top":
        pos = {
          top: rect.top - tooltipHeight - 20,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case "right":
        pos = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + 20,
        };
        break;
      case "left":
        pos = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.left - tooltipWidth - 20,
        };
        break;
      default:
        pos = {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }

    // clamp within viewport
    pos.left = Math.min(Math.max(pos.left, 20), vw - tooltipWidth - 20);
    pos.top = Math.min(Math.max(pos.top, 20), vh - tooltipHeight - 20);
    return { width: tooltipWidth, ...pos };
  }

  function getHighlightStyle() {
    if (!highlightedElement) return {};
    const r = highlightedElement.getBoundingClientRect();
    return {
      top: r.top - 8,
      left: r.left - 8,
      width: r.width + 16,
      height: r.height + 16,
    };
  }

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" onClick={onSkip} />

        {/* Highlight */}
        {highlightedElement && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              ...getHighlightStyle(),
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "3px solid #3b82f6",
              borderRadius: "8px",
              boxShadow:
                "0 0 0 4px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.5), inset 0 0 0 2px rgba(255,255,255,0.2)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          className="fixed z-[70] bg-white rounded-md shadow-lg"
          style={getTooltipPosition()}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {tourSteps[currentStep].title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {tourSteps[currentStep].description}
                </p>
              </div>
              <button
                onClick={onSkip}
                className="p-1 text-gray-500 hover:text-gray-700 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                {tourSteps.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx === currentStep
                        ? "bg-blue-500"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <div className="flex space-x-2">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="flex items-center px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  {currentStep === tourSteps.length - 1
                    ? "Finish"
                    : "Next"}
                  {currentStep < tourSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 ml-1" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
