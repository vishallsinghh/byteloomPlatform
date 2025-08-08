// src/components/dashboard/Sidebar.jsx
// @ts-nocheck
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Menu,
  LogOut,
  Table,
  Database,
  Loader2,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function Sidebar() {
  // Local collapse state instead of useAppStore
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
    const { logout, user } = useContext(AuthContext);
  

  const currentConnection = false;
  const tables = [
    "users",
    "orders",
    "products",
    "analytics",
    "customers",
    "transactions",
  ];
  const isLoading = false;

  const handleLogout = () => {
    console.log("Logout clicked");
    logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const toggleSidebar = () => setCollapsed((c) => !c);

  return (
    <motion.div
      className="bg-white border-r border-gray-200 flex-shrink-0"
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <motion.div
              className="flex items-center space-x-3"
              initial={false}
              animate={{
                opacity: collapsed ? 0 : 1,
                scale: collapsed ? 0.8 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">ByteLoom</span>
            </motion.div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            data-tour="sidebar-toggle"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Connection Info */}
      <div className="p-4 border-b border-gray-200">
        {currentConnection ? (
          !collapsed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="text-sm font-medium text-green-800">
                  Connected
                </span>
              </div>
              <div className="text-xs text-green-700">
                <div>
                  {currentConnection.type.toUpperCase()} –{" "}
                  {currentConnection.host}:{currentConnection.port}
                </div>
                <div>Database: {currentConnection.database}</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
            </div>
          )
        ) : !collapsed ? (
          <div className="text-center text-sm text-gray-500">
            No connection created yet. Create one by selecting a database.
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
          </div>
        )}
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {!collapsed && (
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Table className="w-4 h-4" />
              <span>Tables</span>
            </h3>
          )}

          {!currentConnection ? (
            <div className="text-sm text-gray-500 p-2">
              No tables to fetch.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              {!collapsed && (
                <span className="ml-2 text-sm text-gray-600">Loading…</span>
              )}
            </div>
          ) : (
            <div className="space-y-1" data-tour="tables-list">
              {tables.map((table, i) => (
                <motion.div
                  key={table}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group"
                >
                  <Database className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                        {table}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {Math.floor(Math.random() * 20) + 1}K
                      </span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center space-x-2 ${
            collapsed ? "px-2" : ""
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
}
