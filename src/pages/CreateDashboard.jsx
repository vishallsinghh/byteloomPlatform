// /pages/DashboardPage.js

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FiTrash2,
  FiSave,
  FiDatabase,
  FiBarChart2,
  FiTrendingUp,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import ChartIcon from "../components/ChartIcon";
import RGL, { WidthProvider } from "react-grid-layout";
import Navbar from "../components/Navbar";
import { RiDraggable } from "react-icons/ri";
import { RxCross2 } from "react-icons/rx";
import colorLib from "@kurkle/color";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { authUrl, url } from "../config";
import { toast, ToastContainer } from "react-toastify";

// Highcharts imports
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

const GridLayout = WidthProvider(RGL);

// Row height in pixels
const ROW_HEIGHT = 30;

// Color palettes
const LINE_COLORS = ["rgb(207,37,0)", "rgb(7,164,199)"];
const OTHER_COLORS = [
  "rgb(165, 148, 249)",
  "rgb(176, 219, 156)",
  "rgb(255, 128, 128)",
  "rgb(148, 181, 249)",
  "rgb(185, 178, 219)",
  "rgb(249, 165, 148)",
  "rgb(247, 207, 216)",
  "rgb(255, 199, 133)",
  "rgb(163, 216, 255)",
  "rgb(185, 243, 252)",
  "rgb(174, 226, 255)",
  "rgb(147, 198, 231)",
  "rgb(254, 222, 255)",
  "rgb(244, 191, 191)",
  "rgb(255, 217, 192)",
  "rgb(250, 240, 215)",
  "rgb(140, 192, 222)",
  "rgb(216, 148, 249)",
];

// Helper to make a color semi-transparent
const transparentize = (value, opacity = 0.5) => {
  const alpha = 1 - opacity;
  return colorLib(value).alpha(alpha).rgbString();
};

// Build Highcharts options based on chart definition
function getHighchartsOptions(chart, colorOffset = 0) {
  const { type, data } = chart;
  const xAxisLabel = chart.x_axis;
  const yAxisLabel = chart.y_axis;
  const labels = Array.isArray(data.labels) ? data.labels : [];

  // Choose color palette
  let CHART_COLORS;
  switch (type) {
    case "line":
    case "scatter":
      CHART_COLORS = LINE_COLORS;
      break;
    case "bar":
    case "pie":
    case "doughnut":
    case "radar":
    case "polar":
    case "bubble":
      CHART_COLORS = OTHER_COLORS;
      break;
    default:
      CHART_COLORS = OTHER_COLORS;
  }
  const offset = colorOffset % CHART_COLORS.length;
  const rotatedColors = [
    ...CHART_COLORS.slice(offset),
    ...CHART_COLORS.slice(0, offset),
  ];

  const baseOptions = {
    title: { text: "" },
    subtitle: { text: "" },
    credits: { enabled: false },
    colors: rotatedColors,
    chart: {},
    xAxis: {},
    yAxis: {},
    series: [],
    plotOptions: {},
    tooltip: {},
  };

  const makeSeries = () => {
    return data.datasets.map((ds, i) => {
      const baseColor = rotatedColors[i % rotatedColors.length];
      const seriesObj = { name: ds.label ?? `Series ${i + 1}` };

      if (type === "scatter") {
        // Scatter: accept either {x,y} objects or fallback to [index, value]
        const pts = ds.data
          .map((pt, idx) => {
            if (pt && typeof pt === "object" && "x" in pt && "y" in pt) {
              return [pt.x, pt.y];
            } else {
              const y = typeof pt === "number" ? pt : parseFloat(pt);
              if (isNaN(y)) {
                return null;
              }
              return [idx, y];
            }
          })
          .filter((p) => p !== null);
        seriesObj.data = pts;
      } else if (type === "bubble") {
        // Bubble: infer x from numeric labels, y from ds.data values, and z from y
        const pts = ds.data
          .map((value, idx) => {
            const label = labels[idx];
            const x = parseFloat(label);
            const y = typeof value === "number" ? value : parseFloat(value);
            if (isNaN(x) || isNaN(y)) {
              return null;
            }
            const z = y;
            return { x, y, z };
          })
          .filter((pt) => pt !== null);
        seriesObj.data = pts;
      } else {
        // Default: plain data array for e.g. line/bar
        seriesObj.data = ds.data;
      }

      // Style per type
      if (type === "bar") {
        seriesObj.color = baseColor;
        seriesObj.borderColor = baseColor;
        seriesObj.borderWidth = 0;
      } else if (type === "line") {
        seriesObj.color = baseColor;
        seriesObj.fillColor = transparentize(baseColor, 0.5);
        seriesObj.marker = { fillColor: baseColor };
      } else if (type === "radar") {
        seriesObj.color = baseColor;
        seriesObj.marker = { fillColor: baseColor };
      } else if (type === "polarArea") {
        seriesObj.color = transparentize(baseColor, 0.5);
        seriesObj.borderColor = "#ffffff";
        seriesObj.borderWidth = 1;
      } else if (type === "scatter" || type === "bubble") {
        seriesObj.color = baseColor;
      }
      return seriesObj;
    });
  };

  switch (type) {
    case "bar":
      baseOptions.chart = { type: "column" };
      baseOptions.xAxis = { categories: labels, title: { text: xAxisLabel } };
      baseOptions.yAxis = { title: { text: yAxisLabel } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        column: {
          states: { inactive: { enabled: true, opacity: 0.3 } },
          point: {
            events: {
              mouseOver: function () {
                this.series.points.forEach((pt) => {
                  if (pt !== this) pt.setState("inactive");
                });
              },
              mouseOut: function () {
                this.series.points.forEach((pt) => {
                  if (pt !== this) pt.setState("");
                });
              },
            },
          },
          borderWidth: 0,
        },
      };
      break;

    case "multi_bar":
      baseOptions.chart = { type: "column" };
      baseOptions.xAxis = { categories: labels, title: { text: xAxisLabel } };
      baseOptions.yAxis = { title: { text: "" } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        column: {
          states: { inactive: { enabled: true, opacity: 0.3 } },
          point: {
            events: {
              mouseOver: function () {
                this.series.points.forEach((pt) => {
                  if (pt !== this) pt.setState("inactive");
                });
              },
              mouseOut: function () {
                this.series.points.forEach((pt) => {
                  if (pt !== this) pt.setState("");
                });
              },
            },
          },
          borderWidth: 0,
        },
      };
      break;
    case "multi_line":
      baseOptions.chart = { type: "line" };
      baseOptions.xAxis = {
        categories: labels,
        title: { text: xAxisLabel },
      };
      baseOptions.yAxis = { title: { text: "" } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        line: {
          marker: { enabled: false },
          states: { hover: { lineWidthPlus: 1 } },
        },
      };
      break;

    case "line":
      baseOptions.chart = { type: "line" };
      baseOptions.xAxis = { categories: labels, title: { text: xAxisLabel } };
      baseOptions.yAxis = { title: { text: yAxisLabel } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        line: {
          marker: { enabled: false, radius: 3 },
          states: { hover: { lineWidthPlus: 1 } },
        },
      };
      break;

    case "pie":
      baseOptions.chart = { type: "pie" };
      if (data.datasets.length > 0) {
        const ds0 = data.datasets[0];
        const values = ds0.data;
        const maxValue = Math.max(...values);
        const maxIndex = values.findIndex((v) => v === maxValue);
        baseOptions.series = [
          {
            innerSize: "0%",
            yMin: 0,
            name: chart.name || ds0.label || "Pie",
            data: labels.map((lbl, idx) => {
              const point = {
                name: lbl,
                y: ds0.data[idx],
                color: rotatedColors[idx % rotatedColors.length],
              };
              if (idx === maxIndex) {
                // optionally highlight max
              }
              return point;
            }),
          },
        ];
      }
      baseOptions.plotOptions = {
        pie: {
          allowPointSelect: true,
          borderWidth: 2,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            distance: 20,
          },
        },
      };
      break;

    case "doughnut":
      baseOptions.chart = { type: "pie" };
      if (data.datasets.length > 0) {
        const ds0 = data.datasets[0];
        baseOptions.series = [
          {
            name: chart.name || ds0.label || "Doughnut",
            innerSize: "60%",
            data: labels.map((lbl, idx) => ({
              name: lbl,
              y: ds0.data[idx],
              color: rotatedColors[idx % rotatedColors.length],
            })),
          },
        ];
      }
      baseOptions.plotOptions = {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
          },
        },
      };
      break;

    case "radar":
      baseOptions.chart = { polar: true, type: "area" };
      baseOptions.xAxis = {
        categories: labels,
        tickmarkPlacement: "on",
        lineWidth: 0,
      };
      baseOptions.yAxis = {
        gridLineInterpolation: "polygon",
        lineWidth: 0,
        min: 0,
      };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        series: { marker: { enabled: false } },
      };
      break;

    case "polar":
      baseOptions.chart = { polar: true, type: "column" };
      baseOptions.xAxis = {
        categories: labels,
        tickmarkPlacement: "on",
        lineWidth: 0,
      };
      baseOptions.yAxis = {
        min: 0,
        endOnTick: false,
        showLastLabel: true,
      };
      if (data.datasets.length > 0) {
        const ds0 = data.datasets[0];
        baseOptions.series = [
          {
            name: chart.name || ds0.label || "Polar Area",
            data: ds0.data,
            borderColor: "#ffffff",
            borderWidth: 1,
          },
        ];
      }
      baseOptions.plotOptions = {
        column: { pointPadding: 0, groupPadding: 0 },
      };
      break;

    case "scatter":
      baseOptions.chart = { type: "scatter", zoomType: "xy" };
      baseOptions.xAxis = { title: { text: xAxisLabel } };
      baseOptions.yAxis = { title: { text: yAxisLabel } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        scatter: {
          marker: {
            radius: 4,
            states: {
              hover: {
                enabled: true,
                radiusPlus: 2,
              },
            },
          },
        },
      };
      break;

    case "bubble":
      baseOptions.chart = {
        type: "bubble",
        plotBorderWidth: 1,
        zoomType: "xy",
      };
      baseOptions.xAxis = {
        title: { text: xAxisLabel },
        categories: labels,
        type: "category",
      };
      baseOptions.yAxis = { title: { text: yAxisLabel } };
      baseOptions.series = data.datasets.map((ds, i) => {
        const seriesObj = { name: ds.label ?? `Series ${i + 1}` };
        const pts = ds.data
          .map((value, idx) => {
            const label = labels[idx];
            let x = parseFloat(label);
            if (isNaN(x)) x = idx;
            const y = typeof value === "number" ? value : parseFloat(value);
            if (isNaN(y)) return null;
            // For size, you can scale: e.g. z: Math.sqrt(y) or direct y
            return { x, y, z: y, name: label };
          })
          .filter((p) => p !== null);
        seriesObj.data = pts;
        seriesObj.color = rotatedColors[i % rotatedColors.length];
        return seriesObj;
      });
      baseOptions.plotOptions = {
        bubble: {
          minSize: 5,
          maxSize: "20%",
          states: {
            hover: { enabled: true, halo: { size: 5 } },
          },
          tooltip: {
            pointFormat:
              "<b>{point.name}</b><br/>Value: {point.y}<br/>Size: {point.z}",
          },
        },
      };
      break;

    default:
      // fallback to areaspline
      baseOptions.chart = { type: "areaspline" };
      baseOptions.xAxis = { categories: labels, title: { text: xAxisLabel } };
      baseOptions.yAxis = { title: { text: yAxisLabel } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        areaspline: { marker: { enabled: false, radius: 3 } },
      };
      break;
  }

  return baseOptions;
}

function DashboardPage() {
  const navigate = useNavigate();

  // State for datasets, selected dataset, its charts & kpis
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [charts, setCharts] = useState([]);
  const [kpis, setKpis] = useState([]);

  // Widgets on canvas
  const [widgets, setWidgets] = useState([]);

  // Which popup is open: 'dataset' | 'charts' | 'kpis' | null
  const [activePanel, setActivePanel] = useState(null);

  // Ref and state to measure container height
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Load highcharts-more for bubble support (client-side only)
  useEffect(() => {
    // only run in browser
    if (typeof window === "undefined") return;

    import("highcharts/highcharts-more")
      .then((HighchartsMoreModule) => {
        // the module may export the function as default or directly
        const initMore = HighchartsMoreModule.default || HighchartsMoreModule;
        if (typeof initMore === "function") {
          initMore(Highcharts);
        } else {
          console.warn("highcharts-more didn’t export a function", initMore);
        }
      })
      .catch((err) => {
        console.warn("Could not load highcharts-more:", err);
      });
  }, []);

  // Load datasets once
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Auth Error: No access token found.");
      return;
    }

    const dbToken = localStorage.getItem("db_token");
    if (!dbToken) {
      toast.error("Auth Error: No DB token found.");
      return;
    }
    fetch(`${authUrl.BASE_URL}/dataset/info/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ db_token: dbToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dataset list");
        return res.json();
      })
      .then((json) => {
        setDatasets(Array.isArray(json.data) ? json.data : []);
      })
      .catch((err) => {
        console.error(err);
        Swal.fire("Error", "Could not load datasets", "error");
      });
  }, []);

  // Measure container height on resize / initial mount
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    resizeObserver.observe(el);
    // Initial measurement
    setContainerHeight(el.getBoundingClientRect().height);
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Select a dataset: fetch charts/kpis and reset widgets
// Updated selectDataset function for DashboardPage
const selectDataset = async (id) => {
  setSelectedDatasetId(id);
  
  const token = localStorage.getItem("accessToken");
  if (!token) {
    toast.error("Auth Error: No access token found.");
    return;
  }
  const dbToken = localStorage.getItem("db_token");
  if (!dbToken) {
    toast.error("Auth Error: No DB token found.");
    return;
  }

  try {
    // 1) Fetch KPIs and Charts metadata in parallel
    const [kpisRes, chartsRes] = await Promise.all([
      fetch(`${authUrl.BASE_URL}/dataset/kpis/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      }),
      fetch(`${authUrl.BASE_URL}/dataset/chart/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
    ]);

    if (!kpisRes.ok || !chartsRes.ok) {
      throw new Error(`Failed to load data for dataset ${id}`);
    }

    const kpisData = await kpisRes.json();
    const chartsData = await chartsRes.json();

    console.log('Raw KPIs data:', kpisData); // Debug log
    console.log('Raw Charts data:', chartsData); // Debug log

    // 2) Extract metadata and prepare individual API calls
    const kpiList = kpisData?.data?.kpi || [];
    const chartList = chartsData?.data?.chart || [];

    // 3) Fetch KPI values
    const kpiValuePromises = kpiList.map(async (kpi) => {
      try {
        const response = await fetch(`${authUrl.BASE_URL}/dataset/kpi/${kpi.id}/data/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ db_token: dbToken })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`KPI ${kpi.id} result:`, result); // Debug log
          
          return {
            kpi_id: kpi.id,
            kpi_name: result?.data?.kpi_name || kpi.kpi_name,
            value: result?.data?.value || result?.data?.raw_value || 'N/A'
          };
        } else {
          console.error(`Failed to fetch KPI ${kpi.id} data:`, response.status);
        }
      } catch (err) {
        console.error(`Error fetching KPI ${kpi.id}:`, err);
      }
      
      return {
        kpi_id: kpi.id,
        kpi_name: kpi.kpi_name,
        value: 'Error'
      };
    });

    // 4) Fetch chart data
    const chartValuePromises = chartList.map(async (chart) => {
      try {
        const response = await fetch(`${authUrl.BASE_URL}/dataset/chart/${chart.id}/data/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ db_token: dbToken })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Chart ${chart.id} result:`, result); // Debug log
          
          return {
            chart_id: result?.data?.chart_id || chart.id,
            chart_title: result?.data?.chart_title || chart.chart_title,
            chart_type: result?.data?.chart_type || chart.chart_type,
            x_axis: result?.data?.x_axis || chart.x_axis,
            y_axis: result?.data?.y_axis || chart.y_axis,
            data: result?.data?.data || null
          };
        } else {
          console.error(`Failed to fetch chart ${chart.id} data:`, response.status);
        }
      } catch (err) {
        console.error(`Error fetching chart ${chart.id}:`, err);
      }
      return null;
    });

    // 5) Wait for all requests to complete
    const [kpiResults, chartResults] = await Promise.all([
      Promise.allSettled(kpiValuePromises),
      Promise.allSettled(chartValuePromises)
    ]);

    // 6) Process KPI results
    const formattedKpis = kpiResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .filter(({ kpi_name, value }) => 
        kpi_name != null && kpi_name !== "" && value != null && value !== ""
      )
      .map(({ kpi_id, kpi_name, value }) => ({
        id: kpi_id,
        name: kpi_name,
        value,
      }));

    // 7) Process chart results
    const visibleCharts = chartResults
      .filter(r => r.status === 'fulfilled' && r.value && r.value.chart_type !== 'heatmap')
      .map(r => r.value)
      .filter(c => {
        // Must have at least one dataset and one label
        const hasDatasets = Array.isArray(c.data?.datasets) && c.data.datasets.length > 0;
        const hasLabels = Array.isArray(c.data?.labels) && c.data.labels.length > 0;
        return hasDatasets && hasLabels;
      })
      .map(({ chart_id, chart_title, chart_type, data, x_axis, y_axis }) => ({
        id: chart_id,
        name: chart_title,
        type: chart_type,
        data,
        x_axis,
        y_axis,
      }));

    // 8) Update state
    setCharts(visibleCharts);
    setKpis(formattedKpis);

    console.log('Final charts:', visibleCharts);
    console.log('Final KPIs:', formattedKpis);

  } catch (err) {
    console.error('Error in selectDataset:', err);
    Swal.fire("Error", "Could not load dataset details", "error");
  } finally {
    setActivePanel(null);
  }
};

  function getFirstAvailablePosition(existingLayouts, w, h, cols) {
    // 1) build a column-height map
    const heights = Array(cols).fill(0);
    existingLayouts.forEach(({ x, y, w: itemW, h: itemH }) => {
      for (let col = x; col < x + itemW; col++) {
        heights[col] = Math.max(heights[col], y + itemH);
      }
    });

    // 2) slide a window of width `w` over those columns
    let bestX = 0;
    let bestY = Infinity;
    for (let start = 0; start <= cols - w; start++) {
      const windowCols = heights.slice(start, start + w);
      const yCandidate = Math.max(...windowCols);
      if (yCandidate < bestY) {
        bestY = yCandidate;
        bestX = start;
      }
    }

    return { x: bestX, y: bestY };
  }

  // Inside DashboardPage component

  const addWidgetToCanvas = (item, type) => {
    // Prevent duplicates
    const alreadyExists = widgets.some(
      (w) => w.type === type && w.data.id === item.id
    );
    if (alreadyExists) return;

    // Generate a unique key for this widget
    const newKey = `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Default size + enforce minimum size
    const defaultSize =
      type === "chart"
        ? { w: 6, h: 10, minW: 4, minH: 10 } // charts: at least 4×10
        : { w: 3, h: 4, minW: 3, minH: 3 }; // KPIs: at least 3×3

    // Find a spot on the grid that fits
    const { x, y } = getFirstAvailablePosition(
      widgets.map((w) => w.layout),
      defaultSize.w,
      defaultSize.h,
      12
    );

    // Build the layout object, including minW/minH
    const newLayout = {
      i: newKey,
      x,
      y,
      w: defaultSize.w,
      h: defaultSize.h,
      minW: defaultSize.minW,
      minH: defaultSize.minH,
    };

    // Create the widget entry
    const newWidget = {
      key: newKey,
      type,
      data: item,
      layout: newLayout,
    };

    // Add it to state
    setWidgets((prev) => [...prev, newWidget]);
  };

  // Remove widget
  const removeWidget = (keyToRemove) => {
    setWidgets((prev) => prev.filter((w) => w.key !== keyToRemove));
  };

  // Layout change handler
  const onLayoutChange = (newLayout) => {
    setWidgets((prev) =>
      prev.map((w) => {
        const updated = newLayout.find((l) => l.i === w.key);
        if (updated) {
          return {
            ...w,
            layout: { ...updated },
          };
        }
        return w;
      })
    );
  };

  // Save dashboard
  const saveDashboard = async () => {
    if (widgets.length === 0) {
      Swal.fire("Info", "Add at least one widget before saving.", "info");
      return;
    }

    // Confirm before saving
    const { isConfirmed } = await Swal.fire({
      title: "Save Dashboard?",
      text: "Are you sure you want to save this dashboard?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save it",
    });
    if (!isConfirmed) return;

    // Prompt for Dashboard Name
    const { value: dashboardName } = await Swal.fire({
      title: "Enter Dashboard Name",
      input: "text",
      inputPlaceholder: "e.g. Sales Overview",
      inputValidator: (value) => {
        const regex = /^[A-Za-z0-9 ]+$/;
        if (!value || !value.trim()) {
          return "Dashboard name cannot be empty";
        } else if (!regex.test(value)) {
          return "Only letters, numbers, and spaces are allowed.";
        } else if (value.length > 60) {
          return "Maximum 60 characters allowed.";
        }

        return null;
      },
      showCancelButton: true,
    });
    if (!dashboardName) return; // user cancelled

    // Build payload
    const widgetsPayload = widgets.map((w) => ({
      key: w.key,
      type: w.type,
      id: w.data.id,
      layout: {
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
      },
    }));

    const payload = {
      name: dashboardName.trim(),
      widgets: widgetsPayload,
    };
const token = localStorage.getItem("accessToken");
  if (!token) {
    toast.error("Auth Error: No access token found.");
    return;
  }

  const dbToken = localStorage.getItem("db_token");
  if (!dbToken) {
    toast.error("Auth Error: No DB token found.");
    return;
  }
    try {
      console.log("Saving payload:", payload);

      const resp = await fetch(`${authUrl.BASE_URL}/dashboard/layout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
         },
        body: JSON.stringify(payload),
      });
      console.log(resp);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      await Swal.fire("Saved!", "Your dashboard has been saved.", "success");
      navigate("/dashboards");
    } catch (err) {
      console.error("Failed to save dashboard:", err);
      Swal.fire("Error", err.message || err, "error");
    }
  };

  // Reset dashboard
  const resetDashboard = () => {
    Swal.fire({
      title: "Reset Dashboard?",
      text: "This will clear selected dataset and all widgets. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reset",
    }).then((result) => {
      if (result.isConfirmed) {
        setSelectedDatasetId(null);
        setCharts([]);
        setKpis([]);
        setWidgets([]);
        setActivePanel(null);
      }
    });
  };

  // Render widget
  const renderWidget = (widget) => {
    const { key, type, data } = widget;

    return (
      <div
        key={key}
        className="relative bg-white rounded overflow-hidden h-full flex flex-col"
      >
        {/* Remove icon */}
        <div
          className="absolute top-2 right-2 z-10 text-gray-500 cursor-pointer"
          onClick={() => removeWidget(key)}
        >
          <RxCross2 size={20} />
        </div>

        {type === "chart" ? (
          <>
            {/* Drag handle / header */}
            <div className="border-b flex gap-3 items-center border-gray-200 px-2 py-3 font-medium">
              <RiDraggable className="drag-handle cursor-move" />
              {data.name}
            </div>
            {/* Chart container */}
            <div
              className="w-full pt-8"
              style={{
                height: "calc(100% - 32px)",
                boxSizing: "border-box",
                flexGrow: 1,
              }}
            >
              {(() => {
                const idx = widgets.findIndex((w) => w.key === key);
                const options = getHighchartsOptions(data, idx);
                return (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={options}
                    containerProps={{
                      style: { width: "100%", height: "100%" },
                    }}
                  />
                );
              })()}
            </div>
          </>
        ) : (
          // KPI styling
          <div className="flex flex-col relative h-full">
            <RiDraggable className="drag-handle absolute left-3 top-3 cursor-move" />
            <div className="flex-1 p-3 flex flex-col items-center justify-center">
              <div className="text-sm font-medium text-gray-500 uppercase">
                {data.name}
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 flex items-center">
                <span>{data.value}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <aside className="w-[60px] h-[calc(100vh-55px)] fixed flex flex-col items-center py-4 space-y-4 border-r border-gray-200">
        {/* Dataset icon */}
        <div className="flex flex-col items-center">
          <button
            onClick={() =>
              setActivePanel((prev) => (prev === "dataset" ? null : "dataset"))
            }
            className={`p-2 rounded hover:bg-gray-200 ${
              activePanel === "dataset" ? "bg-gray-200" : ""
            }`}
            title="Select Dataset"
          >
            <FiDatabase size={20} className="text-gray-600" />
          </button>
          <span className="text-[10px]">Dataset</span>
        </div>
        {/* Charts icon: disable if no dataset */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              if (selectedDatasetId) {
                setActivePanel((prev) => (prev === "charts" ? null : "charts"));
              } else {
                Swal.fire("Info", "Select a dataset first", "info");
              }
            }}
            className={`p-2 rounded hover:bg-gray-200 ${
              activePanel === "charts" ? "bg-gray-200" : ""
            } ${!selectedDatasetId ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Add Charts"
            disabled={!selectedDatasetId}
          >
            <FiBarChart2 size={20} className="text-gray-600" />
          </button>
          <span className="text-[10px]">Add Charts</span>
        </div>
        {/* KPIs icon */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              if (selectedDatasetId) {
                setActivePanel((prev) => (prev === "kpis" ? null : "kpis"));
              } else {
                Swal.fire("Info", "Select a dataset first", "info");
              }
            }}
            className={`p-2 rounded hover:bg-gray-200 ${
              activePanel === "kpis" ? "bg-gray-200" : ""
            } ${!selectedDatasetId ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Add KPIs"
            disabled={!selectedDatasetId}
          >
            <FiTrendingUp size={20} className="text-gray-600" />
          </button>
          <span className="text-[10px]">Add KPI's</span>
        </div>
        <div className="flex-1"></div>
        {/* Reset */}
        <div className="flex flex-col items-center">
          <button
            onClick={resetDashboard}
            className="p-2 rounded hover:bg-gray-200"
            title="Reset Dashboard"
          >
            <FiRefreshCw size={20} className="text-gray-600" />
          </button>
          <span className="text-[10px]">Reset</span>
        </div>
        {/* Save */}
        <div className="flex flex-col items-center">
          <button
            onClick={saveDashboard}
            className={`p-2 rounded hover:bg-gray-200 ${
              widgets.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Save Dashboard"
            disabled={widgets.length === 0}
          >
            <FiSave size={20} className="text-gray-600" />
          </button>
          <span className="text-[10px]">Save</span>
        </div>
      </aside>

      <div className="h-full left-[60px] mt-[55px] max-w-[calc(100%-60px)] min-h-[calc(100vh-55px)] flex relative">
        {/* Main canvas area */}
        <main
          ref={containerRef}
          className="flex-1 bg-[#F4F5F9] p-4 flex flex-col "
        >
          <div className="relative bg-[#F4F5F9] w-full h-full">
            {widgets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 px-4 text-center">
                {selectedDatasetId
                  ? "Click the Charts or KPIs icon on the left to add items to the canvas."
                  : "Click the Dataset icon on the left to begin."}
              </div>
            ) : (
              <GridLayout
                className="layout"
                layout={widgets.map((w) => w.layout)}
                cols={12}
                rowHeight={ROW_HEIGHT}
                onLayoutChange={onLayoutChange}
                draggableHandle=".drag-handle"
                compactType="vertical"
                // We removed fixed maxRows so that grid can expand and parent scrolls
              >
                {widgets.map((widget) => (
                  <div
                    key={widget.key}
                    className="rounded-sm"
                    data-grid={widget.layout}
                  >
                    {renderWidget(widget)}
                  </div>
                ))}
              </GridLayout>
            )}
          </div>
        </main>

        {activePanel && (
          <div
            className="fixed w-[320px] left-[70px] h-[500px] z-30 top-[60px] rounded-lg overflow-hidden drop-shadow-xl flex bg-opacity-50"
            onClick={() => setActivePanel(null)}
          >
            <div
              className="bg-white border border-gray-200 h-full text-gray-600 w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <p className="text-lg font-medium text-gray-800">
                  {activePanel === "dataset"
                    ? "Datasets"
                    : activePanel === "charts"
                    ? "Charts"
                    : "KPIs"}
                </p>
                <button
                  onClick={() => setActivePanel(null)}
                  className="p-1 rounded hover:bg-gray-200"
                  title="Close"
                >
                  <FiX size={20} />
                </button>
              </div>
              {/* Content list */}
              <div className="p-2 h-full overflow-y-auto scrollsettings">
                {activePanel === "dataset" && (
                  <div className="space-y-2">
                    {datasets.length === 0 ? (
                      <div className="p-4 text-gray-400">
                        Loading datasets...
                      </div>
                    ) : (
                      datasets.map((ds) => (
                        <div
                          key={ds.id}
                          onClick={() => selectDataset(ds.id, ds.name)}
                          className={`px-2 py-2 cursor-pointer flex justify-between items-center rounded hover:bg-gray-100 ${
                            selectedDatasetId === ds.id
                              ? "bg-gray-100 text-gray-800"
                              : "text-gray-800"
                          }`}
                        >
                          <span className="truncate">{ds.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activePanel === "charts" && (
                  <div>
                    {!selectedDatasetId ? (
                      <div className="p-4 text-gray-400">
                        Select a dataset first.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {charts.filter(
                          (c) =>
                            !widgets.some(
                              (w) => w.type === "chart" && w.data.id === c.id
                            )
                        ).length > 0 ? (
                          charts
                            .filter(
                              (c) =>
                                !widgets.some(
                                  (w) =>
                                    w.type === "chart" && w.data.id === c.id
                                )
                            )
                            .map((chart) => (
                              <div
                                key={chart.id}
                                onClick={() =>
                                  addWidgetToCanvas(chart, "chart")
                                }
                                className="px-2 py-2 cursor-pointer flex justify-between items-center rounded hover:bg-gray-100 transition"
                              >
                                <div className="flex items-center space-x-2">
                                  <ChartIcon
                                    type={chart.type}
                                    className="text-xl text-gray-600"
                                  />
                                  <span className="font-medium text-gray-800 truncate">
                                    {chart.name}
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="p-4 text-gray-400">
                            No more charts to add.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {activePanel === "kpis" && (
                  <div>
                    {!selectedDatasetId ? (
                      <div className="p-4 text-gray-400">
                        Select a dataset first.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {kpis.filter(
                          (k) =>
                            !widgets.some(
                              (w) => w.type === "kpi" && w.data.id === k.id
                            )
                        ).length > 0 ? (
                          kpis
                            .filter(
                              (k) =>
                                !widgets.some(
                                  (w) => w.type === "kpi" && w.data.id === k.id
                                )
                            )
                            .map((kpi) => (
                              <div
                                key={kpi.id}
                                onClick={() => addWidgetToCanvas(kpi, "kpi")}
                                className="px-2 py-2 cursor-pointer flex justify-between items-center rounded hover:bg-gray-100 transition"
                              >
                                <div className="font-medium text-gray-800 truncate">
                                  {kpi.name}
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="p-4 text-gray-400">
                            No more KPIs to add.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
export default DashboardPage;
