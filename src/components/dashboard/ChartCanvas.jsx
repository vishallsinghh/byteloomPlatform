// src/components/dashboard/ChartCanvas.jsx
import { Plus, BarChart3, TrendingUp, Users, Activity } from "lucide-react";
import CreateConnection from "./CreateConnection";
import ManageConnections from "./ManageConnections";

export default function ChartCanvas() {
  const charts = [
    {
      title: "Revenue Trend",
      value: "$24,580",
      change: "+12.5%",
      changeType: "positive",
      icon: TrendingUp,
      gradient: "from-blue-500 to-purple-600",
    },
    {
      title: "User Growth",
      value: "12,847",
      change: "+8.2%",
      changeType: "positive",
      icon: Users,
      gradient: "from-green-500 to-teal-600",
    },
    {
      title: "Performance",
      value: "99.9%",
      change: "↗ 0.1%",
      changeType: "positive",
      icon: Activity,
      gradient: "from-orange-500 to-red-600",
    },
  ];

  const handleReset = () => {
    localStorage.removeItem("dashboard-tour-completed");
    window.location.reload();
  };

  return (
    <div className="flex-1 p-6 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" id="connections-list">Dashboard</h1>
          <p className="text-gray-600">
            Build and customize your data visualizations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Reset Tour
          </button>
          <button
            className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100"
            
          >
            <Plus className="w-4 h-4" />
            <span>Add Database</span>
          </button>
        </div>
      </div>

      <ManageConnections />
      
      {/* <CreateConnection /> */}

      {/* Charts Grid */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {charts.map((chart, index) => (
          <motion.div
            key={chart.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-medium">{chart.title}</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-600">Live</span>
                </div>
              </div>
              <div className="p-4">
                <div
                  className={`h-32 bg-gradient-to-r ${chart.gradient} rounded-lg mb-4 relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="text-2xl font-bold">{chart.value}</div>
                    <div className="text-sm opacity-80">
                      {chart.change} from last month
                    </div>
                  </div>
                  <chart.icon className="absolute top-4 right-4 w-6 h-6 text-white/60" />
                </div>
                <div className="flex items-center justify-between text-sm px-2">
                  <span className="text-gray-600">This Month</span>
                  <span
                    className={`font-medium ${
                      chart.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {chart.change}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div> */}

      {/* Drag & Drop Area */}
      {/* <motion.div
        className="bg-white rounded-xl max-w-[500px] mx-auto border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-500 transition-colors"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="max-w-[500px] mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Drop Chart Components Here
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop chart components from the sidebar to build your custom
            dashboard
          </p>
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Browse Chart Library
          </button>
        </div>
      </motion.div> */}
    </div>
  );
}
