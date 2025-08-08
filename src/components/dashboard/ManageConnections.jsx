// src/components/DatabaseConnections.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Database as DBIcon,
  Trash2,
  Edit2,
  Wifi,
  MoreVertical,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { authUrl } from "../../config";
import { useNavigate } from "react-router-dom";

// Database type configurations
const databaseTypes = {
  postgresql: {
    name: "PostgreSQL",
    logo:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
    borderColor: "border-blue-200",
  },
  mysql: {
    name: "MySQL",
    logo:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
    borderColor: "border-orange-200",
  },
  sqlserver: {
    name: "SQL Server",
    logo:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg",
    borderColor: "border-red-200",
  },
  mongodb: {
    name: "MongoDB",
    logo:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
    borderColor: "border-green-200",
  },
};

export default function DatabaseConnections() {
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const navigate = useNavigate();

  // 1) initial load
  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    setIsLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Auth Error: No access token found.");
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${authUrl.BASE_URL}/db_connector/connections`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data.connections)) {
        setConnections(json.data.connections);
      } else {
        toast.error("Failed to load connections.");
        setConnections([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load connections.");
    } finally {
      setIsLoading(false);
    }
  }

  // 2) click the card → pick up its .token and redirect
  const handleRedirect = (id) => async () => {
    const conn = connections.find((c) => c.id === id);
    if (!conn) {
      toast.error("Connection not found.");
      return;
    }
    localStorage.setItem("db_token", conn.token);
    toast.success(`Selected ${conn.host}! Redirecting…`);
    setTimeout(() => navigate("/create-dataset"), 2000);
  };

  // 3) edit stub
  const handleEdit = (conn) => {
    setEditingConnection(conn);
    setIsFormOpen(true);
  };

  // 4) delete locally filter out instead of full reload
  const handleDelete = async (id, name, dbToken) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Auth Error: No access token found.");
      return;
    }
    try {
      const res = await fetch(
        `${authUrl.BASE_URL}/ai/connections/${dbToken}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.status === 200) {
        toast.success("Connection deleted");
        // remove from state immediately
        setConnections((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error("Failed to delete connection.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting connection.");
    }
  };

  // Always render ToastContainer
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600">Loading…</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Database Connections
              </h2>
              <p className="text-gray-600">Manage your database connections</p>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("database-connections-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
              className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-1 rounded"
            >
              <Plus className="w-4 h-4" />
              <span>Add Connection</span>
            </button>
          </div>

          {/* empty? */}
          {connections.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
              <DBIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No connections yet
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first database connection to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((conn, idx) => {
                const type = databaseTypes[conn.type] || {};
                return (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div
                      onClick={handleRedirect(conn.id)}
                      className={`bg-white rounded-lg shadow p-4 border ${type.borderColor} cursor-pointer`}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            {type.logo ? (
                              <img
                                src={type.logo}
                                alt={type.name}
                                className="w-6 h-6"
                              />
                            ) : (
                              <DBIcon className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{conn.username}</h3>
                            <p className="text-sm text-gray-500">
                              {type.name}
                            </p>
                          </div>
                        </div>
                        <div className="relative group">
                          <MoreVertical className="w-5 h-5 text-gray-500 cursor-pointer" />
                          <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(conn);
                              }}
                              className="w-full text-left px-3 py-1 hover:bg-gray-100 flex items-center"
                            >
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </button> */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(conn.id, conn.username, conn.token);
                              }}
                              className="w-full text-left px-3 py-1 hover:bg-gray-100 flex items-center text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                          <Wifi className="w-4 h-4" />
                          Active
                        </span>
                        <div className="text-sm text-gray-700 break-all">
                          {`${conn.username}@${conn.host}:${conn.port}/${conn.database}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created{" "}
                          {new Date(conn.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* form stub */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingConnection ? "Edit Connection" : "Add Connection"}
            </h3>
            <p className="text-gray-600 mb-4">[Your form goes here]</p>
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingConnection(null);
              }}
              className="mt-4 bg-gray-200 px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
