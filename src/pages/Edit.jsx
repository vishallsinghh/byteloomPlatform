// src/pages/edit/index.jsx

import React, { useEffect, useState, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { LuTableOfContents } from "react-icons/lu";
import { FiSave } from "react-icons/fi";
import Swal from "sweetalert2";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { url } from '../config';

const PIE_COLORS = [
  "#FF6384", "#36A2EB", "#FFCE56",
  "#4BC0C0", "#9966FF", "#FF9F40",
];

// Palettes for line/scatter vs others
const LINE_COLORS = ['rgb(207,37,0)', 'rgb(7,164,199)'];
const OTHER_COLORS = [
  'rgb(165, 148, 249)', 'rgb(176, 219, 156)', 'rgb(255, 128, 128)',
  'rgb(148, 181, 249)', 'rgb(185, 178, 219)', 'rgb(249, 165, 148)',
  'rgb(247, 207, 216)', 'rgb(255, 199, 133)', 'rgb(163, 216, 255)',
  'rgb(185, 243, 252)', 'rgb(174, 226, 255)', 'rgb(147, 198, 231)',
  'rgb(254, 222, 255)', 'rgb(244, 191, 191)', 'rgb(255, 217, 192)',
  'rgb(250, 240, 215)', 'rgb(140, 192, 222)', 'rgb(216, 148, 249)',
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
  // ADD: Store original category order from backend
  const [originalCategories, setOriginalCategories] = useState([]);

  const chartid = searchParams.get('chartid');
  const datasetId = searchParams.get('datasetId');

  // load highcharts-more for polar/radar
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("highcharts/highcharts-more")
      .then(mod => {
        const factory = mod.default || mod;
        if (typeof factory === "function") factory(Highcharts);
      })
      .catch(err => console.warn("Failed to load highcharts-more:", err));
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
        // 1) get raw dataset for fieldOptions
        const dsRes = await fetch(`${url.BASE_URL}/dataset/char/${datasetId}`);
        const dsJson = await dsRes.json();
        setDatasetData(dsJson);

        // 2) get chart config + data
        const chRes = await fetch(`${url.BASE_URL}/api/chart/${chartid}/data`);
        const chJson = await chRes.json();
        if (!chJson.data || !chJson.chart_type) {
          setError("Invalid chart data received from backend.");
          return;
        }

        // 3) normalize type
        const typeKey = chJson.chart_type.toLowerCase();
        setChartType(typeKey);

        // 4) normalize y_axis into array of "fn(field)"
        const rawY = chJson.y_axis;
        const parts = Array.isArray(rawY)
          ? rawY
          : (typeof rawY === 'string'
            ? rawY.split(',').map(s => s.trim()).filter(Boolean)
            : []);

        // 5) extract fn & field
        const initY = [];
        const initA = [];
        parts.forEach(item => {
          const m = item.match(/^\s*(\w+)\(([\w_]+)\)\s*$/);
          if (m) {
            initA.push(m[1].toLowerCase());
            initY.push(m[2]);
          }
        });

        // 6) ensure at least 2 series for multi_bar/multi_line
        if ((typeKey === "multi_bar" || typeKey === "multi_line") && initY.length < 2) {
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
        setChartTitle(chJson.chart_title || "");
        setXField(chJson.x_axis);
        
        // **KEY CHANGES: Store original categories and use backend data**
        setOriginalCategories(chJson.data.labels || []);
        setChartData(chJson.data);
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

    // **FIXED: Use original categories order if available, otherwise create new**
    let categories;
    if (originalCategories.length > 0) {
      // Use original order from backend, but filter to only include categories that exist in current data
      const currentCategories = Array.from(new Set(flatRows.map(r => r[xField])));
      categories = originalCategories.filter(cat => currentCategories.includes(cat));
      
      // Add any new categories that weren't in original (in case data changed)
      const newCategories = currentCategories.filter(cat => !originalCategories.includes(cat));
      categories = [...categories, ...newCategories];
    } else {
      // Fallback to current data order
      categories = Array.from(new Set(flatRows.map(r => r[xField])));
    }

    let newChartData;

    if (chartType === "multi_bar" || chartType === "multi_line") {
      // build spec objects, ignore any blank fields
      const specs = yFields
        .map((field, i) => ({ field, agg: aggFns[i] }))
        .filter(s => s.field);

      // one series per spec
      const datasets = specs.map(({ field, agg }) => {
        // group values by category
        const grouped = {};
        flatRows.forEach(r => {
          const key = r[xField];
          const val = Number(r[field]);
          if (!grouped[key]) grouped[key] = [];
          if (!isNaN(val)) grouped[key].push(val);
        });

        // compute the aggregated value for each category IN THE SAME ORDER
        const data = categories.map(cat => {
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
      flatRows.forEach(r => {
        const key = r[xField];
        const val = Number(r[yField]);
        if (!grouped[key]) grouped[key] = [];
        if (!isNaN(val)) grouped[key].push(val);
      });

      // Use the same categories array and map data to it
      const data = categories.map(cat => {
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
  }, [xField, yField, aggFn, yFields, aggFns, datasetData, chartType, userChangedFields, originalCategories]);

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

  function getPalette(typeKey) {
    if (typeKey === "line" || typeKey === "scatter") return LINE_COLORS;
    return OTHER_COLORS;
  }

  function getHighchartsOptions() {
    const typeKey = chartType.toLowerCase();
    const labels = chartData.labels || [];
    // choose palette
    const palette = typeKey === 'pie'
      ? PIE_COLORS
      : (typeKey === 'line' || typeKey === 'scatter')
        ? LINE_COLORS
        : OTHER_COLORS;

    // base options
    const opts = {
      colors: palette,
      chart: {
        type: typeKey === 'bar' ? 'column' : typeKey,
        polar: false
      },
      title: { text: chartTitle },
      xAxis: { categories: labels, title: { text: null } },
      yAxis: {
        title: {
          // hide Y-axis title for multi-series
          text: (typeKey === 'multi_bar' || typeKey === 'multi_line')
            ? null
            : `${aggFn}(${yField})`
        }
      },
      credits: { enabled: false },
      series: [],
      plotOptions: {},
      legend: { enabled: true }
    };

    // —— multi-series case ——
    if (typeKey === 'multi_bar' || typeKey === 'multi_line') {
      opts.chart.type = (typeKey === 'multi_bar') ? 'column' : 'line';
      opts.series = chartData.datasets.map(ds => ({
        name: ds.label,
        data: ds.data
      }));
      return opts;
    }

    // —— single-series case ——
    const ds = chartData.datasets[0] || { label: chartTitle, data: [] };
    const baseSeries = { name: ds.label || chartTitle };

    switch (typeKey) {
      case 'bar':
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = {
          column: {
            borderWidth: 0,
            states: { inactive: { opacity: 0.3 } },
            point: {
              events: {
                mouseOver() {
                  this.series.points.forEach(pt => {
                    if (pt !== this) pt.setState('inactive');
                  });
                },
                mouseOut() {
                  this.series.points.forEach(pt => {
                    if (pt !== this) pt.setState('');
                  });
                }
              }
            }
          }
        };
        break;

      case 'line':
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = {
          line: {
            marker: { enabled: false, fillColor: palette[0] },
            states: { hover: { lineWidthPlus: 1 } }
          }
        };
        break;

      case 'pie':
      case 'doughnut':
        opts.chart.type = 'pie';
        opts.series = [{
          ...baseSeries,
          innerSize: (typeKey === 'doughnut') ? '60%' : undefined,
          data: labels.map((lbl, i) => ({
            name: lbl,
            y: ds.data[i],
            color: palette[i % palette.length]
          }))
        }];
        opts.plotOptions = {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.y}' },
            borderWidth: 2
          }
        };
        break;

      case 'radar':
        opts.chart = { polar: true, type: 'area' };
        opts.pane = { size: '80%' };
        opts.xAxis = {
          categories: labels,
          tickmarkPlacement: 'on',
          lineWidth: 0
        };
        opts.yAxis = {
          gridLineInterpolation: 'polygon',
          lineWidth: 0,
          min: 0
        };
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = { series: { marker: { enabled: false } } };
        break;

      case 'polar':
        opts.chart = { polar: true, type: 'column' };
        opts.xAxis = {
          categories: labels,
          tickmarkPlacement: 'on',
          lineWidth: 0
        };
        opts.yAxis = { min: 0 };
        opts.series = [{ ...baseSeries, data: ds.data }];
        opts.plotOptions = { column: { pointPadding: 0, groupPadding: 0 } };
        break;

      case 'scatter':
        opts.chart = { type: 'scatter', zoomType: 'xy' };
        opts.xAxis = {
          categories: labels,
          type: 'category',
          title: { text: null }
        };
        opts.series = [{
          ...baseSeries,
          data: ds.data.map((value, index) => [index, value]),
          marker: { radius: 4 }
        }];
        opts.plotOptions = {
          scatter: {
            marker: { states: { hover: { radiusPlus: 2 } } }
          }
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
      // build single-series payload
      const payload = {
        chart_title: chartTitle,
        chart_type: chartType,
        x_axis: xField,
        y_axis: `${aggFn}(${yField})`,
      };

      const res = await fetch(
        `${url.BASE_URL}/api/dataset/chart/${chartid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setUserChangedFields(false);
        Swal.fire("Success!", "Chart updated.", "success").then(() =>
          navigate(`/gallery?datasetId=${datasetId}`)
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
      .filter(spec => spec.field);

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
      y_axis: seriesSpecs.map(s => `${s.agg}(${s.field})`),
    };

    // Submit update
    const res = await fetch(
      `${url.BASE_URL}/api/dataset/chart/${chartid}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

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
        <HighchartsReact highcharts={Highcharts} options={getHighchartsOptions()} />
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
              fieldOptions.map(f => (
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

    {/* MAIN CANVAS */}
    <div className="flex-1 ml-[60px] p-6 overflow-auto">
      <h1 className="text-2xl font-semibold mb-6">Edit Chart</h1>
      <div className="bg-white p-6 w-fit mx-auto rounded-xl shadow">
        {error ? <div className="text-red-500">{error}</div> : renderChart()}
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
          onChange={e => {
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
            onChange={e => {
              setXField(e.target.value);
              setUserChangedFields(true);
            }}
            className="w-full py-2 px-3 rounded-md bg-gray-50 border text-gray-800"
          >
            <option value="">Select field</option>
            {fieldOptions.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Y Axes – multi vs single */}
        {(["multi_bar", "multi_line"].includes(chartType)) && (
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
                    onChange={e => {
                      const next = [...yFields];
                      next[idx] = e.target.value;
                      setYFields(next);
                      setUserChangedFields(true);
                    }}
                    className="w-full py-2 px-3 rounded-md border text-gray-800"
                  >
                    <option value="">— select field —</option>
                    {fieldOptions.map(f => (
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
                    onChange={e => {
                      const next = [...aggFns];
                      next[idx] = e.target.value;
                      setAggFns(next);
                      setUserChangedFields(true);
                    }}
                    className="py-2 px-3 rounded-md w-full border text-gray-800"
                  >
                    {["sum", "avg", "count", "max", "min"].map(a => (
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
                onChange={e => {
                  setYField(e.target.value);
                  setUserChangedFields(true);
                }}
                className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800"
              >
                <option value="">Select field</option>
                {fieldOptions.map(f => (
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
                onChange={e => {
                  setAggFn(e.target.value);
                  setUserChangedFields(true);
                }}
                className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800"
              >
                {["sum", "avg", "count", "max", "min"].map(a => (
                  <option key={a} value={a}>
                    {a}
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
