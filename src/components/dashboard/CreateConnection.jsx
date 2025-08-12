// src/components/CreateConnection.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { authUrl } from "../../config";

const databases = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    description:
      "Connect your PostgreSQL database and create powerful dashboards with AI-generated insights.",
    available: true,
    recommended: true,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "mysql",
    name: "MySQL",
    description:
      "MySQL support is coming soon. Connect your MySQL database for dashboard creation.",
    available: false,
    recommended: false,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description:
      "MongoDB support is in development. Connect your NoSQL database for advanced analytics.",
    available: false,
    recommended: false,
    iconColor: "text-green-600",
    bgColor: "bg-green-100",
  },
];

export default function CreateConnection() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedDb, setSelectedDb] = useState("");
  const [formData, setFormData] = useState({
    host: "",
    port: "5432",
    username: "",
    password: "",
    database: "",
  });
  const [status, setStatus] = useState("idle"); // 'idle' | 'testing' | 'success' | 'error'
  const [error, setError] = useState("");

  const handleSelect = (db) => {
    setSelectedDb(db);
    setStep(2);
    setStatus("idle");
    setError("");
  };

  const handleBack = () => {
    setStep(1);
    setStatus("idle");
    setError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTest = async () => {
    // client-side validation
    if (!formData.host || !formData.username || !formData.database) {
      setError("Please fill in all required fields.");
      setStatus("error");
      toast.error("Validation Error: Please fill in all required fields.");
      return;
    }

    setStatus("testing");
    setError("");

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Access token missing.");
      setStatus("error");
      toast.error("Auth Error: No access token found.");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }


    const payload = {
      host: formData.host,
      port: Number(formData.port),
      username: formData.username,
      password: formData.password,
      database: formData.database,
    };

    try {
      const res = await fetch(`${authUrl.BASE_URL}/db_connector/get-db-token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 200) {
        // parse the JSON so we can grab the token
        const result = await res.json();
        // store the permanent db_token
        localStorage.setItem("db_token", result.data.db_token);
        console.log("Stored db_token:", result.data.db_token);
        // keep your existing debug log
        toast.success("Test Successful: Connection parameters are valid.");
        setStatus("success");
      } else {
        const errData = await res.json();
        setError(errData.message || "Test failed");
        setStatus("error");
        toast.error(`Test Failed: ${errData.message || "Unable to connect."}`);
      }
    } catch (err) {
      console.error(err);
      setError("Network error during test");
      setStatus("error");
      toast.error("Network Error: Failed to reach the server.");
    }
  };

  const handleCreate = async () => {
    if (status !== "success") {
      setError("Please test the connection successfully before proceeding.");
      toast.warn("Action Required: Test connection before creating.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Auth Error: No access token found.");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const payload = {
      host: formData.host,
      port: Number(formData.port),
      username: formData.username,
      password: formData.password,
      database: formData.database,
    };

    try {
      const res = await fetch(`${authUrl.BASE_URL}/db_connector/get-db-token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 200) {
            // parse the JSON so we can grab the token
        const result = await res.json();
        // store the permanent db_token
        localStorage.setItem("db_token", result.data.db_token);
        toast.success("Connection Created! Redirecting…");
        setTimeout(() => navigate("/create-dataset"), 2000);
      } else {
        const errData = await res.json();
        toast.error(
          `Creation Failed: ${errData.message || "Please try again."}`
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error: Failed to reach the server.");
    }
  };

  return (
    <div className="bg-gray-50 py-12">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar />
      <main className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10" id="database-connections-section">
        {/* Step Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Step {step} of 2
          </h2>
          <div className="flex items-center space-x-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full ${
                  step >= s ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Database Selection */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Connect Your Database
              </h1>
              <p className="text-gray-600">
                Choose your database type to start creating AI-powered
                dashboards.
              </p>
            </div>
            <div
              className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8"
              data-tour="create-connection"
            >
              {databases.map((db) => (
                <div
                  key={db.id}
                  onClick={() => db.available && handleSelect(db.id)}
                  className={`relative cursor-pointer border rounded-lg p-6 transition-transform duration-200 ${
                    db.available
                      ? "hover:shadow-lg hover:-translate-y-1 border-blue-200"
                      : "opacity-50 border-gray-200"
                  }`}
                >
                  {db.recommended && (
                    <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Recommended
                    </span>
                  )}
                  <div className="flex items-center space-x-4 mb-4">
                    <div
                      className={`${db.bgColor} w-12 h-16 rounded-lg flex items-center justify-center`}
                    >
                      <svg
                        className={`w-8 h-8 ${db.iconColor}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C7.03 2 3 3.79 3 6v3c0 2.21 4.03 4 9 4s9-1.79 9-4V6c0-2.21-4.03-4-9-4zm0 5c-4.4 0-7-1.12-7-2s2.6-2 7-2 7 1.12 7 2-2.6 2-7 2zm-7 5c0 2.21 4.03 4 9 4s9-1.79 9-4v3c0 2.21-4.03 4-9 4s-9-1.79-9-4v-3zm9 2c-4.4 0-7-1.12-7-2s2.6-2 7-2 7 1.12 7 2-2.6 2-7 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {db.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {db.available
                          ? db.recommended
                            ? "Most Popular"
                            : "Available"
                          : "Coming Soon"}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{db.description}</p>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span
                      className={`${
                        db.available ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      {db.available ? "Get Started →" : "Coming Soon"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Enterprise Security
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your credentials are encrypted with AES-256 and never stored
                    in plain text.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Connection Form */}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md transition-opacity duration-300">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedDb === "postgresql"
                ? "PostgreSQL Connection"
                : "Connection Details"}
            </h2>
            <form className="space-y-4">
              {["host", "port", "username", "password", "database"].map(
                (field) => (
                  <div key={field}>
                    <label
                      htmlFor={field}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      id={field}
                      name={field}
                      type={
                        field === "port"
                          ? "number"
                          : field === "password"
                          ? "password"
                          : "text"
                      }
                      value={formData[field]}
                      onChange={handleChange}
                      placeholder={field === "port" ? "5432" : ""}
                      className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                )
              )}

        

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleTest}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  {status === "testing" ? "Testing…" : "Test Connection"}
                </button>
              </div>

              {status === "success" && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    Create Connection
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="mt-4 text-red-600">{error}</div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
