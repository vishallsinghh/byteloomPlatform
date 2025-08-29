// pages add chart project 1

import React, { useEffect, useState, useRef } from "react";
import { FaChartBar, FaCheckSquare } from "react-icons/fa";
import { MdOutlineAddchart } from "react-icons/md";
import { LuTableOfContents } from "react-icons/lu";
import { FiSave, FiFilter, FiX } from "react-icons/fi";
import { CiViewTable } from "react-icons/ci";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import worldMap from "@highcharts/map-collection/custom/world.geo.json";
import DraggableChart from "../components/chartlayout/draggableChart";
import Navbar from "../components/Navbar";
import { useSearchParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ChartIcon from "../components/ChartIcon";
import classNames from "classnames";
import { url } from "../config";

const cn = (...classes) => classNames(...classes);
const backendCharts = [];
// Load Highcharts "more" modules (polar, bubble, etc.) + heatmap + map
function useHighchartsMore() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("highcharts/highcharts-more")
      .then((mod) => {
        const factory = mod.default || mod;
        if (typeof factory === "function") factory(Highcharts);
        return import("highcharts/modules/heatmap");
      })
      .then((mod) => {
        const factory = mod.default || mod;
        if (typeof factory === "function") factory(Highcharts);
        return import("highcharts/modules/map");
      })
      .then((mod) => {
        const factory = mod.default || mod;
        if (typeof factory === "function") factory(Highcharts);
      })
      .catch(console.error);
  }, []);
}

// Generate dummy chart options for preview
const getDummyOptions = (type) => {
  const categories = ["A", "B", "C", "D"];
  switch (type) {
    case "bar":
      return {
        credits: { enabled: false },
        chart: { type: "column", height: 200 },
        title: { text: "" },
        xAxis: { categories },
        series: [{ name: "Data", data: [1, 3, 2, 4] }],
      };
    case "multi_bar":
      return {
        credits: { enabled: false },
        chart: { type: "column", height: 200 },
        title: { text: "" },
        xAxis: { categories },
        series: [
          { name: "Series A", data: [1, 3, 2, 4] },
          { name: "Series B", data: [2, 1, 4, 3] },
        ],
      };
    case "line":
      return {
        credits: { enabled: false },
        chart: { type: "line", height: 200 },
        title: { text: "" },
        xAxis: { categories },
        series: [{ name: "Data", data: [2, 4, 3, 5] }],
      };
    case "multi_line":
      return {
        credits: { enabled: false },
        chart: { type: "line", height: 200 },
        title: { text: "" },
        xAxis: { categories },
        series: [
          { name: "Series A", data: [1, 3, 2, 4] },
          { name: "Series B", data: [2, 1, 4, 3] },
        ],
      };
    case "pie":
      return {
        credits: { enabled: false },
        chart: { type: "pie", height: 200 },
        title: { text: "" },
        series: [
          {
            name: "Data",
            data: [
              { name: "A", y: 1 },
              { name: "B", y: 3 },
              { name: "C", y: 2 },
              { name: "D", y: 4 },
            ],
          },
        ],
      };
    case "doughnut":
      return {
        credits: { enabled: false },
        chart: { type: "pie", height: 200 },
        title: { text: "" },
        plotOptions: { pie: { innerSize: "50%" } },
        series: [
          {
            name: "Data",
            data: [
              { name: "A", y: 2 },
              { name: "B", y: 4 },
              { name: "C", y: 1 },
              { name: "D", y: 3 },
            ],
          },
        ],
      };
    case "bubble":
      return {
        credits: { enabled: false },
        chart: { type: "bubble", height: 200 },
        title: { text: "" },
        xAxis: { gridLineWidth: 1 },
        series: [
          {
            data: [
              [1, 9, 63],
              [8, 5, 89],
              [5, 2, 45],
              [3, 7, 30],
            ],
          },
        ],
      };
    case "polar":
      return {
        credits: { enabled: false },
        chart: { polar: true, type: "column", height: 200 },
        title: { text: "" },
        pane: { size: "80%" },
        xAxis: {
          categories,
          tickmarkPlacement: "on",
          lineWidth: 0,
        },
        yAxis: {
          gridLineInterpolation: "polygon",
          lineWidth: 0,
        },
        series: [
          {
            name: "Data",
            data: [1, 3, 2, 4],
            pointPlacement: "on",
          },
        ],
      };
    case "radar":
      return {
        credits: { enabled: false },
        chart: { polar: true, type: "area", height: 200 },
        title: { text: "" },
        pane: { size: "80%" },
        xAxis: {
          categories,
          tickmarkPlacement: "on",
          lineWidth: 0,
        },
        yAxis: {
          gridLineInterpolation: "polygon",
          lineWidth: 0,
        },
        series: [
          {
            name: "Data",
            data: [2, 4, 1, 3],
            pointPlacement: "on",
          },
        ],
      };
    case "grid":
      return {
        dataTable: {
          columns: {
            ID: [1, 2, 3, 4, 5, 6],
            Name: ["Alice", "Bobby", "Charlie", "David", "Eve", "John"],
            Age: [28, 51, 40, 60, 53, 39],
            Department: [
              "HR",
              "Engineering",
              "Sales",
              "Marketing",
              "Finance",
              "Finance",
            ],
            Salary: [50000, 75000, 55000, 85000, 65000, 83000],
            PerformanceScore: [85, 49, 95, 40, 88, 73],
          },
        },
        columnDefaults: {
          cells: {
            formatter: function () {
              const v = this.value,
                id = this.column.id;
              if (typeof v !== "number" || id === "ID") return v;
              const cls = v > 50 ? "highlight" : "";
              return `<span class="box ${cls}">${v}</span>`;
            },
          },
        },
        rendering: { theme: "custom-theme" },
        description: { text: "* Performance Score" },
        columns: [
          {
            id: "ID",
            cells: { className: "hcg-center" },
            header: { format: "" },
          },
          {
            id: "Name",
            cells: { className: "bold" },
          },
          {
            id: "Salary",
            cells: {
              className: "{#if (gt value 80000)}highlight-color{/if}",
              format: "${(divide value 1000):.0f}k",
            },
          },
          {
            id: "PerformanceScore",
            cells: {
              className: "{#if (gt value 75)}high{else}low{/if}-color bold",
            },
            header: { format: "PS (0-100) *" },
          },
        ],
      };
    case "heatmap":
      const xCats = Array.from({ length: 10 }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      const yCats = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
      const heatData = [];
      for (let xi = 0; xi < 10; xi++) {
        for (let yi = 0; yi < 10; yi++) {
          const dx = xi - 4.5,
            dy = yi - 4.5;
          const z = Math.exp(-(dx * dx + dy * dy) / 18) * 100;
          heatData.push([xi, yi, parseFloat(z.toFixed(1))]);
        }
      }
      return {
        credits: { enabled: false },
        chart: { type: "heatmap", height: 200 },
        title: { text: "" },
        xAxis: { categories: xCats },
        yAxis: { categories: yCats, title: null, reversed: true },
        colorAxis: {
          min: 0,
          max: 100,
          stops: [
            [0, "#e0f3f8"],
            [0.5, "#abd9e9"],
            [1, "#74add1"],
          ],
        },
        series: [
          {
            type: "heatmap",
            name: "Value",
            borderWidth: 1,
            data: heatData,
            dataLabels: {
              enabled: true,
              formatter() {
                return this.point.value;
              },
            },
          },
        ],
      };
case "worldmap": {
  const sampleMap = [
    ["in", 120], // India
    ["us", 300], // United States
    ["cn", 250], // China
    ["br", 180], // Brazil
    ["fr", 200]  // France
  ];

  return {
    credits: { enabled: false },
    chart: {
      map: worldMap, 
      type: "map",      // ← explicitly a map chart
      height: 200
    },
    title: { text: "" },
    mapNavigation: { enabled: false },
    colorAxis: { min: 0 },
    series: [{
      type: "map",      // ← map series
      mapData: worldMap,
      data: sampleMap,
      joinBy: ["hc-key","hc-key"],
      name: "Sample Values",
      states: { hover: { color: "#BADA55" } },
      dataLabels: { enabled: true, format: "{point.name}" }
    }]
  };
}


    default:
      return {
        credits: { enabled: false },
        chart: { type: "column", height: 200 },
        title: { text: "" },
        xAxis: { categories },
        series: [{ name: "Data", data: [1, 3, 2, 4] }],
      };
  }
};

const CHART_DESCRIPTIONS = {
  bar: "Bar charts present data as rectangular bars whose lengths are proportional to the values they represent.",
  multi_bar:
    "Multi-bar charts let you compare multiple series side by side across categories.",
  line: "Line charts display data points connected by lines, ideal for showing trends.",
  multi_line:
    "Multi-Line charts let you compare multiple series as separate lines over the same X-axis.",
  pie: "Pie charts divide a circle into slices to illustrate part-to-whole relationships.",
  doughnut: "Doughnut charts are like pie charts but with a hollow center.",
  bubble:
    "Bubble charts plot data points with an additional dimension encoded in the bubble size.",
  polar:
    "Polar area charts plot values as radial segments from a central point.",
  radar: "Radar charts display multivariate data on radiating axes.",
  heatmap:
    "Heatmaps show density or count across two categorical axes as colored grid cells.",
  worldmap: "World maps visualize data across geographical regions.",
  grid: "Grid layout lets you choose fields to display as a table for detailed data inspection.",
};

const VISUALIZE = [
  { type: "bar", name: "Bar Chart" },
  { type: "multi_bar", name: "Multi Bar Chart" },
  { type: "line", name: "Line Chart" },
  { type: "multi_line", name: "Multi Line Chart" },
  { type: "pie", name: "Pie Chart" },
  { type: "doughnut", name: "Doughnut Chart" },
  { type: "bubble", name: "Bubble Chart" },
  { type: "polar", name: "Polar Area Chart" },
  { type: "radar", name: "Radar Chart" },
  { type: "heatmap", name: "Heatmap Chart" },
  { type: "worldmap", name: "World Map" },
  { type: "grid", name: "Grid Layout" },
];

function DraggableDashboard() {
  useHighchartsMore();

  const [charts, setCharts] = useState([]);
  const [selectedChartId, setSelectedChartId] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [aggFn2, setAggFn2] = useState("sum");
  const [datasetId, setDatasetId] = useState(null);
  const [editableName, setEditableName] = useState("New Chart");
  const [searchTab, setSearchTab] = useState("Data & Filters");
  const [openBlock, setOpenBlock] = useState("none");
  const [isDirty, setIsDirty] = useState(false);
  const [hoveredType, setHoveredType] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
const [filterDraft, setFilterDraft] = useState({ column: "", operator: "", value: "" });
const [appliedFilters, setAppliedFilters] = useState([]);
  const blockRef = useRef(null);
  const canvasRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Warn on unload
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept navigation
  useEffect(() => {
    const onPop = () => {
      if (!isDirty) return;
      window.history.pushState(null, "", window.location.href);
      Swal.fire({
        title: "Unsaved changes",
        text: "You have unsaved changes. Do you want to leave?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Leave",
        cancelButtonText: "Stay",
      }).then((res) => {
        if (res.isConfirmed) {
          setIsDirty(false);
          window.removeEventListener("popstate", onPop);
          window.history.back();
        }
      });
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isDirty, navigate]);

  // Close popups
  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        blockRef.current &&
        !blockRef.current.contains(e.target) &&
        !e.target.closest(".sidebar-btn")
      ) {
        setOpenBlock("none");
      }
    };
    if (openBlock !== "none") {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openBlock]);

  // Fetch data
  useEffect(() => {
    const id = searchParams.get("datasetId");
    if (!id) return;
    setDatasetId(id);
    const dbToken = localStorage.getItem("db_token");
    const token = localStorage.getItem("accessToken");
    const payload ={
      db_token: dbToken,
      dataset_id: id
    }
    fetch(`${url.BASE_URL}/dataset/dataset1000rows/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Network error");
        return r.json();
      })
       .then((payload) => {
   // NEW API returns { message, success, data: [...] }
   const normalized = Array.isArray(payload) ? payload : (payload?.data ?? []);
   setTableData(normalized);
 })
      .catch(console.error);
  }, [searchParams]);

  // Load existing charts
  useEffect(() => {
    const loaded = backendCharts.map((c, i) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      position: { x: 20 + i * 30, y: 20 + i * 30, width: 350, height: 300 },
      customData: c.data,
      rawData: tableData,
      xField: "",
      yField: "",
      aggFn: "sum",
      yFields: c.type.includes("multi") ? [""] : undefined,
      aggFns: c.type.includes("multi") ? ["sum"] : undefined,
      selectedColumns: [],
      orderBy: c.orderBy || "",
    }));
    setCharts(loaded);
  }, [tableData]);
function isChartConfigured(c) {
  if (!c) return false;

  // common helpers
  const has = (v) => v != null && v !== "";

  switch (c.type) {
    case "grid":
      return Array.isArray(c.selectedColumns) && c.selectedColumns.length > 0;

    case "heatmap":
      // X and Y are required; Z optional
      return has(c.xField) && has(c.yField);

    case "worldmap":
      // require country field (xField) + value field (zField)
      return has(c.xField) && has(c.zField);

    case "multi_bar":
    case "multi_line":
      return (
        has(c.xField) &&
        Array.isArray(c.yFields) &&
        c.yFields.length > 0 &&
        c.yFields.every(has)
      );

    default:
      // single-series (bar, line, pie, etc.)
      return has(c.xField) && has(c.yField);
  }
}
const selectedChart = React.useMemo(
    () => charts.find((c) => c.id === selectedChartId),
    [charts, selectedChartId]
  );
  const filtersDisabled = !isChartConfigured(selectedChart);
  // Flatten for field list
  function flattenObject(obj, prefix = "") {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        Object.assign(acc, flattenObject(v, key));
      } else {
        acc[key] = v;
      }
      return acc;
    }, {});
  }
  const sampleFields = tableData?.length
    ? Object.keys(flattenObject(tableData[0]))
    : [];
const flatSampleRow = tableData?.length ? flattenObject(tableData[0]) : {};

// get nested value by path
const getByPath = (obj, path) =>
  path.split(".").reduce((o, p) => (o && o[p] != null ? o[p] : undefined), obj);

// chart fields eligible for filtering (depends on chart type)
const chartFields = React.useMemo(() => {
  const c = charts.find(ch => ch.id === selectedChartId);
  if (!c) return [];
  if (c.type === "grid") return c.selectedColumns || [];
  if (c.type === "heatmap") return [c.xField, c.yField, c.zField].filter(Boolean);
  if (c.type === "worldmap") return [c.xField, c.zField].filter(Boolean);
  if (c.type === "multi_bar" || c.type === "multi_line") return [c.xField, ...(c.yFields || [])].filter(Boolean);
  return [c.xField, c.yField].filter(Boolean);
}, [charts, selectedChartId]);

// keep only ones that actually exist in flattened rows
const availableFilterFields = chartFields.filter(f =>
  Object.prototype.hasOwnProperty.call(flatSampleRow, f)
);

function isOdooDateLike(v) {
  if (v instanceof Date) return true;
  if (typeof v !== "string") return false;

  const s = v.trim();

  // pure date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d)); // UTC to avoid timezone shifts
    return dateObj.getUTCFullYear() === y &&
      dateObj.getUTCMonth() === m - 1 &&
      dateObj.getUTCDate() === d;
  }

  // datetime: YYYY-MM-DD HH:mm:ss(.microsec)?(TZ?)
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/.test(s)) {
    const iso = s.replace(" ", "T");
    const d = new Date(iso.includes("Z") || /[+-]\d{2}/.test(iso) ? iso : iso + "Z");
    return !isNaN(d.getTime());
  }

  return false;
}

function isDateField(col) {
  if (!col || !tableData?.length) return false;
  return tableData.some(row => isOdooDateLike(getByPath(row, col)));
}

function isNumberField(col) {
  if (!col || !tableData?.length) return false;
  return tableData.every(row => {
    const v = getByPath(row, col);
    return v == null || !isNaN(Number(v));
  });
}

function getOperatorOptions(col) {
  if (isNumberField(col)) {
    return [
      { value: "=", label: "=" },
      { value: ">", label: ">" },
      { value: "<", label: "<" },
    ];
  }
  return [
    { value: "contains", label: "Contains" },
    { value: "begins_with", label: "Begins with" },
    { value: "ends_with", label: "Ends with" },
  ];
}




// derive options once per render
const options = availableFilterFields.length ? availableFilterFields : sampleFields;

// if the current column isn't available anymore, fall back to ""
const safeColumnValue = options.includes(filterDraft.column) ? filterDraft.column : "";

// keep filterDraft consistent if options change (optional but recommended)
useEffect(() => {
  if (!options.includes(filterDraft.column)) {
    setFilterDraft({ column: "", operator: "", value: "" });
  }
}, [options.join(","), filterDraft.column]);
  // Add chart
  const addChart = (type) => {
  const w = 550, h = 480;
   const container = canvasRef.current;
    // center the new chart in the canvas:
    const x = container ? (container.clientWidth  - w) / 3 : 0;
    const y = container ? (container.clientHeight - h) / 3 : 0;
   
    const newC = {
      id: `chart-${Date.now()}`,
      name: `${type} Chart`,
      type,
      position: { x, y, width: w, height: h },
      rawData: tableData || [],
      xField: "",
      yField: "",
      zField: "",
      aggFn: "sum",
      yFields: type.includes("multi") ? [""] : undefined,
      aggFns: type.includes("multi") ? ["sum"] : undefined,
      selectedColumns: [],
      orderBy: "",
    };
    setCharts((p) => [...p, newC]);
    setIsDirty(true);
    setOpenBlock("none");
    setSearchTab("Data & Filters");
    setSelectedChartId(newC.id);
  };
  function getOrderByOptions(chart) {
    // start with X
    const opts = [chart.xField];
    // then Y-series, whether single or multi
    if (chart.type === "multi_bar" || chart.type === "multi_line") {
      opts.push(...chart.yFields);
    } else if (chart.type !== "grid" && chart.type !== "worldmap" && chart.type !== "heatmap") {
      // for simple charts
      opts.push(chart.yField);
    }
    // drop blanks and dupes
    return Array.from(new Set(opts.filter((f) => f)));
  }
  const moveChart = (id, pos) =>
    setCharts((p) => p.map((c) => (c.id === id ? { ...c, position: pos } : c)));
  const resizeChart = moveChart;
  const removeChart = (id) => setCharts((p) => p.filter((c) => c.id !== id));

  // Auto-select last added
  useEffect(() => {
    if (charts.length && !selectedChartId) {
      setSelectedChartId(charts[charts.length - 1].id);
    }
  }, [charts, selectedChartId]);

  const onFieldChange = (cid, key, val) =>
    setCharts((p) => p.map((c) => (c.id === cid ? { ...c, [key]: val } : c)));

  // Save to backend
  const createNewChart = async () => {
    const dbToken = localStorage.getItem("db_token");
    const token = localStorage.getItem("accessToken");
    if (
      selectedChart.type !== "grid" &&
      selectedChart.type !== "worldmap" &&
      !selectedChart.xField
    ) {
      return Swal.fire("Error", "Please select an X-axis field.", "error");
    }
    if (
      ["multi_bar", "multi_line"].includes(selectedChart.type) &&
      (!selectedChart.yFields ||
        selectedChart.yFields.length === 0 ||
        selectedChart.yFields.some((f) => !f))
    ) {
      return Swal.fire(
        "Error",
        "Please select at least one Y-axis field.",
        "error"
      );
    }
    if (
      selectedChart.type === "grid" &&
      (!selectedChart.selectedColumns ||
        selectedChart.selectedColumns.length === 0)
    ) {
      return Swal.fire(
        "Error",
        "Please select at least one column to display.",
        "error"
      );
    }

    let payload;
    if (selectedChart.type === "grid") {
      payload = {
        db_token: dbToken,
        dataset_id: parseInt(datasetId, 10),
        chart_title: editableName,
        chart_type: "grid",
        columns: selectedChart.selectedColumns,
      };
    } else if (["multi_bar", "multi_line"].includes(selectedChart.type)) {
      payload = {
        db_token: dbToken,
        dataset_id: parseInt(datasetId, 10),
        chart_title: editableName,
        chart_type: selectedChart.type,
        x_axis: selectedChart.xField,
        y_axis: selectedChart.yFields.map(
          (f, i) => `${selectedChart.aggFns[i] || "sum"}(${f})`
        ),
      };
    } else {
      payload = {
        db_token: dbToken,
        dataset_id: parseInt(datasetId, 10),
        chart_title: editableName,
        chart_type: selectedChart.type,
        x_axis: selectedChart.xField,
        y_axis: `${selectedChart.aggFn}(${selectedChart.yField})`,
      };
    }
// include order_by if user picked it
if (selectedChart.orderBy) {
  payload.order_by = selectedChart.orderBy;
}
if (appliedFilters.length) {
  payload.filter = JSON.stringify(appliedFilters);
}
    
    try {
      const res = await fetch(`${url.BASE_URL}/dataset/create/chart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        setIsDirty(false);
        Swal.fire("Success!", "Chart added", "success").then(() =>
          navigate(`/view-dashboard?id=${datasetId}`)
        );
      } else {
        const errorText = await res.text();
        Swal.fire(
          "Error",
          `Failed to add chart: ${errorText}

      `,
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Network error while saving chart.", "error");
    }
  };

  const filters = { region: "", product: "", month: "", timeAfter: "" };

  return (
    <>
      <Navbar />
      {!tableData ? (
        <div className="text-center mt-32 text-gray-600">Loading data...</div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="draggable-dashboard mt-[55px] h-[calc(100vh-55px)] flex relative overflow-hidden bg-gray-200">
            {/* LEFT SIDEBAR */}
            <aside className="w-[60px] fixed h-full flex flex-col items-center py-4 space-y-4 border-r border-gray-200 bg-white z-20">
              {/* Add, Fields, Save */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center">
                  <button
                    className={cn(
                      "sidebar-btn p-2 rounded hover:bg-gray-200",
                      openBlock === "add" && "opacity-50 cursor-not-allowed"
                    )}
                    title="Add Chart"
                    disabled={charts.length >= 1}
                    onClick={() =>
                      setOpenBlock(openBlock === "add" ? "none" : "add")
                    }
                  >
                    <MdOutlineAddchart size={20} className="text-gray-600" />
                  </button>
                  <span className="text-[10px]">Add Chart</span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    className={cn(
                      "sidebar-btn p-2 rounded hover:bg-gray-200",
                      openBlock === "fields" && "opacity-50 cursor-not-allowed"
                    )}
                    title="Show Available Fields"
                    onClick={() =>
                      setOpenBlock(openBlock === "fields" ? "none" : "fields")
                    }
                  >
                    <LuTableOfContents size={20} className="text-gray-600" />
                  </button>
                  <span className="text-[10px]">Fields</span>
                </div>
                <div className="flex flex-col items-center">
  <button
    className={cn(
      "p-2 rounded",
      filtersDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200"
    )}
    onClick={() => {
      if (!filtersDisabled) setFilterPanelOpen(true);
    }}
    title={filtersDisabled ? "Configure the chart first" : "Filters"}
    disabled={filtersDisabled}
  >
    <FiFilter size={20} className="text-gray-600" />
  </button>
  <span className="text-[10px]">Filters</span>
</div>
                <div className="flex flex-col items-center">
                  <button
                    className="p-2 rounded hover:bg-gray-200"
                    onClick={createNewChart}
                    title="Save Chart"
                  >
                    <FiSave size={20} className="text-gray-600" />
                  </button>
                  <span className="text-[10px]">Save</span>
                </div>
              </div>

              {/* Add Chart Popup */}
              {openBlock === "add" && (
                <div
                  ref={blockRef}
                  className="left-56 top-[-150px] z-50 w-96 h-[480px] max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 relative flex flex-col"
                >
                  <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg mb-6">
                    Add Chart
                    <button
                      className="ml-auto text-gray-400 hover:text-gray-600 text-2xl"
                      onClick={() => setOpenBlock("none")}
                    >
                      ×
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      {VISUALIZE.map((chart) => (
                        <button
                          key={chart.type}
                          onMouseEnter={() => setHoveredType(chart.type)}
                          onMouseLeave={() => setHoveredType(null)}
                          onClick={() => addChart(chart.type)}
                          className="px-2 py-2 flex gap-2 items-center rounded hover:bg-gray-100"
                        >
                          <ChartIcon
                            type={chart.type}
                            className="text-xl text-gray-600"
                          />
                          <span className="text-sm text-gray-600 font-semibold">
                            {chart.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Explanation Box */}
                  {hoveredType && (
                    <div className="absolute top-0 left-full ml-4 w-96 h-80 bg-white rounded shadow-lg border border-gray-200 z-50 p-4 overflow-auto">
                      {hoveredType === "grid" ? (
                        <div className="overflow-auto h-[160px]">
                          <table className="min-w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className="border px-2 py-1 bg-blue-100 font-medium text-left">
                                  Name
                                </th>
                                <th className="border px-2 py-1 bg-blue-100 font-medium text-right">
                                  Amount
                                </th>
                                <th className="border px-2 py-1 bg-blue-100 font-medium text-center">
                                  Date
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="bg-gray-50">
                                <td className="border px-2 py-1">Alice</td>
                                <td className="border px-2 py-1 text-right">
                                  1,234.56
                                </td>
                                <td className="border px-2 py-1 text-center italic">
                                  2025-07-16
                                </td>
                              </tr>
                              <tr>
                                <td className="border px-2 py-1">Bob</td>
                                <td className="border px-2 py-1 text-right">
                                  7,890.12
                                </td>
                                <td className="border px-2 py-1 text-center italic">
                                  2025-07-17
                                </td>
                              </tr>
                              <tr>
                                <td className="border px-2 py-1">Charlie</td>
                                <td className="border px-2 py-1 text-right">
                                  4,590.14
                                </td>
                                <td className="border px-2 py-1 text-center italic">
                                  2025-07-1
                                </td>
                              </tr>
                              <tr>
                                <td className="border px-2 py-1">Adams</td>
                                <td className="border px-2 py-1 text-right">
                                  890.36
                                </td>
                                <td className="border px-2 py-1 text-center italic">
                                  2025-07-18
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <HighchartsReact
                          highcharts={Highcharts}
                          constructorType={hoveredType === "worldmap" ? "mapChart" : undefined}
                          options={getDummyOptions(hoveredType)}
                        />
                      )}
                      <p className="mt-2 text-xs text-gray-600">
                        {CHART_DESCRIPTIONS[hoveredType]}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Fields Popup */}
              {openBlock === "fields" && (
                <div
                  ref={blockRef}
                  className="absolute left-[70px] z-50 w-96 h-[480px] max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 flex flex-col"
                >
                  <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg mb-6">
                    Available Fields
                    <button
                      className="ml-auto text-gray-400 hover:text-gray-600 text-2xl"
                      onClick={() => setOpenBlock("none")}
                    >
                      ×
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <p className="font-medium mb-2 text-sm text-gray-700">
                      Fields in Dataset
                    </p>
                    {sampleFields.length === 0 ? (
                      <div className="text-gray-400 text-xs">
                        No fields found
                      </div>
                    ) : (
                      sampleFields.map((field) => (
                        <div
                          key={field}
                          className="text-xs bg-gray-100 px-3 py-2 rounded mb-2 text-gray-800 border border-gray-200"
                        >
                          {field}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
            </aside>
{filterPanelOpen && (
  <div className="fixed top-[60px] left-[70px] w-[300px] h-[600px] z-30 flex bg-opacity-50">
    <div className="bg-white border w-full rounded-lg overflow-hidden drop-shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Filters</h3>
        <button onClick={() => setFilterPanelOpen(false)} className="p-1">
          <FiX size={20} />
        </button>
      </div>
      {/* Body */}
      <div className="w-full">
        {/* Draft row */}
        <div className="flex flex-col gap-2 p-2 bg-gray-100 border-b">
          {/* Column selector */}
          <select
            className="border w-full p-2 rounded"
            value={safeColumnValue}
            onChange={(e) => {
              const col = e.target.value;
              if (isDateField(col)) {
                setFilterDraft({ column: col, operator: "between", value: ["", ""] });
              } else {
                setFilterDraft({ column: col, operator: "", value: "" });
              }
            }}
          >
            <option value="" disabled>Choose column…</option>
            {options.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Date vs Non-date inputs */}
          {isDateField(filterDraft.column) ? (
            <>
              <input
                type="date"
                className="border p-2 py-1.5 w-full rounded"
                value={filterDraft.value[0]}
                onChange={e =>
                  setFilterDraft(fd => ({
                    column: fd.column,
                    operator: "between",
                    value: [e.target.value, fd.value[1]],
                  }))
                }
              />
              <input
                type="date"
                className="border p-2 py-1.5 w-full rounded"
                value={filterDraft.value[1]}
                onChange={e =>
                  setFilterDraft(fd => ({
                    column: fd.column,
                    operator: "between",
                    value: [fd.value[0], e.target.value],
                  }))
                }
              />
              <button
                className="bg-blue-600 w-full text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!filterDraft.value[0] || !filterDraft.value[1]}
                onClick={() => {
                  setAppliedFilters(fs => [
                    ...fs,
                    { column: filterDraft.column, operator: "between", value: filterDraft.value }
                  ]);
                  setFilterDraft({ column: "", operator: "", value: "" });
                }}
              >
                Add
              </button>
            </>
          ) : (
            <>
              <select
                className="border w-full p-2 rounded"
                disabled={!filterDraft.column}
                value={filterDraft.operator}
                onChange={e => setFilterDraft(fd => ({ ...fd, operator: e.target.value }))}
              >
                <option value="" disabled>Select operator…</option>
                {getOperatorOptions(filterDraft.column).map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <input
                className="border p-2 w-full rounded"
                type={isNumberField(filterDraft.column) ? "number" : "text"}
                placeholder="Value…"
                value={filterDraft.value}
                onChange={e => setFilterDraft(fd => ({ ...fd, value: e.target.value }))}
              />
              <button
                className="bg-blue-600 w-full text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!filterDraft.column || !filterDraft.operator || !filterDraft.value}
                onClick={() => {
                  setAppliedFilters(fs => [...fs, filterDraft]);
                  setFilterDraft({ column: "", operator: "", value: "" });
                }}
              >
                Add
              </button>
            </>
          )}
        </div>

        {/* Applied list */}
        <div className="h-[343px] flex flex-col p-2">
          <div className="flex-1 overflow-auto scrollsettings border-b">
            {appliedFilters.length === 0 ? (
              <p className="text-gray-500">No filters added</p>
            ) : (
              appliedFilters.map((f, i) => (
                <div key={i} className="flex justify-between items-center mb-2">
                  <span className="px-2 py-1 bg-gray-100 rounded truncate">
                    {f.column} {f.operator} {Array.isArray(f.value) ? f.value.join(" to ") : String(f.value)}
                  </span>
                  <button
                    className="text-red-600 p-1"
                    onClick={() => setAppliedFilters(fs => fs.filter((_, idx) => idx !== i))}
                  >
                    <FiX />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex justify-between">
            <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setAppliedFilters([])}>
              Clear All
            </button>
            <button className="bg-pink-600 text-white px-4 py-2 rounded" onClick={() => setFilterPanelOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
            {/* Main Canvas */}
            <div ref={canvasRef} className="flex-1 bg-gray-100 relative">
              {charts.length === 0 ? (
                <div className="rounded-md bg-white py-6 px-6 text-gray-800 border-[1px] border-gray-600 border-dashed w-[40%] mx-auto mt-32 text-center">
                  <FaChartBar
                    size={52}
                    className="text-gray-700 mx-auto my-3"
                  />
                  <h2 className="text-gray-800 text-lg mt-4 font-semibold">
                    Build visuals with your data
                  </h2>
                  <p className="text-gray-600">
                    Drag, resize, and configure your charts.
                  </p>
                  <div className="flex justify-evenly w-full items-center py-12">
                    <CiViewTable size={42} className="text-gray-700" />
                    <div className="flex flex-col gap-2 text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaCheckSquare className="text-green-500" />
                        <span>Fields</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaCheckSquare className="text-green-500" />
                        <span>Values</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaCheckSquare className="text-green-500" />
                        <span>Filters</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                charts.map((c) => (
                  <DraggableChart
                    key={c.id}
                    id={c.id}
                    type={c.type}
                    name={c.name}
                    position={c.position}
                    onMove={moveChart}
                    onResize={resizeChart}
                    onRemove={removeChart}
                    data={tableData}
                    rawData={tableData}
                    globalFilter={filters}
                    customData={c.customData}
                    xField={c.xField}
                    yField={c.yField}
                    zField={c.zField}
                    aggFn2={c.aggFn || aggFn2}
                    yFields={c.yFields ?? []}
                    aggFns={c.aggFns ?? []}
                    selectedColumns={c.selectedColumns}
                    onClick={() => setSelectedChartId(c.id)}
                    appliedFilters={appliedFilters}
                    editableName={editableName}
                    setEditableName={setEditableName}
                  />
                ))
              )}
            </div>

            {/* Right Sidebar: Data & Filters */}
            {charts.length > 0 && (
              <div className="relative z-10 w-[300px]">
                <div className="w-full bg-white border-l border-gray-200 text-gray-800 px-2 flex flex-col h-full text-sm">
                  <button
                    onClick={() => setSearchTab("Data & Filters")}
                    className="py-3 text-center border-b border-gray-200 text-lg font-semibold"
                  >
                    Data & Filters
                  </button>
                  {searchTab === "Data & Filters" && selectedChart && (
                    <div className="p-3 mt-2 space-y-4 overflow-y-auto">
                      {selectedChart.type === "grid" ? (
                        /* ————— grid UI unchanged ————— */
                        <>
                          <p className="block font-medium text-xs mb-1">
                            Columns to display
                          </p>
                          <div className="space-y-1 max-h-64 overflow-auto">
                            {sampleFields.map((f) => (
                              <label
                                key={f}
                                className="flex items-center text-xs"
                              >
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={selectedChart.selectedColumns.includes(
                                    f
                                  )}
                                  onChange={() => {
                                    const cols =
                                      selectedChart.selectedColumns.includes(f)
                                        ? selectedChart.selectedColumns.filter(
                                            (c) => c !== f
                                          )
                                        : [...selectedChart.selectedColumns, f];
                                    onFieldChange(
                                      selectedChartId,
                                      "selectedColumns",
                                      cols
                                    );
                                  }}
                                />
                                {f}
                              </label>
                            ))}
                          </div>
                        </>
                      ) : selectedChart.type === "heatmap" ? (
                        /* ————— heatmap: X, Y, Z selectors ————— */
                        <>
                          {/* X Axis */}
                          <div>
                            <label className="block text-xs mb-1">X Axis</label>
                            <select
                              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
                              value={selectedChart.xField}
                              onChange={(e) =>
                                onFieldChange(
                                  selectedChartId,
                                  "xField",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">— select field —</option>
                              {sampleFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Y Axis */}
                          <div>
                            <label className="block text-xs mb-1">Y Axis</label>
                            <select
                              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
                              value={selectedChart.yField}
                              onChange={(e) =>
                                onFieldChange(
                                  selectedChartId,
                                  "yField",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">— select field —</option>
                              {sampleFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Z Axis */}
                          <div>
                            <label className="block text-xs mb-1">Z Axis</label>
                            <select
                              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
                              value={selectedChart.zField}
                              onChange={(e) =>
                                onFieldChange(
                                  selectedChartId,
                                  "zField",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">— select field —</option>
                              {sampleFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : selectedChart.type === "worldmap" ? (
                        /* ————— worldmap: Country (join) + Value selectors ————— */
                        <>
                          {/* Country Field */}
                          <div>
                            <label className="block text-xs mb-1">
                              Country Field
                            </label>
                            <select
                              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
                              value={selectedChart.xField}
                              onChange={(e) =>
                                onFieldChange(
                                  selectedChartId,
                                  "xField",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">— select country field —</option>
                              {sampleFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Value Field */}
                          <div>
                            <label className="block text-xs mb-1">
                              Value Field
                            </label>
                            <select
                              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
                              value={selectedChart.zField}
                              onChange={(e) =>
                                onFieldChange(
                                  selectedChartId,
                                  "zField",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">— select value field —</option>
                              {sampleFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        /* ————— non-heatmap/bar/line/multi series ————— */
                        <>
                          {/* X Axis */}
                          <div>
                            <label className="block text-xs mb-1">X Axis</label>
                            <select
                              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
                              value={selectedChart.xField}
                              onChange={(e) =>
                                onFieldChange(
                                  selectedChartId,
                                  "xField",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">— select field —</option>
                              {sampleFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedChart.type === "multi_bar" ||
                          selectedChart.type === "multi_line" ? (
                            /* ————— multi-series UI unchanged ————— */
                            <>
                              <p className="block text-xs">Y Axis</p>
                              {selectedChart.yFields.map((yF, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col p-2 border relative bg-gray-50 rounded-md space-y-2"
                                >
                                  {/* …your existing multi-series selectors… */}
                                </div>
                              ))}
                              {/* …the rest of your “Add value” button… */}
                                  {/* ————— Order By (multi-series) ————— */}
    <div>
      <label className="block text-xs mb-1">Order By</label>
      <select
        className="w-full py-2 px-3 rounded-md bg-white border text-gray-800"
        value={selectedChart.orderBy}
        onChange={(e) =>
          onFieldChange(selectedChartId, "orderBy", e.target.value)
        }
      >
        <option value="">— select field —</option>
        {getOrderByOptions(selectedChart).map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </div>

                            </>
                          ) : (
                            /* ————— single-series UI ————— */
                            <>
                              {/* Y Axis */}
                              <div>
                                <label className="block text-xs mb-1">
                                  Y Axis
                                </label>
                                <select
                                  className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800"
                                  value={selectedChart.yField}
                                  onChange={(e) =>
                                    onFieldChange(
                                      selectedChartId,
                                      "yField",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">— select field —</option>
                                  {sampleFields.map((f) => (
                                    <option key={f} value={f}>
                                      {f}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Aggregation */}
                              <div>
                                <label className="block text-xs mb-1">
                                  Aggregation
                                </label>
                                <select
                                  className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800"
                                  value={selectedChart.aggFn}
                                  onChange={(e) => {
                                    onFieldChange(
                                      selectedChartId,
                                      "aggFn",
                                      e.target.value
                                    );
                                    setAggFn2(e.target.value);
                                  }}
                                >
                                  {["sum", "avg", "count", "max", "min"].map(
                                    (agg) => (
                                      <option key={agg} value={agg}>
                                        {agg}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                              {/* ————— Order By ————— */}
                              <div>
                                <label className="block text-xs mb-1">Order By</label>
                                <select
                                  className="w-full py-2 px-3 rounded-md bg-white border text-gray-800"
                                  value={selectedChart.orderBy}
                                  onChange={(e) =>
                                    onFieldChange(
                                      selectedChartId,
                                      "orderBy",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">— select field —</option>
                                  {getOrderByOptions(selectedChart).map((field) => (
                                    <option key={field} value={field}>
                                      {field}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DndProvider>
      )}
    </>
  );
}

export default DraggableDashboard;
