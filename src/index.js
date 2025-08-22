// src/index.js
import React from "react";
import { createRoot } from "react-dom/client"; // <-- use this
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css"; // <-- import your CSS file
import { toast, ToastContainer } from "react-toastify";

const container = document.getElementById("root");
const root = createRoot(container); // <-- create a root
root.render(
  <BrowserRouter>
    <ToastContainer position="top-right" autoClose={3000} />
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
