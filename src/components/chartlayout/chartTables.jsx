import React, { useState } from "react";
import { useDrag } from "react-dnd";
import {
  FaChartBar,
  FaChartPie,
  FaChartLine,
  FaRandom,
  FaTable,
  FaMapMarkedAlt,
  FaTh,
  FaTachometerAlt,
} from "react-icons/fa";
import { MdOutlineBubbleChart } from "react-icons/md";
import { AiOutlineAreaChart, AiOutlineRadarChart } from "react-icons/ai";
import { BiSolidDoughnutChart } from "react-icons/bi";
import { TiChartArea } from "react-icons/ti";
import classNames from "classnames";

const cn = (...classes) => classNames(...classes);

const ChartTypes = {
  BAR: "Bar",
  LINE: "Line",
  PIE: "Pie",
  AREA: "Area",
  SCATTER: "Scatter",
  TABLE: "Table",
  MAP: "Map",
  CARD: "Card",
  GAUGE: "Gauge",
};

const ChartIcon = ({ type, size = 18 }) => {
  switch (type) {
    case ChartTypes.BAR:
      return <FaChartBar size={size} className="text-primary" />;
    case ChartTypes.LINE:
      return <FaChartLine size={size} className="text-primary" />;
    case ChartTypes.PIE:
      return <FaChartPie size={size} className="text-primary" />;
    case ChartTypes.AREA:
      return <AiOutlineAreaChart size={size} className="text-primary" />;
    case ChartTypes.SCATTER:
      return <FaRandom size={size} className="text-primary" />;
    case ChartTypes.TABLE:
      return <FaTable size={size} className="text-primary" />;
    case ChartTypes.MAP:
      return <FaMapMarkedAlt size={size} className="text-primary" />;
    case ChartTypes.CARD:
      return <FaTh size={size} className="text-primary" />;
    case ChartTypes.GAUGE:
      return <FaTachometerAlt size={size} className="text-primary" />;
    default:
      return <FaChartBar size={size} className="text-primary" />;
  }
};

const DraggableChart = ({ type, label }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "CHART_TYPE",
    item: { type },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      className={cn(
        "drag-item bg-white hover:cursor-pointer dark:bg-gray-800 border border-gray-300 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col items-center",
        isDragging && "opacity-50"
      )}
    >
      <ChartIcon type={type} />
      <span className="text-xs mt-1">{label}</span>
    </div>
  );
};

const Template = ({ id, icon, label }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TEMPLATE",
    item: { id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      className={cn(
        "drag-item bg-white dark:bg-gray-800 border border-gray-300 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center",
        isDragging && "opacity-50"
      )}
    >
      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center mr-2">
        {icon}
      </div>
      <span className="text-xs">{label}</span>
    </div>
  );
};

export default function ChartTable({
  charts = [],
  setCharts,
  sampleTableData = [],
  backendCharts = [],
}) {
  // 1) never undefined
  // 2) flattenObject hoisted in this scope
  function flattenObject(obj, prefix = "") {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(acc, flattenObject(val, newKey));
      } else {
        acc[newKey] = val;
      }
      return acc;
    }, {});
  }

  const sampleFields =
    sampleTableData.length > 0
      ? Object.keys(flattenObject(sampleTableData[0]))
      : [];

  const [activeTab, setActiveTab] = useState("visualizations");

  const addChart = (type) => {
    const baseX = 20,
      baseY = 20,
      width = 450,
      height = 400;
    let x = baseX,
      y = baseY,
      found = false,
      attempts = 0;

    while (!found && attempts < 20) {
      found = true;
      for (const chart of charts) {
        if (
          x < chart.position.x + chart.position.width &&
          x + width > chart.position.x &&
          y < chart.position.y + chart.position.height &&
          y + height > chart.position.y
        ) {
          found = false;
          x += 30;
          if (x > 800) {
            x = baseX;
            y += 30;
          }
          break;
        }
      }
      attempts++;
    }

    const newChart = {
      id: `chart-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      type,
      position: { x, y, width, height },
      rawData: sampleTableData, // guaranteed array
      xField: "",
      yField: "",
    };

    setCharts([...charts, newChart]);
    setActiveTab("fields");
  };

  return (
    <div className="w-64 text-white dark:bg-gray-900 flex flex-col h-full">
      <div className="px-3 py-2 flex">
        <button
          className={cn(
            "flex-1 text-sm font-medium py-2",
            activeTab === "visualizations" && "border-b-2 border-blue-500"
          )}
          disabled={charts.length > 0}
          onClick={() => setActiveTab("visualizations")}
        >
          Visualizations
        </button>
        <button
          className={cn(
            "flex-1 text-sm font-medium py-2",
            activeTab === "fields" && "border-b-2 border-blue-500"
          )}
          onClick={() => setActiveTab("fields")}
        >
          Fields
        </button>
      </div>

      {activeTab === "visualizations" && (
        <div className="p-4 overflow-y-auto flex-1">
          <p className="font-medium mb-3 text-sm">Add a Chart</p>
          <div className="space-y-2">
            <div
              onClick={() => addChart("bar")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <FaChartBar size={18} className="text-blue-400" />
              <span className="text-sm">Bar Chart</span>
            </div>
            <div
              onClick={() => addChart("pie")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <FaChartPie size={18} className="text-yellow-400" />
              <span className="text-sm">Pie Chart</span>
            </div>
            <div
              onClick={() => addChart("bubble")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <MdOutlineBubbleChart size={18} className="text-green-400" />
              <span className="text-sm">Bubble Chart</span>
            </div>
            <div
              onClick={() => addChart("doughnut")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <BiSolidDoughnutChart size={18} className="text-pink-400" />
              <span className="text-sm">Doughnut</span>
            </div>
            <div
              onClick={() => addChart("line")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <FaChartLine size={18} className="text-cyan-400" />
              <span className="text-sm">Line Chart</span>
            </div>
            <div
              onClick={() => addChart("polar")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <TiChartArea size={18} className="text-teal-400" />
              <span className="text-sm">Polar Area Chart</span>
            </div>
            <div
              onClick={() => addChart("radar")}
              className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer"
            >
              <AiOutlineRadarChart size={18} className="text-violet-400" />
              <span className="text-sm">Radar Chart</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "fields" && (
        <div className="p-4 overflow-y-auto">
          <p className="font-medium mb-2 text-sm">Available Fields</p>
          {sampleFields.map((field) => (
            <div
              key={field}
              className="text-xs bg-gray-800 px-3 py-1 rounded mb-1 text-white border border-gray-700"
            >
              {field}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
