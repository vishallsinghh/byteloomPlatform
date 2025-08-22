import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import Swal from "sweetalert2";
import {
  FiTrash2,
  FiEdit,
  FiDatabase,
  FiX,
  FiMessageSquare,
  FiSend,
} from "react-icons/fi";
import { MdOutlineAddchart } from "react-icons/md";
import { RiRobot2Line } from 'react-icons/ri'
import colorLib from "@kurkle/color";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Highcharts from "highcharts";
import { authUrl, url } from "../config";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HighchartsReact = lazy(() => import("highcharts-react-official"));

function GalleryPage() {
  const navigate = useNavigate();

  // Active dataset ID
  const [selectedId, setSelectedId] = useState(null);
  // Data fetched from API
  const [datasets, setDatasets] = useState([]);
  const [charts, setCharts] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false); // charts & KPIs
  const [pageLoading, setpageLoading] = useState(false);

  // For re-fetching dataset list if needed
  const [refresh, setRefresh] = useState(0);

  // For loading highcharts-more
  const [hcMoreLoaded, setHcMoreLoaded] = useState(false);

  // New: which sidebar panel is open: 'dataset' | 'charts' | 'kpis' | null
  const [activePanel, setActivePanel] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedName, setSelectedName] = useState("dataaaaa");

  const [searchParams /*, setSearchParams*/] = useSearchParams();

  const [explainModalOpen, setExplainModalOpen] = useState(false)
const [explainModalChart, setExplainModalChart] = useState(null)
const [explainLoading, setExplainLoading] = useState(false)
const [explainResponse, setExplainResponse] = useState(null)
const [explainError, setExplainError] = useState(null)
  // Define color palettes
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

  // Utility to transparentize a color
  const transparentize = (value, opacity = 0.5) => {
    const alpha = 1 - opacity;
    return colorLib(value).alpha(alpha).rgbString();
  };

  // Load highcharts-more when in browser
  useEffect(() => {
    if (!hcMoreLoaded) {
      import("highcharts/highcharts-more")
        .then(() => {
          // no factory call needed in v12: the module registers itself
          setHcMoreLoaded(true);
        })
        .catch((err) => {
          console.error("Failed to load highcharts-more:", err);
        });
    }
  }, [hcMoreLoaded]);

  useEffect(() => {
    const id = searchParams.get("datasetId");
    if (id) {
      selectDataset(id);
    }
  }, []);

  // Fetch datasets initially
  useEffect(() => {
    setpageLoading(true);
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
        if (!res.ok) throw new Error(`Network error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        // take the array from json.data (or empty array fallback)
        setLoadingDatasets(false);
        setDatasets(Array.isArray(json.data) ? json.data : []);
      })
      .catch((err) => console.error("Error fetching datasets:", err))
      .finally(() => setpageLoading(false));
  }, [refresh]);

  const changeDataset = (id) => {
    navigate(`/gallery?datasetId=${id}`);
    selectDataset(id);
  };

  // Simplified selectDataset function - test version
  const selectDataset = async (id) => {
    setSelectedId(id);
    setActivePanel(null);
    setCharts([]);
    setKpis([]);
    setLoadingDetails(true);
    const ds = datasets.find((d) => d.id === id);
    setSelectedName(ds ? ds.name : "");

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
      // 1) Fetch KPIs and Charts data
      const [kpisRes, chartsRes] = await Promise.all([
        fetch(`${authUrl.BASE_URL}/dataset/kpis/${id}/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${authUrl.BASE_URL}/dataset/chart/${id}/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!kpisRes.ok || !chartsRes.ok) {
        throw new Error(`Failed to load data for dataset ${id}`);
      }

      const kpisData = await kpisRes.json();
      const chartsData = await chartsRes.json();

      console.log("Raw KPIs data:", kpisData); // Debug log
      console.log("Raw Charts data:", chartsData); // Debug log

      // Extract KPI metadata from the new schema
      const kpiList = kpisData?.data?.kpi || [];

      // Now fetch the actual KPI values using individual API calls
      const kpiValuePromises = kpiList.map(async (kpi) => {
        try {
          const response = await fetch(
            `${authUrl.BASE_URL}/dataset/kpi/${kpi.id}/data/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ db_token: dbToken }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            console.log(`KPI ${kpi.id} result:`, result); // Debug log

            return {
              kpi_id: kpi.id,
              kpi_name: result?.data?.kpi_name || kpi.kpi_name,
              value: result?.data?.value || result?.data?.raw_value || "N/A",
            };
          } else {
            console.error(
              `Failed to fetch KPI ${kpi.id} data:`,
              response.status
            );
          }
        } catch (err) {
          console.error(`Error fetching KPI ${kpi.id}:`, err);
        }

        // Fallback if API call fails
        return {
          kpi_id: kpi.id,
          kpi_name: kpi.kpi_name,
          value: "Error",
        };
      });

      // Wait for all KPI value requests to complete
      const kpiResults = await Promise.allSettled(kpiValuePromises);

      // Extract successful KPI results
      const transformedKpis = kpiResults
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value);

      // Extract chart metadata from the new schema
      const chartList = chartsData?.data?.chart || [];

      // Now fetch the actual chart data using individual API calls
      const chartValuePromises = chartList.map(async (chart) => {
        try {
          const response = await fetch(
            `${authUrl.BASE_URL}/dataset/chart/${chart.id}/data/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ db_token: dbToken }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            console.log(`Chart ${chart.id} result:`, result); // Debug log

            // Transform the response to match the expected format
            return {
              chart_id: result?.data?.chart_id || chart.id,
              chart_title: result?.data?.chart_title || chart.chart_title,
              chart_type: result?.data?.chart_type || chart.chart_type,
              x_axis: result?.data?.x_axis || chart.x_axis,
              y_axis: result?.data?.y_axis || chart.y_axis,
              data: result?.data?.data || null, // This contains labels and datasets
            };
          } else {
            console.error(
              `Failed to fetch chart ${chart.id} data:`,
              response.status
            );
          }
        } catch (err) {
          console.error(`Error fetching chart ${chart.id}:`, err);
        }
        return null;
      });

      // Wait for all chart data requests to complete
      const chartResults = await Promise.allSettled(chartValuePromises);

      // Extract successful chart results and filter out heatmaps
      const finalCharts = chartResults
        .filter(
          (r) =>
            r.status === "fulfilled" &&
            r.value &&
            r.value.chart_type !== "heatmap"
        )
        .map((r) => r.value);

      // Update state
      setKpis(transformedKpis);
      setCharts(finalCharts);

      console.log("Final KPIs:", transformedKpis); // Debug log
      console.log("Final Charts:", finalCharts); // Debug log
    } catch (err) {
      console.error("Error in selectDataset:", err);
      Swal.fire("Error", "Could not load dataset details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };
  const handleSendMessage = async()=>{
     const inputElement = document.getElementById("aiInput").value;
      console.log(inputElement);
      const textToSend = inputElement;
      if (!textToSend) return;

      const userMessage = {
        id: Date.now().toString(),
        text: textToSend,
        isUser: true,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, userMessage]);
      setChatInput("");
      setShowSuggestions(false);
      setIsTyping(true);

      try {
        const payload = {
          dataset_name: "dataaaaa",
          dataset_id: selectedId,
          message: textToSend,
        };

        const response = await fetch("https://demo.techfinna.com/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        setIsTyping(false);

        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: result?.reply || "No response from AI.",
          isUser: false,
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        console.error("AI Chat error:", err);
        setIsTyping(false);
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "⚠️ Error contacting AI service.",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }
  }

  const checkState = (input) =>{
    console.log("chatinput", chatInput);
    console.log(`input`, input);
  }

  // Delete a chart by id
  const handleDelete = (chartId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the chart.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        const response = await fetch(
          `${authUrl.BASE_URL}/api/dataset/delete/chart/${chartId}`,
          { method: "DELETE", headers: { "Content-Type": "application/json" } }
        );
        if (!response.ok)
          throw new Error(`Server responded ${response.status}`);
        // Remove from state
        setCharts((prev) => prev.filter((c) => c.id !== chartId));
        setRefresh((prev) => prev + 1);
        Swal.fire("Deleted!", "Your chart has been removed.", "success");
      } catch (err) {
        console.error("Failed to delete chart:", err);
        Swal.fire(
          "Error",
          "There was a problem deleting your chart. Please try again.",
          "error"
        );
      }
    });
  };

  // Delete a dataset
  const handleDeleteDataset = async (ds, e) => {
    e.stopPropagation();
    const { isConfirmed } = await Swal.fire({
      title: `Delete dataset “${ds.name}”?`,
      text: "This will remove all its charts permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
    if (!isConfirmed) return;
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
      const res = await fetch(`${authUrl.BASE_URL}/dataset/delete/${ds.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDatasets((prev) => prev.filter((d) => d.id !== ds.id));
      if (selectedId === ds.id) {
        setSelectedId(null);
        setCharts([]);
        setKpis([]);
      }
      Swal.fire("Deleted!", "Your dataset has been removed.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Unable to delete dataset.", "error");
    }
  };

  // Placeholder for edit action
  const handleEdit = (chart) => {
    const params = new URLSearchParams({
      datasetId: selectedId,
      chartid: chart.chart_id,
    }).toString();

    // either:
    navigate(`/edit?${params}`);
  };
const handleExplainChart = async (chartObj) => { 
  setExplainModalChart(chartObj); 
  setExplainModalOpen(true);
  setExplainLoading(true);
  setExplainResponse(null);
  setExplainError(null);
  
  try {
    const payload = {
      title: chartObj?.chart_title || "Untitled Chart",
      chart_type: chartObj?.chart_type || "unknown",
      x_axis: chartObj?.x_axis || "",
      y_axis: chartObj?.y_axis || "",
      dataset_name: selectedName || `Dataset ${selectedId}`,
      table_name: "dashboard_data",
      data: chartObj?.data?.datasets?.[0]?.data || [],
      labels: chartObj?.data?.labels || []
    };
    
    console.log('Sending payload to AI API:', payload);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("Auth Error: No access token found.");
    }
    const response = await fetch('https://backend.techfinna.com/explain_with_ai/explain_chart/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log('AI API Response:', result);
    
    if (result.success) {
      setExplainResponse(result.data);
    } else {
      throw new Error(result.errors || 'API returned an error');
    }
    
  } catch (error) {
    console.error('Error calling AI API:', error);
    setExplainError(error.message || 'Failed to get AI explanation');
  } finally {
    setExplainLoading(false);
  }
}
  // Compute a type-specific offset array
  const typeOffsets = useMemo(() => {
    const counts = {};
    return charts.map((chart) => {
      const type = chart.chart_type;
      if (!counts[type]) counts[type] = 0;
      const offset = counts[type];
      counts[type] += 1;
      return offset;
    });
  }, [charts]);

  // Build Highcharts options based on chart object and a colorOffset
  const getHighchartsOptions = (chart, colorOffset = 0) => {
    const data = chart.data;
    const type = chart.chart_type;
    const xAxisLabel = chart.x_axis;
    const yAxisLabel = chart.y_axis;
    const labels = Array.isArray(data.labels) ? data.labels : [];

    // Select the appropriate color palette
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

    // Compute rotation offset and rotated palette
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
    };

    // Helper to build series array
    const makeSeries = () => {
      return data.datasets.map((ds, i) => {
        const seriesObj = { name: ds.label ?? `Series ${i + 1}` };

        // Handle different chart types
        if (type === "scatter") {
          // Scatter: treat each pt as {x,y} if object, else [index, value]
          const pts = ds.data
            .map((pt, idx) => {
              if (pt && typeof pt === "object" && "x" in pt && "y" in pt) {
                return [pt.x, pt.y];
              } else {
                // fallback: x=index, y=value
                const y = typeof pt === "number" ? pt : parseFloat(pt);
                if (isNaN(y)) return null;
                return [idx, y];
              }
            })
            .filter((p) => p !== null);
          seriesObj.data = pts;
        } else if (type === "bubble") {
          // Bubble: infer x from numeric labels, y from ds.data values, and z from y (or adjust formula)
          const pts = ds.data
            .map((value, idx) => {
              const label = labels[idx];
              const x = parseFloat(label);
              const y = typeof value === "number" ? value : parseFloat(value);
              if (isNaN(x) || isNaN(y)) {
                return null;
              }
              // Choose z: here we use y directly; you may scale it if needed
              const z = y;
              return { x, y, z };
            })
            .filter((pt) => pt !== null);
          seriesObj.data = pts;
        } else {
          // Default: plain data array
          seriesObj.data = ds.data;
        }

        // Style per type
        if (type === "bar") {
          const baseColor = rotatedColors[i % rotatedColors.length];
          seriesObj.color = baseColor;
          seriesObj.borderColor = baseColor;
          seriesObj.borderWidth = 0;
        } else if (type === "line") {
          const baseColorForChart = rotatedColors[0];
          seriesObj.color = baseColorForChart;
          seriesObj.fillColor = transparentize(baseColorForChart, 0.5);
          seriesObj.marker = { fillColor: baseColorForChart };
        } else if (type === "radar") {
          const baseColor = rotatedColors[i % rotatedColors.length];
          seriesObj.color = baseColor;
          seriesObj.marker = { fillColor: baseColor };
        } else if (type === "polarArea") {
          const baseColor = rotatedColors[i % rotatedColors.length];
          seriesObj.color = transparentize(baseColor);
          seriesObj.borderColor = "#ffffff";
          seriesObj.borderWidth = 1;
        } else if (type === "scatter") {
          const baseColor = rotatedColors[i % rotatedColors.length];
          seriesObj.color = baseColor;
        } else if (type === "bubble") {
          const baseColor = rotatedColors[i % rotatedColors.length];
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

      case "line":
        baseOptions.chart = { type: "line" };
        baseOptions.xAxis = {
          categories: labels,
          title: { text: xAxisLabel },
        };
        baseOptions.yAxis = { title: { text: yAxisLabel } };
        baseOptions.series = makeSeries();
        baseOptions.plotOptions = {
          line: {
            marker: { enabled: false },
            states: { hover: { lineWidthPlus: 1 } },
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
              minPointSize: 10,
              yMin: 0,
              name: chart.chart_name || ds0.label || "Pie",
              data: labels.map((lbl, idx) => {
                const point = {
                  name: lbl,
                  y: ds0.data[idx],
                  color: rotatedColors[idx % rotatedColors.length],
                };
                if (idx === maxIndex) {
                  // leave default sliced/selected if desired
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
              name: chart.chart_name || ds0.label || "Doughnut",
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
          series: {
            marker: {
              enabled: false,
            },
          },
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
              name: chart.chart_name || ds0.label || "Polar Area",
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
        console.log(data);
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
        // fallback smooth area-spline
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
  };
  console.log("123 ", datasets);

  return (
    <>
      <Navbar />
      <div className="h-[calc(100vh-55px)] mt-[55px] flex overflow-hidden">
        {/* Fixed narrow sidebar */}
        <aside className="w-[60px] h-[calc(100vh-55px)] fixed flex flex-col items-center py-4 space-y-4 border-r border-gray-200 bg-white z-20">
          {/* Dataset icon: toggles dataset panel */}
          <div className="flex flex-col items-center">
            <button
              onClick={() =>
                setActivePanel((prev) =>
                  prev === "dataset" ? null : "dataset"
                )
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
          {/* Create New Chart icon */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                if (selectedId) {
                  navigate(
                    `/chart?datasetId=${encodeURIComponent(selectedId)}`
                  );
                } else {
                  Swal.fire("Info", "Please select a dataset first.", "info");
                }
              }}
              className={`p-2 rounded hover:bg-gray-200 ${
                !selectedId ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={selectedId ? "Create New Chart" : "Select a dataset first"}
              disabled={!selectedId}
            >
              <MdOutlineAddchart size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">Add Chart</span>
          </div>
          {/* AI Chatbot icon */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                if (selectedId) {
                  setActivePanel((prev) =>
                    prev === "chatbot" ? null : "chatbot"
                  );
                } else {
                  Swal.fire("Info", "Please select a dataset first.", "info");
                }
              }}
              className={`p-2 rounded hover:bg-gray-200 ${
                !selectedId ? "opacity-50 cursor-not-allowed" : ""
              } ${activePanel === "chatbot" ? "bg-gray-200" : ""}`}
              title={selectedId ? "AI Chatbot" : "Select a dataset first"}
              disabled={!selectedId}
            >
              <FiMessageSquare size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">AI Chat</span>
          </div>
        </aside>

        {activePanel && (
          <div
            className="fixed w-[320px] left-[70px] h-[500px] z-30 top-[60px] rounded-lg overflow-hidden drop-shadow-xl flex bg-black bg-opacity-25"
            onClick={() => setActivePanel(null)}
          >
            <div
              className="bg-white border border-gray-200 text-gray-600 w-full max-h-[500px] overflow-y-auto scrollsettings rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <p className="text-lg font-medium text-gray-800">
                  {activePanel === "dataset" && "Datasets"}
                  {activePanel === "chatbot" && (
                    <>
                      {" "}
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <FiMessageSquare className="text-gray-600 text-xs" />
                        </div>
                        <span className="text-md font-medium text-gray-600">
                          AI Assistant
                        </span>
                      </div>
                    </>
                  )}
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
              <div className="p-2">
                {activePanel === "dataset" && (
                  <div className="space-y-2">
                    {loadingDatasets ? (
                      <div className="space-y-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-5 bg-gray-200 rounded animate-pulse"
                          />
                        ))}
                      </div>
                    ) : (
                      datasets.map((ds) => (
                        <div
                          key={ds.id}
                          onClick={() => changeDataset(ds.id)}
                          className={`px-2 py-2 cursor-pointer flex justify-between items-center rounded hover:bg-gray-100 ${
                            selectedId === ds.id
                              ? "bg-gray-100 text-gray-800"
                              : "text-gray-800"
                          }`}
                        >
                          <span className="truncate">{ds.name}</span>
                          <button
                            onClick={(e) => handleDeleteDataset(ds, e)}
                            className="p-1 hover:text-red-500"
                            title={`Delete ${ds.name}`}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activePanel === "chatbot" && (
                  <div className="flex flex-col h-full">
                    {/* Welcome Message and Suggestions */}
                    {showSuggestions && chatMessages.length === 0 && (
                      <div className="p-4 space-y-4">
                        {/* Welcome Section */}
                        <div className="space-y-3">
                          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                            <p>
                              Ask me anything about your data, charts, or KPIs
                              to get started!
                            </p>
                          </div>
                        </div>

                        {/* Suggestion Buttons */}
                        <div className="space-y-2">
                          <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                            <span className="text-sm text-gray-700">
                              Can you recommend some interesting insights?
                            </span>
                          </button>

                          <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                            <span className="text-sm text-gray-700">
                              Please generate a chart for me.
                            </span>
                          </button>

                          <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                            <span className="text-sm text-gray-700">
                              How do I add more data to my dataset?
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Chat Messages */}
                    {chatMessages.length > 0 && (
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.isUser
                                ? "justify-end"
                                : "items-start space-x-2"
                            }`}
                          >
                            {!message.isUser && (
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <FiMessageSquare className="text-gray-600 text-xs" />
                              </div>
                            )}
                            <div
                              className={`rounded-xl p-3 max-w-[85%] text-sm ${
                                message.isUser
                                  ? "bg-gray-700 text-white"
                                  : "bg-gray-50 text-gray-700 border border-gray-200"
                              }`}
                            >
                              <p className="leading-relaxed">{message.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                          <div className="flex items-start space-x-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <FiMessageSquare className="text-gray-600 text-xs" />
                            </div>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                  <div
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                                    style={{ animationDelay: "0.2s" }}
                                  ></div>
                                  <div
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                                    style={{ animationDelay: "0.4s" }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">
                                  AI is thinking...
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat Input */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          id="aiInput"
                          // value={chatInput}
                          onChange={(e) => checkState(e.target.value)}
                          placeholder="Ask a question or request..."
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
                        />

                        <button
                          onClick={handleSendMessage}
                          
                          className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiSend className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="ml-[60px] pt-6 flex flex-col h-full bg-[#F4F5F9] w-full overflow-y-auto">
          {!selectedId ? (
            <div className="h-full px-6 flex items-center justify-center text-gray-500">
              Select a dataset to load its charts
            </div>
          ) : (
            <>
              {/* KPIs */}
              <h2 className="text-3xl font-bold mb-3 text-gray-700 px-6">
                KPIs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 mb-8">
                {loadingDetails ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 bg-gray-200 rounded-lg animate-pulse"
                    />
                  ))
                ) : kpis.length > 0 ? (
                  kpis
                    .filter((k) => k.kpi_name && k.value)
                    .map((k) => (
                      <div
                        key={k.kpi_id}
                        className="bg-white p-6 flex flex-col items-center justify-center border border-gray-200 rounded-lg shadow-sm"
                      >
                        <div className="text-sm font-medium text-gray-500 uppercase">
                          {k.kpi_name}
                        </div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">
                          {k.value}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full  border rounded-lg p-10 bg-white  text-center text-gray-500">
                    <h4 className="text-2xl">This dataset has no Kpis.</h4>
                  </div>
                )}
              </div>

              {/* Charts grid */}
              <h2 className="text-3xl font-bold mb-3 text-gray-700 px-6">
                Charts
              </h2>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-6 pb-8">
                {loadingDetails ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-64 bg-gray-200 rounded-lg animate-pulse"
                    />
                  ))
                ) : charts.length > 0 ? (
                  charts.map((chart, idx) => {
                    if (
                      !Array.isArray(chart.data.labels) ||
                      chart.data.labels.length === 0 ||
                      !Array.isArray(chart.data.datasets) ||
                      chart.data.datasets.length === 0
                    ) {
                      return null;
                    }

                    const offset = typeOffsets[idx];
                    const options = getHighchartsOptions(chart, offset);

                    return (
                      <div
                        key={chart.chart_id}
                        className="relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                      >
                        {/* Header: title */}
                        <div className="px-4 py-3 border-b pr-[70px] border-gray-200">
                          <h3 className="text-md font-normal text-gray-900">
                            {chart.chart_title ?? "Chart Title"}
                          </h3>
                        </div>

                       {/* Edit/Delete/Explain icons overlay */}
<div className="absolute top-2 right-2 flex items-center gap-2 z-10">
  <button
    onClick={() => handleExplainChart(chart)}
    className="p-1 hover:text-blue-600"
    title="Explain with AI"
  >
    <RiRobot2Line size={18} />
  </button>
  <button
    onClick={() => handleEdit(chart)}
    className="p-1 hover:text-blue-600"
  >
    <FiEdit size={18} />
  </button>
  <button
    onClick={() => handleDelete(chart.chart_id)}
    className="p-1 hover:text-red-600"
  >
    <FiTrash2 size={18} />
  </button>
</div>

                        {/* Chart body */}
                        <div className="p-4 pb-0">
                          <HighchartsReact
                            highcharts={Highcharts}
                            options={options}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full border rounded-lg p-10 bg-white text-center text-gray-500">
                    <h4 className="text-2xl">This dataset has no charts.</h4>

                    <button
                      onClick={() => {
                        if (selectedId) {
                          navigate(
                            `/chart?datasetId=${encodeURIComponent(selectedId)}`
                          );
                        } else {
                          Swal.fire(
                            "Info",
                            "Please select a dataset first.",
                            "info"
                          );
                        }
                      }}
                      className={`p-2 px-3 gap-3 mt-4 bg-pink-600 text-white hover:bg-pink-700 hover:drop-shadow-md mx-auto rounded flex items-center border ${
                        !selectedId ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      title={
                        selectedId
                          ? "Create New Chart"
                          : "Select a dataset first"
                      }
                      disabled={!selectedId}
                    >
                      <MdOutlineAddchart size={20} className="text-white" />
                      Create Chart
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      {/* Explain AI modal */}
      {explainModalOpen && explainModalChart && (
        <div
          className="fixed inset-0 bg-black/20 z-[100] flex items-center justify-center p-4"
          onClick={() => setExplainModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="AI Explanation"
        >
          <div
            className="bg-white w-[600px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden relative border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 px-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiRobot2Line size={18} className="text-blue-600" />
                <span className="font-medium">AI Explanation</span>
              </div>
              <button
                className="p-1.5 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setExplainModalOpen(false)}
                aria-label="Close"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-3rem)]">
              {explainLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-600">Analyzing chart with AI...</div>
                </div>
              )}
              
              {explainError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 text-sm font-medium">Error</div>
                  <div className="text-red-700 text-sm mt-1">{explainError}</div>
                </div>
              )}
              
              {explainResponse && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Analysis</h3>
                    <p className="text-sm text-gray-700">{explainResponse.response}</p>
                  </div>
                  
                  {explainResponse.business_value && explainResponse.business_value.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Business Value</h3>
                      <ul className="space-y-1">
                        {explainResponse.business_value.map((value, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {explainResponse.suggestions && explainResponse.suggestions.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Suggestions</h3>
                      <ul className="space-y-1">
                        {explainResponse.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {explainResponse.caveat && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-yellow-800 text-xs font-medium uppercase tracking-wide">Caveat</div>
                      <div className="text-yellow-700 text-sm mt-1">{explainResponse.caveat}</div>
                    </div>
                  )}
                  
                 
                </div>
              )}
              
              {!explainLoading && !explainError && !explainResponse && (
                <div className="text-sm text-gray-500">
                  Click "Explain with AI" to get insights about this chart.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GalleryPage;
