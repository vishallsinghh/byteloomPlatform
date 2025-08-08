// src/components/floating-charts.jsx
// @ts-nocheck
import React from "react";
import { motion } from "framer-motion";

const chartVariants = {
  float: {
    y: [0, -10, 5, 0],
    rotate: [0, 1, -1, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function FloatingCharts() {
  return (
    <div className="relative z-10 flex items-center justify-center w-full py-12 px-8">
      <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Chart Card 1 */}
        <motion.div
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg"
          variants={chartVariants}
          animate="float"
          style={{ animationDelay: "0s" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Revenue Growth</h3>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div className="h-40 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <div className="text-3xl font-bold">+24.5%</div>
              <div className="text-sm opacity-80">vs last month</div>
            </div>
          </div>
        </motion.div>

        {/* Chart Card 2 */}
        <motion.div
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg"
          variants={chartVariants}
          animate="float"
          style={{ animationDelay: "1s" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">User Analytics</h3>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
          </div>
          <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mb-4 relative">
            <div className="absolute bottom-4 left-4 text-white">
              <div className="text-3xl font-bold">12.4K</div>
              <div className="text-sm opacity-80">Active Users</div>
            </div>
          </div>
        </motion.div>

        {/* Chart Card 3 */}
        <motion.div
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg"
          variants={chartVariants}
          animate="float"
          style={{ animationDelay: "2s" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Database Stats</h3>
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          </div>
          <div className="h-40 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg mb-4 relative">
            <div className="absolute bottom-4 left-4 text-white">
              <div className="text-3xl font-bold">847</div>
              <div className="text-sm opacity-80">Queries/min</div>
            </div>
          </div>
        </motion.div>

        {/* Chart Card 4 */}
        <motion.div
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg"
          variants={chartVariants}
          animate="float"
          style={{ animationDelay: "3s" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Performance</h3>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div className="h-40 bg-gradient-to-br from-green-400 to-teal-600 rounded-lg mb-4 relative">
            <div className="absolute bottom-4 left-4 text-white">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm opacity-80">Uptime</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
