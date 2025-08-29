// src/pages/edit/index.jsx

import React, { useEffect, useState, useRef, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { LuTableOfContents } from "react-icons/lu";
import { FiSave, FiFilter, FiX } from "react-icons/fi";
import Swal from "sweetalert2";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { url } from "../config";

const PIE_COLORS = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
];

// Palettes for line/scatter vs others
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

function EditChartDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [datasetData, setDatasetData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState(null);
  const [chartTitle, setChartTitle] = useState("");
  const [xField, setXField] = useState("");
  const [yField, setYField] = useState("");
  const [aggFn, setAggFn] = useState("sum");
  const [yFields, setYFields] = useState([]);
  const [aggFns, setAggFns] = useState([]);
  const [error, setError] = useState("");
  const [userChangedFields, setUserChangedFields] = useState(false);
  const [orderBy, setOrderBy] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({
    column: "",
    operator: "",
    value: "",
  });
  const [appliedFilters, setAppliedFilters] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // ADD: Store original category order from backend
  const [originalCategories, setOriginalCategories] = useState([]);

  const chartid = searchParams.get("chartid");
  const datasetId = searchParams.get("datasetId");

  // load highcharts-more for polar/radar
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("highcharts/highcharts-more")
      .then((mod) => {
        const factory = mod.default || mod;
        if (typeof factory === "function") factory(Highcharts);
      })
      .catch((err) => console.warn("Failed to load highcharts-more:", err));
  }, []);

  // --- UNSAVED CHANGES HANDLING ---

  // Warn on browser/tab close or reload
  useEffect(() => {
    const handler = (e) => {
      if (userChangedFields) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [userChangedFields]);

  // Intercept back/forward navigation
  useEffect(() => {
    const handlePopstate = () => {
      if (!userChangedFields) return;
      window.history.pushState(null, "", window.location.href);
      Swal.fire({
        title: "Unsaved changes",
        text: "You have unsaved changes. Do you really want to leave?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Leave",
        cancelButtonText: "Stay",
      }).then((result) => {
        if (result.isConfirmed) {
          setUserChangedFields(false);
          window.removeEventListener("popstate", handlePopstate);
          window.history.back();
        }
      });
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [userChangedFields]);

  // Intercept internal link clicks
  useEffect(() => {
    const handleLinkClick = (e) => {
      if (!userChangedFields) return;
      const anchor = e.target.closest("a");
      if (
        anchor &&
        anchor.href &&
        anchor.origin === window.location.origin &&
        !anchor.target
      ) {
        e.preventDefault();
        const href = anchor.getAttribute("href");
        Swal.fire({
          title: "Unsaved changes",
          text: "You have unsaved changes. Do you really want to leave?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Leave",
          cancelButtonText: "Stay",
        }).then((res) => {
          if (res.isConfirmed) {
            setUserChangedFields(false);
            navigate(href);
          }
        });
      }
    };
    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [userChangedFields, navigate]);

  // --- END UNSAVED CHANGES HANDLING ---

  // click-outside for fields panel
  const blockRef = useRef(null);
  const [openBlock, setOpenBlock] = useState("none");
  useEffect(() => {
    function onClickOutside(e) {
      if (
        blockRef.current &&
        !blockRef.current.contains(e.target) &&
        !e.target.closest(".sidebar-btn")
      ) {
        setOpenBlock("none");
      }
    }
    if (openBlock !== "none") {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openBlock]);

  useEffect(() => {
    if (!chartid || !datasetId) return;

    async function loadChart() {
      try {
        const dbToken = localStorage.getItem("db_token");
        const token = localStorage.getItem("accessToken");
        // 1) get raw dataset for fieldOptions
        const dsRes = await fetch(`${url.BASE_URL}/dataset/dataset1000rows/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ db_token: dbToken, dataset_id: datasetId }),
        });

        const dsJson = await dsRes.json();
        setDatasetData(Array.isArray(dsJson) ? dsJson : dsJson?.data ?? []);

        // 2) get chart config + data
        const chRes = await fetch(
          `${url.BASE_URL}/dataset/chart/${chartid}/data/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ db_token: dbToken, dataset_id: datasetId }),
          }
        );
        const chJson = await chRes.json();

        // NEW: unwrap { message, success, data: { chart fields..., data: {labels, datasets} } }
        const chartObj = chJson?.data || {};
        const chartDataObj = chartObj?.data || {};

        if (!chartObj.chart_type) {
          setError("Invalid chart data received from backend.");
          return;
        }

        // 3) normalize type
        const typeKey = chartObj.chart_type.toLowerCase();
        setChartType(typeKey);

        // 4) normalize y_axis into array of "fn(field)"
        const rawY = chartObj.y_axis;

        const parts = Array.isArray(rawY)
          ? rawY
          : typeof rawY === "string"
          ? rawY
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        // 5) extract fn & field
        const initY = [];
        const initA = [];
        parts.forEach((item) => {
          const m = item.match(
            /^\s*(\w+)\(\s*(?:DISTINCT\s+)?([\w_]+)\s*\)\s*$/i
          );
          if (m) {
            initA.push(m[1].toLowerCase());
            initY.push(m[2]);
          }
        });

        // 6) ensure at least 2 series for multi_bar/multi_line
        if (
          (typeKey === "multi_bar" || typeKey === "multi_line") &&
          initY.length < 2
        ) {
          while (initY.length < 2) {
            initY.push("");
            initA.push("sum");
          }
        }

        // 7) populate both multi- and single-series state
        setYFields(initY);
        setAggFns(initA);
        if (initY.length === 1) {
          setYField(initY[0]);
          setAggFn(initA[0]);
        }

        // 8) other chart state
        setChartTitle(chartObj.chart_title || "");
        setXField(chartObj.x_axis);

        setOrderBy(chartObj.order_by || "");

        // **KEY CHANGES: Store original categories and use backend data**
        setOriginalCategories(chartDataObj.labels || []);
        setChartData(chartDataObj);
        setUserChangedFields(false);
      } catch (err) {
        console.error(err);
        setError("An error occurred while loading the chart.");
      }
    }

    loadChart();
  }, [chartid, datasetId]);

  // Only re-process data when user changes fields (not on initial load)
  useEffect(() => {
    // Only re-process if user has made changes and we have the necessary data
    if (!userChangedFields || !xField || !datasetData.length) return;

    // helper to flatten nested objects
    function flattenFields(obj) {
      return Object.entries(obj).reduce((acc, [k, v]) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const nested = flattenFields(v);
          Object.entries(nested).forEach(([nk, nv]) => {
            acc[`${k}.${nk}`] = nv;
          });
        } else {
          acc[k] = v;
        }
        return acc;
      }, {});
    }

    // flatten all rows
    const flatRows = datasetData.map(flattenFields);
const rowsToUse = applyFilters(flatRows, appliedFilters);
    // **FIXED: Use original categories order if available, otherwise create new**
    let categories;
    if (originalCategories.length > 0) {
      // Use original order from backend, but filter to only include categories that exist in current data
      const currentCategories = Array.from(new Set(rowsToUse.map(r => r[xField])));
      categories = originalCategories.filter((cat) =>
        currentCategories.includes(cat)
      );

      // Add any new categories that weren't in original (in case data changed)
      const newCategories = currentCategories.filter(
        (cat) => !originalCategories.includes(cat)
      );
      categories = [...categories, ...newCategories];
    } else {
      // Fallback to current data order
      categories = Array.from(new Set(flatRows.map((r) => r[xField])));
    }

    let newChartData;

    if (chartType === "multi_bar" || chartType === "multi_line") {
      // build spec objects, ignore any blank fields
      const specs = yFields
        .map((field, i) => ({ field, agg: aggFns[i] }))
        .filter((s) => s.field);

      // one series per spec
      const datasets = specs.map(({ field, agg }) => {
        // group values by category
        const grouped = {};
        rowsToUse.forEach((r) => {
          const key = r[xField];
          const val = Number(r[field]);
          if (!grouped[key]) grouped[key] = [];
          if (!isNaN(val)) grouped[key].push(val);
        });

        // compute the aggregated value for each category IN THE SAME ORDER
        const data = categories.map((cat) => {
          const arr = grouped[cat] || [];
          if (!arr.length) return 0;
          switch (agg) {
            case "avg":
              return arr.reduce((a, b) => a + b, 0) / arr.length;
            case "count":
              return arr.length;
            case "max":
              return Math.max(...arr);
            case "min":
              return Math.min(...arr);
            default: // sum
              return arr.reduce((a, b) => a + b, 0);
          }
        });

        return {
          label: `${agg}(${field})`,
          data,
        };
      });

      newChartData = { labels: categories, datasets };
    } else {
      // Single-series path
      const grouped = {};
      rowsToUse.forEach((r) => {
        const key = r[xField];
        const val = Number(r[yField]);
        if (!grouped[key]) grouped[key] = [];
        if (!isNaN(val)) grouped[key].push(val);
      });

      // Use the same categories array and map data to it
      const data = categories.map((cat) => {
        const arr = grouped[cat] || [];
        if (!arr.length) return 0;
        switch (aggFn) {
          case "avg":
            return arr.reduce((a, b) => a + b, 0) / arr.length;
          case "count":
            return arr.length;
          case "max":
            return Math.max(...arr);
          case "min":
            return Math.min(...arr);
          default:
            return arr.reduce((a, b) => a + b, 0);
        }
      });

      newChartData = {
        labels: categories,
        datasets: [{ label: `${aggFn}(${yField})`, data }],
      };
    }

    setChartData(newChartData);
  }, [
    xField,
    yField,
    aggFn,
    yFields,
    aggFns,
    datasetData,
    chartType,
    userChangedFields,
    originalCategories,
    appliedFilters
  ]);

  function flattenFields(obj) {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const nested = flattenFields(v);
        Object.entries(nested).forEach(([nk, nv]) => {
          acc[`${k}.${nk}`] = nv;
        });
      } else {
        acc[k] = v;
      }
      return acc;
    }, {});
  }

  const fieldOptions = datasetData.length
    ? Object.keys(flattenFields(datasetData[0]))
    : [];
function parseDateSafe(x) {
  if (!x) return null;
  // support YYYY-MM-DD as UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return new Date(x + "T00:00:00Z");
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * rows: array of already-flattened rows
 * filters: [{ column, operator, value }]
 * operators supported:
 * - contains | begins_with | ends_with  (string)
 * - = | > | <                            (number)
 * - between                              (date; value = [from, to])
 */
function applyFilters(rows, filters) {
  if (!Array.isArray(filters) || filters.length === 0) return rows;

  return rows.filter((row) => {
    return filters.every((f) => {
      const cell = getByPath(row, f.column);

      if (cell == null) return false;

      // date range
      if (f.operator === "between") {
        const [from, to] = Array.isArray(f.value) ? f.value : ["", ""];
        const dCell = parseDateSafe(cell);
        const dFrom = parseDateSafe(from);
        const dTo = parseDateSafe(to);
        if (!dCell || !dFrom || !dTo) return false;
        return dCell >= dFrom && dCell <= dTo;
      }

      // numeric ops
      if (f.operator === "=" || f.operator === ">" || f.operator === "<") {
        const n = Number(cell);
        const t = Number(f.value);
        if (isNaN(n) || isNaN(t)) return false;
        if (f.operator === "=") return n === t;
        if (f.operator === ">") return n > t;
        return n < t;
      }

      // string ops
      const s = String(cell ?? "").toLowerCase();
      const v = String(f.value ?? "").toLowerCase();
      if (f.operator === "contains") return s.includes(v);
      if (f.operator === "begins_with") return s.startsWith(v);
      if (f.operator === "ends_with") return s.endsWith(v);

      // unknown operator → keep row
      return true;
    });
  });
}
  // fields we actually want to filter on:
  const chartFields = useMemo(() => {
    if (chartType === "grid") return selectedColumns;
    if (["multi_bar", "multi_line"].includes(chartType))
      return [xField, ...yFields].filter(Boolean);
    return [xField, yField].filter(Boolean);
  }, [chartType, xField, yField, yFields, selectedColumns]);

  // filter out any that aren’t in your flattened data
  const availableFields = chartFields.filter((f) =>
    Object.prototype.hasOwnProperty.call(datasetData[0] || {}, f)
  );

  const getByPath = (obj, path) =>
    path
      .split(".")
      .reduce((o, p) => (o && o[p] != null ? o[p] : undefined), obj);
  // 2) Turn that into your field‐detector:
  function isOdooDateLike(v) {
    if (v instanceof Date) return true;
    if (typeof v !== "string") return false;

    const s = v.trim();

    // pure date: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d)); // UTC to avoid timezone shifts
      return (
        dateObj.getUTCFullYear() === y &&
        dateObj.getUTCMonth() === m - 1 &&
        dateObj.getUTCDate() === d
      );
    }

    // datetime: YYYY-MM-DD HH:mm:ss(.microsec)?(TZ?)
    if (
      /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/.test(
        s
      )
    ) {
      const iso = s.replace(" ", "T");
      const d = new Date(
        iso.includes("Z") || /[+-]\d{2}/.test(iso) ? iso : iso + "Z"
      );
      return !isNaN(d.getTime());
    }

    return false;
  }

  function isDateField(col) {
    if (!col || !datasetData?.length) return false;
    return datasetData.some((row) => isOdooDateLike(getByPath(row, col)));
  }

  // 3. Numeric test (you already have something similar):
  function isNumberField(col) {
    if (!col) return false;
    return datasetData.every(
      (row) => row[col] == null || !isNaN(Number(row[col]))
    );
  }

  // 4. Operator choices for non-date fields:
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

  function getOrderByOptions() {
    const opts = [];
    if (xField) opts.push(xField);
    if (["multi_bar", "multi_line"].includes(chartType)) {
      opts.push(...(yFields || []));
    } else if (yField) {
      opts.push(yField);
    }
    return Array.from(new Set(opts.filter(Boolean)));
  }

  function getHighchartsOptions() {
    const typeKey = chartType.toLowerCase();
    const labels = chartData.labels || [];
    // choose palette
    const palette =
      typeKey === "pie"
        ? PIE_COLORS
        : typeKey === "line" || typeKey === "scatter"
        ? LINE_COLORS
        : OTHER_COLORS;

    // base options
    const opts = {
      colors: palette,
      chart: {
        type: typeKey === "bar" ? "column" : typeKey,
        polar: false,
      },
      title: { text: chartTitle },
      xAxis: { categories: labels, title: { text: null } },
      yAxis: {
        title: {
          // hide Y-axis title for multi-series
          text:
            typeKey === "multi_bar" || typeKey === "multi_line"
              ? null
              : `${aggFn}(${yField})`,
        },
      },
      credits: { enabled: false },
      series: [],
      plotOptions: {},
      legend: { enabled: true },
    };

    // —— multi-series case ——
    if (typeKey === "multi_bar" || typeKey === "multi_line") {
      opts.chart.type = typeKey === "multi_bar" ? "column" : "line";
      opts.series = chartData.datasets.map((ds) => ({
        name: ds.label,
        data: ds.data,
      }));
      return opts;
    }

    // —— single-series case ——
    const ds = chartData.datasets[0] || { label: chartTitle, data: [] };
    const baseSeries = { name: ds.label || chartTitle };

    switch (typeKey) {
      case "bar":
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = {
          column: {
            borderWidth: 0,
            states: { inactive: { opacity: 0.3 } },
            point: {
              events: {
                mouseOver() {
                  this.series.points.forEach((pt) => {
                    if (pt !== this) pt.setState("inactive");
                  });
                },
                mouseOut() {
                  this.series.points.forEach((pt) => {
                    if (pt !== this) pt.setState("");
                  });
                },
              },
            },
          },
        };
        break;

      case "line":
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = {
          line: {
            marker: { enabled: false, fillColor: palette[0] },
            states: { hover: { lineWidthPlus: 1 } },
          },
        };
        break;

      case "pie":
      case "doughnut":
        opts.chart.type = "pie";
        opts.series = [
          {
            ...baseSeries,
            innerSize: typeKey === "doughnut" ? "60%" : undefined,
            data: labels.map((lbl, i) => ({
              name: lbl,
              y: ds.data[i],
              color: palette[i % palette.length],
            })),
          },
        ];
        opts.plotOptions = {
          pie: {
            allowPointSelect: true,
            cursor: "pointer",
            dataLabels: {
              enabled: true,
              format: "<b>{point.name}</b>: {point.y}",
            },
            borderWidth: 2,
          },
        };
        break;

      case "radar":
        opts.chart = { polar: true, type: "area" };
        opts.pane = { size: "80%" };
        opts.xAxis = {
          categories: labels,
          tickmarkPlacement: "on",
          lineWidth: 0,
        };
        opts.yAxis = {
          gridLineInterpolation: "polygon",
          lineWidth: 0,
          min: 0,
        };
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = { series: { marker: { enabled: false } } };
        break;

      case "polar":
        opts.chart = { polar: true, type: "column" };
        opts.xAxis = {
          categories: labels,
          tickmarkPlacement: "on",
          lineWidth: 0,
        };
        opts.yAxis = { min: 0 };
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = { column: { pointPadding: 0, groupPadding: 0 } };
        break;

      case "scatter":
        opts.chart = { type: "scatter", zoomType: "xy" };
        opts.xAxis = {
          categories: labels,
          type: "category",
          title: { text: null },
        };
        opts.series = [
          {
            ...baseSeries,
            data: ds.data.map((value, index) => [index, value]),
            marker: { radius: 4 },
          },
        ];
        opts.plotOptions = {
          scatter: {
            marker: { states: { hover: { radiusPlus: 2 } } },
          },
        };
        break;
      default:
        opts.series = [{ ...baseSeries, data: ds.data }];
        break;
    }

    return opts;
  }

  async function handleSave() {
    // SINGLE-SERIES VALIDATION
    if (chartType !== "multi_bar" && chartType !== "multi_line") {
      if (!xField) {
        return Swal.fire("Error", "Please select an X-axis field.", "error");
      }
      if (!yField) {
        return Swal.fire("Error", "Please select a Y-axis field.", "error");
      }
      const token = localStorage.getItem("accessToken");
      if (!token) {
        return Swal.fire("Error", "You must be logged in to save.", "error");
      }
      const dbToken = localStorage.getItem("db_token");
      if (!dbToken) {
        return Swal.fire("Error", "Database connection info missing.", "error");
      }
      // build single-series payload
      const payload = {
        chart_title: chartTitle,
        chart_type: chartType,
        x_axis: xField,
        y_axis: `${aggFn}(${yField})`,
        db_token: dbToken,
      };
      if (orderBy) payload.order_by = orderBy;
      const res = await fetch(
        `${url.BASE_URL}/dataset/chart/${chartid}/update/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setUserChangedFields(false);
        Swal.fire("Success!", "Chart updated.", "success").then(() =>
          navigate(`/view-dashboard?id=${datasetId}`)
        );
      } else {
        Swal.fire("Error", "Failed to update chart", "error");
      }

      return;
    }

    // MULTI-SERIES VALIDATION & FILTERING
    // Pair up yFields and aggFns, then drop any with empty field
    const seriesSpecs = yFields
      .map((field, i) => ({ field: field.trim(), agg: aggFns[i] }))
      .filter((spec) => spec.field);

    // Need at least two non-empty series
    if (seriesSpecs.length < 2) {
      return Swal.fire(
        "Error",
        "Please select at least two Y-axis fields.",
        "error"
      );
    }

    // Build payload
    const payload = {
      chart_title: chartTitle,
      chart_type: chartType,
      x_axis: xField,
      y_axis: seriesSpecs.map((s) => `${s.agg}(${s.field})`),
    };

    // Submit update
    const res = await fetch(`${url.BASE_URL}/api/dataset/chart/${chartid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setUserChangedFields(false);
      Swal.fire("Success!", "Chart updated.", "success").then(() =>
        navigate(`/gallery?datasetId=${datasetId}`)
      );
    } else {
      Swal.fire("Error", "Failed to update chart", "error");
    }
  }

  function renderChart() {
    if (!chartData) {
      return <div className="text-gray-400">Loading chart data...</div>;
    }
    return (
      <div className="w-[600px] mx-auto h-[400px]">
        <HighchartsReact
          highcharts={Highcharts}
          options={getHighchartsOptions()}
        />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mt-[55px] h-[calc(100vh-55px)] flex bg-gray-100 text-black">
        {/* LEFT SIDEBAR */}
        <aside className="w-[60px] h-full fixed flex flex-col items-center py-4 space-y-4 border-r border-gray-200 bg-white z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center">
              <button
                className={`sidebar-btn p-2 rounded hover:bg-gray-200 ${
                  openBlock === "fields" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                aria-label="Available Fields"
                title="Available Fields"
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
                className="p-2 rounded hover:bg-gray-200"
                onClick={() => setFilterPanelOpen(true)}
              >
                <FiFilter size={20} className="text-gray-600" />
              </button>
              <span className="text-[10px]">Filters</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="p-2 rounded hover:bg-gray-200"
                onClick={handleSave}
                aria-label="Save Chart"
                title="Save Chart"
              >
                <FiSave size={20} className="text-gray-600" />
              </button>
              <span className="text-[10px]">Save</span>
            </div>
          </div>
          {openBlock === "fields" && (
            <div
              ref={blockRef}
              className="absolute left-[70px] z-50 w-96 max-w-lg h-[470px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 flex flex-col"
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
              <div className="overflow-y-auto scrollsettings pr-2 flex-1">
                {fieldOptions.length === 0 ? (
                  <div className="text-gray-400 text-xs">No fields found</div>
                ) : (
                  fieldOptions.map((f) => (
                    <div
                      key={f}
                      className="text-xs bg-gray-100 px-3 py-1 rounded mb-2 text-gray-800 border border-gray-200"
                    >
                      {f}
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
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="p-1"
                >
                  <FiX size={20} />
                </button>
              </div>
              {/* Body */}
              <div className="w-full">
                {/* Draft row */}
                <div className="flex flex-col h items-center gap-2 p-2 bg-gray-100 border-b">
                  {/* Column selector */}
                  <select
                    className="border w-full p-2 rounded"
                    value={filterDraft.column}
                    onChange={(e) => {
                      const col = e.target.value;
                      if (isDateField(col)) {
                        setFilterDraft({
                          column: col,
                          operator: "between",
                          value: ["", ""],
                        });
                      } else {
                        setFilterDraft({
                          column: col,
                          operator: "",
                          value: "",
                        });
                      }
                    }}
                  >
                    <option value="" disabled>
                      Choose column…
                    </option>
                    {availableFields.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  {isDateField(filterDraft.column) ? (
                    /* ─── DATE RANGE PICKER ───────────────── */
                    <>
                      <input
                        type="date"
                        className="border p-2 py-1.5 w-full rounded"
                        value={filterDraft.value[0]}
                        onChange={(e) =>
                          setFilterDraft((fd) => ({
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
                        onChange={(e) =>
                          setFilterDraft((fd) => ({
                            column: fd.column,
                            operator: "between",
                            value: [fd.value[0], e.target.value],
                          }))
                        }
                      />
                      <button
                        className="bg-blue-600 w-full text-white px-4 py-2 rounded disabled:opacity-50"
                        disabled={
                          !filterDraft.value[0] || !filterDraft.value[1]
                        }
                        onClick={() => {
                          setAppliedFilters((fs) => [
                            ...fs,
                            {
                              column: filterDraft.column,
                              operator: "between",
                              value: filterDraft.value,
                            },
                          ]);
                          setFilterDraft({
                            column: "",
                            operator: "",
                            value: "",
                          });
                        }}
                      >
                        Add
                      </button>
                    </>
                  ) : (
                    /* ─── NON‐DATE FILTER ─────────────────── */
                    <>
                      <select
                        className="border w-full p-2 rounded"
                        disabled={!filterDraft.column}
                        value={filterDraft.operator}
                        onChange={(e) =>
                          setFilterDraft((fd) => ({
                            ...fd,
                            operator: e.target.value,
                          }))
                        }
                      >
                        <option value="" disabled>
                          Select operator…
                        </option>
                        {getOperatorOptions(filterDraft.column).map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="border p-2 w-full rounded"
                        type={
                          isNumberField(filterDraft.column) ? "number" : "text"
                        }
                        placeholder="Value…"
                        value={filterDraft.value}
                        onChange={(e) =>
                          setFilterDraft((fd) => ({
                            ...fd,
                            value: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="bg-blue-600 w-full text-white px-4 py-2 rounded disabled:opacity-50"
                        disabled={
                          !filterDraft.column ||
                          !filterDraft.operator ||
                          !filterDraft.value
                        }
                        onClick={() => {
                          setAppliedFilters((fs) => [...fs, filterDraft]);
                          setFilterDraft({
                            column: "",
                            operator: "",
                            value: "",
                          });
                        }}
                      >
                        Add
                      </button>
                    </>
                  )}
                </div>

                {/* Applied filters list */}
                <div className="h-[343px] flex flex-col p-2">
                  <div className="flex-1 overflow-auto scrollsettings border-b">
                    {appliedFilters.length === 0 ? (
                      <p className="text-gray-500">No filters added</p>
                    ) : (
                      appliedFilters.map((f, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center mb-2"
                        >
                          <span className="px-2 py-1 bg-gray-100 rounded truncate">
                            {f.column} {f.operator}{" "}
                            {Array.isArray(f.value)
                              ? f.value.join(" to ")
                              : f.value}
                          </span>
                          <button
                            className="text-red-600 p-1"
                            onClick={() =>
                              setAppliedFilters((fs) =>
                                fs.filter((_, idx) => idx !== i)
                              )
                            }
                          >
                            <FiX />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex justify-between">
                    <button
                      className="bg-gray-300 px-4 py-2 rounded"
                      onClick={() => setAppliedFilters([])}
                    >
                      Clear All
                    </button>
                    <button
                      className="bg-pink-600 text-white px-4 py-2 rounded"
                      onClick={() => setFilterPanelOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* MAIN CANVAS */}
        <div className="flex-1 ml-[60px] p-6 overflow-auto">
          <h1 className="text-2xl font-semibold mb-6">Edit Chart</h1>
          <div className="bg-white p-6 w-fit mx-auto rounded-xl shadow">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              renderChart()
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="w-80 bg-white border-l border-gray-200 pt-0 space-y-2 overflow-auto scrollsettings text-sm text-gray-800">
          {/* Chart Title */}
          <div className="p-3">
            <label className="block">Chart Title</label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => {
                setChartTitle(e.target.value);
                setUserChangedFields(true);
              }}
              className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
            />
          </div>

          <div className="p-3 pt-0 space-y-5">
            {/* X Axis */}
            <div>
              <label className="block mb-1">X Axis</label>
              <select
                value={xField}
                onChange={(e) => {
                  setXField(e.target.value);
                  setUserChangedFields(true);
                }}
                className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
              >
                <option value="">Select field</option>
                {fieldOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Y Axes – multi vs single */}
            {["multi_bar", "multi_line"].includes(chartType) && (
              <p className="block">Y Axis</p>
            )}

            {["multi_bar", "multi_line"].includes(chartType) ? (
              <>
                {yFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col p-2 border relative bg-gray-50 rounded-md space-y-2"
                  >
                    {/* Y Axis # */}
                    <div className="flex-1">
                      <label className="block text-xs mb-1">
                        Value {idx + 1}
                      </label>
                      <select
                        value={field}
                        onChange={(e) => {
                          const next = [...yFields];
                          next[idx] = e.target.value;
                          setYFields(next);
                          setUserChangedFields(true);
                        }}
                        className="w-full py-2 px-3 rounded-md border text-gray-800"
                      >
                        <option value="">— select field —</option>
                        {fieldOptions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Agg # */}
                    <div>
                      <select
                        value={aggFns[idx]}
                        onChange={(e) => {
                          const next = [...aggFns];
                          next[idx] = e.target.value;
                          setAggFns(next);
                          setUserChangedFields(true);
                        }}
                        className="py-2 px-3 rounded-md w-full border text-gray-800"
                      >
                        {["sum", "avg", "count", "max", "min"].map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove this series (only if you have more than 2) */}
                    {yFields.length > 2 && (
                      <button
                        className="absolute right-1 -top-1 text-red-500 text-lg leading-none"
                        onClick={() => {
                          setYFields(yFields.filter((_, i) => i !== idx));
                          setAggFns(aggFns.filter((_, i) => i !== idx));
                          setUserChangedFields(true);
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}

                {/* Add another Y-series (up to 4) */}
                <button
                  className={`mt-2 block w-full px-4 py-2 rounded-md text-sm font-medium ${
                    yFields.length < 4
                      ? "bg-pink-600 hover:bg-pink-700 text-white"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                  disabled={yFields.length >= 4}
                  onClick={() => {
                    setYFields([...yFields, ""]);
                    setAggFns([...aggFns, "sum"]);
                    setUserChangedFields(true);
                  }}
                >
                  Add value
                </button>
              </>
            ) : (
              /* Single-series fallback */
              <>
                <div>
                  <label className="block mb-1">Y Axis</label>
                  <select
                    value={yField}
                    onChange={(e) => {
                      setYField(e.target.value);
                      setUserChangedFields(true);
                    }}
                    className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800"
                  >
                    <option value="">Select field</option>
                    {fieldOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Aggregation</label>
                  <select
                    value={aggFn}
                    onChange={(e) => {
                      setAggFn(e.target.value);
                      setUserChangedFields(true);
                    }}
                    className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800"
                  >
                    {["sum", "avg", "count", "max", "min"].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Order By</label>
                  <select
                    value={orderBy}
                    onChange={(e) => {
                      setOrderBy(e.target.value);
                      setUserChangedFields(true);
                    }}
                    className="w-full py-2 px-3 rounded-md bg-white border text-gray-800"
                  >
                    <option value="">— select field —</option>
                    {getOrderByOptions().map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default EditChartDashboard;
