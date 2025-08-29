// components/chartlayout/draggableChart.jsx

import React, { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMap from "highcharts/modules/map";
import { FaPencilAlt } from "react-icons/fa";
import worldMap from "@highcharts/map-collection/custom/world.geo.json";

// Chart titles lookup
const chartTitles = {
  bar: "Bar Chart",
  line: "Line Chart",
  pie: "Pie Chart",
  doughnut: "Doughnut Chart",
  scatter: "Scatter Chart",
  bubble: "Bubble Chart",
  radar: "Radar Chart",
  polar: "Polar Area Chart",
  multi_bar: "Multi-Bar Chart",
  multi_line: "Multi-Line Chart",
  heatmap: "Heatmap Chart",
  worldmap: "World Map",
  grid: "Grid Chart",
};

// Utility to capitalize title
function capitalizeWords(str) {
  return (str || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Resolve nested field path like "a.b.c"
function getValueByPath(obj, path) {
  return path
    .split(".")
    .reduce((o, p) => (o && o[p] != null ? o[p] : undefined), obj);
}

// Flatten utility for grid view
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

const DraggableChart = ({
  id,
  name,
  type,
  position,
  onMove,
  onResize,
  onRemove,
  data,
  globalFilter,
  appliedFilters = [],
  customData,
  rawData,
  onClick,
  xField,
  yField,
  zField,
  aggFn2,
  selectedColumns,
  yFields = [],
  aggFns = [],
  editableName,
  setEditableName,
}) => {
  const chartRef = useRef(null);
  const [aggFn, setAggFn] = useState(aggFn2);
  const [editing, setEditing] = useState(false);
  const [hcLoaded, setHcLoaded] = useState(false);

  // Load highcharts-more & heatmap
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("highcharts/highcharts-more")
      .then((m) => (m.default || m)(Highcharts))
      .then(() => import("highcharts/modules/heatmap"))
      .then((m) => (m.default || m)(Highcharts))
      .then(() => import("highcharts/modules/map")) // ADD THIS LINE
      .then((m) => (m.default || m)(Highcharts))
      .catch(console.error)
      .finally(() => setHcLoaded(true));
  }, []);

  // Sync aggFn
  useEffect(() => {
    setAggFn(aggFn2);
  }, [aggFn2]);

 


  // Title edit handlers
  const handleTitleClick = () => setEditing(true);
  const handleTitleChange = (e) => setEditableName(e.target.value);
  const handleTitleBlur = () => setEditing(false);
  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") setEditing(false);
  };

  // Global filters
  const applyFilters = (row) => {
    const byRegion = globalFilter.region
      ? row.res_country_name?.en_US === globalFilter.region
      : true;
    const byPartner = globalFilter.product
      ? String(row.res_partner_id) === globalFilter.product
      : true;
    const byMonth = globalFilter.month
      ? row.sale_order_date_order?.startsWith(`2025-${globalFilter.month}`)
      : true;
    const byTime = globalFilter.timeAfter
      ? row.sale_order_date_order?.split(" ")[1] >= globalFilter.timeAfter
      : true;
    return byRegion && byPartner && byMonth && byTime;
  };
  const filtered = (rows) => (rows || []).filter(applyFilters);
 const getByPath = (obj, path) =>
    (path || "").split(".").reduce((o, p) => (o && o[p] != null ? o[p] : undefined), obj);

   function applyAllFilters(rows, filters) {
    if (!filters?.length) return rows || [];
    const norm = (v) => (typeof v === "string" ? v.toLowerCase() : v);
    return (rows || []).filter(row =>
      filters.every(f => {
        const val = getByPath(row, f.column);
        if (val == null) return false;

        if (Array.isArray(f.value) && f.operator === "between") {
          const t = new Date(val).getTime();
          const a = new Date(f.value[0]).getTime();
          const b = new Date(f.value[1]).getTime();
          if (isNaN(t) || isNaN(a) || isNaN(b)) return false;
          return t >= Math.min(a, b) && t <= Math.max(a, b);
        }

        const numVal = Number(val), numCmp = Number(f.value);
        if (!isNaN(numVal) && !isNaN(numCmp)) {
          if (f.operator === "=") return numVal === numCmp;
          if (f.operator === ">") return numVal > numCmp;
          if (f.operator === "<") return numVal < numCmp;
        }

        const sVal = String(val).toLowerCase();
        const sNeedle = String(f.value).toLowerCase();
        if (f.operator === "contains") return sVal.includes(sNeedle);
        if (f.operator === "begins_with") return sVal.startsWith(sNeedle);
        if (f.operator === "ends_with") return sVal.endsWith(sNeedle);

        return norm(val) === norm(f.value);
      })
    );
  }
  // Aggregate helper
  const aggregateField = (rows, field, fn) => {
    if (!xField || !field) return { labels: [], values: [] };
    const groups = {};
    rows.forEach((r) => {
      const key = getValueByPath(r, xField);
      const val = getValueByPath(r, field);
      if (typeof val !== "number") return;
      groups[key] = groups[key] || [];
      groups[key].push(val);
    });
    const entries = Object.entries(groups).map(([k, vals]) => {
      let v = 0;
      if (fn === "sum") v = vals.reduce((a, b) => a + b, 0);
      if (fn === "avg") v = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (fn === "count") v = vals.length;
      if (fn === "max") v = Math.max(...vals);
      if (fn === "min") v = Math.min(...vals);
      return { key: k, value: parseFloat(v.toFixed(2)) };
    });
    entries.sort((a, b) => (a.key < b.key ? -1 : 1));
    return {
      labels: entries.map((e) => e.key),
      values: entries.map((e) => e.value),
    };
  };

  // Determine source rows
  const baseRows =
    customData && rawData
      ? rawData
      : customData?.datasets?.length
        ? []
        : data;
  // step 1: global filters (existing)
  const globallyFiltered = filtered(baseRows);
  // step 2: sidebar-applied filters (new)
  const sourceRows = applyAllFilters(globallyFiltered, appliedFilters);

  // Build flat rows & all columns
  const flatRows = sourceRows.map((r) => flattenObject(r));
  const allColumns = flatRows.length > 0 ? Object.keys(flatRows[0]) : [];

  // Build Highcharts options
  const getOptions = () => {
    const base = {
      chart: { backgroundColor: "transparent", polar: false },
      title: {
        text: capitalizeWords(editableName || name || chartTitles[type]),
        style: { fontWeight: "bold", fontSize: "18px", color: "#1e293b" },
      },
      credits: { enabled: false },
      legend: { enabled: true },
    };

    if (type === "heatmap") {
      // Build your category arrays and data
      const xCats = Array.from(
        new Set(flatRows.map((r) => getValueByPath(r, xField)))
      );
      const yCats = Array.from(
        new Set(flatRows.map((r) => getValueByPath(r, yField)))
      );
      const heatData = [];
      xCats.forEach((xc, xi) => {
        yCats.forEach((yc, yi) => {
          const vals = sourceRows
            .filter(
              (r) =>
                getValueByPath(r, xField) === xc &&
                getValueByPath(r, yField) === yc
            )
            .map((r) => getValueByPath(r, zField))
            .filter((v) => typeof v === "number");
          if (vals.length) {
            const z = vals.reduce((a, b) => a + b, 0);
            heatData.push([xi, yi, parseFloat(z.toFixed(2))]);
          }
        });
      });
      const zs = heatData.map((d) => d[2]);

      return {
        ...base,
        chart: { ...base.chart, type: "heatmap" },
        title: { ...base.title },
        xAxis: { categories: xCats },
        yAxis: { categories: yCats, title: null, reversed: true },

        tooltip: {
          formatter() {
            const xCat = this.series.xAxis.categories[this.point.x];
            const yCat = this.series.yAxis.categories[this.point.y];
            const v = this.point.value;
            return `<b>${xCat}</b> vs <b>${yCat}</b><br/><b>${v}</b>`;
          },
        },

        colorAxis: { min: Math.min(...zs), max: Math.max(...zs) },

        series: [
          {
            type: "heatmap",
            name: `${yField} by ${xField}`,
            borderWidth: 0, // no grid lines
            borderColor: null,
            data: heatData,
            dataLabels: {
              enabled: true,
              formatter() {
                return this.point.value;
              },
            },
            states: {
              hover: {
                brightness: 0.15, // subtle highlight on hover
              },
            },
          },
        ],
      };
    }

  if (type === "worldmap") {
  // 1. Sum backend values per ISO-2 code (lowercase)
  const countryData = {};
  sourceRows.forEach((row) => {
    const code = row.res_country_code?.toLowerCase();
    const val = getValueByPath(row, zField);
    if (code && typeof val === "number") {
      countryData[code] = (countryData[code] || 0) + val;
    }
  });

  // 2. Turn into [ [code, value], … ]
  const mapDataArr = Object.entries(countryData).map(
    ([code, total]) => [code, parseFloat(total.toFixed(2))]
  );

  return {
    credits: { enabled: false },
    chart: {
      map: worldMap,
      type: "map",
      height: "100%"      // ← fill the full container height
    },
    title: { text: "" },
    mapNavigation: { enabled: true },
    colorAxis: { min: 0 },
    tooltip: {
      pointFormat: "<b>{point.name}</b>: {point.value}"
    },
    series: [{
      type: "map",
      mapData: worldMap,
      data: mapDataArr,
      joinBy: ["hc-key", "hc-key"],   // match on GeoJSON’s hc-key (ISO-2)
      name: `${aggFn} of ${zField}`,
      states: { hover: { color: "#BADA55" } },
      dataLabels: { enabled: true, format: "{point.name}" }
    }]
  };
}



    if (type === "pie" || type === "doughnut") {
      const { labels = [], values = [] } = customData?.datasets?.length
        ? { labels: customData.labels, values: customData.datasets[0].data }
        : aggregateField(sourceRows, yField, aggFn);
      return {
        ...base,
        chart: { ...base.chart, type: "pie" },
        plotOptions: {
          pie: {
            innerSize: type === "doughnut" ? "50%" : undefined,
            allowPointSelect: true,
            cursor: "pointer",
            showInLegend: true,
            dataLabels: {
              enabled: true,
              formatter() {
                return `<b>${this.point.name}</b>: ${Highcharts.numberFormat(
                  this.percentage,
                  1
                )}%`;
              },
              distance: 20,
              connectorColor: "#666666",
              style: { color: "#000", textOutline: "none" },
              allowOverlap: true,
            },
          },
        },
        series: [
          {
            name: `${aggFn} of ${yField}`,
            colorByPoint: true,
            data: labels.map((lbl, i) => ({ name: lbl, y: values[i] || 0 })),
          },
        ],
      };
    }

    if (type === "multi_bar") {
      const allSeries = yFields.map((f, i) =>
        aggregateField(sourceRows, f, aggFns[i] || "sum")
      );
      const categories = allSeries[0]?.labels || [];
      const series = allSeries.map((s, i) => ({
        name: yFields[i],
        data: categories.map((_, idx) => s.values[idx] || 0),
      }));
      return {
        ...base,
        chart: { ...base.chart, type: "column" },
        xAxis: { categories },
        yAxis: { title: { text: "Value" } },
        series,
      };
    }

    if (type === "multi_line") {
      const allSeries = yFields.map((f, i) =>
        aggregateField(sourceRows, f, aggFns[i] || "sum")
      );
      const categories = allSeries[0]?.labels || [];
      const series = allSeries.map((s, i) => ({
        name: yFields[i],
        data: categories.map((_, idx) => s.values[idx] || 0),
      }));
      return {
        ...base,
        chart: { ...base.chart, type: "line" },
        xAxis: { categories },
        yAxis: { title: { text: "Value" } },
        series,
      };
    }

    if (type === "bubble") {
      const { labels = [], values = [] } = aggregateField(
        sourceRows,
        yField,
        aggFn
      );
      return {
        ...base,
        chart: { ...base.chart, type: "bubble" },
        plotOptions: { bubble: { sizeBy: "area", minSize: 5, maxSize: "20%" } },
        xAxis: {
          categories: labels, // ← use your xField labels here
          gridLineWidth: 1,
          title: { text: capitalizeWords(xField) }, // ← optional axis title
        },
        tooltip: {
          // ← show category in tooltip
          formatter() {
            const xCat = this.series.xAxis.categories[this.point.x];
            return `<b>${xCat}</b>: ${this.point.y}`;
          },
        },
        series: [
          {
            type: "bubble",
            name: `${aggFn} of ${yField}`,
            data: values.map((v, i) => [i, v, v]),
          },
        ],
      };
    }

    if (type === "radar") {
      const { labels = [], values = [] } = aggregateField(
        sourceRows,
        yField,
        aggFn
      );
      return {
        ...base,
        chart: { ...base.chart, polar: true, type: "line" },
        pane: { size: "80%" },
        xAxis: { categories: labels, tickmarkPlacement: "on", lineWidth: 0 },
        yAxis: {
          gridLineInterpolation: "polygon",
          lineWidth: 0,
          min: 0,
        },
        series: [{ name: `${aggFn} of ${yField}`, data: values }],
      };
    }

    if (type === "polar") {
      const { labels = [], values = [] } = aggregateField(
        sourceRows,
        yField,
        aggFn
      );
      return {
        ...base,
        chart: { ...base.chart, polar: true, type: "column" },
        pane: { size: "80%" },
        xAxis: { categories: labels, tickmarkPlacement: "on", lineWidth: 0 },
        yAxis: {
          gridLineInterpolation: "polygon",
          lineWidth: 0,
          min: 0,
        },
        plotOptions: { column: { pointPlacement: "on" } },
        series: [{ name: `${aggFn} of ${yField}`, data: values }],
      };
    }

    if (type === "bar") {
      const { labels = [], values = [] } = aggregateField(
        sourceRows,
        yField,
        aggFn
      );
      return {
        ...base,
        chart: { ...base.chart, type: "column" },
        xAxis: { categories: labels },
        yAxis: { title: { text: `${aggFn} of ${yField}` } },
        series: [{ name: `${aggFn} of ${yField}`, data: values }],
      };
    }

    const { labels = [], values = [] } = aggregateField(
      sourceRows,
      yField,
      aggFn
    );
    return {
      ...base,
      chart: { ...base.chart, type },
      xAxis: { categories: labels },
      yAxis: { title: { text: `${aggFn} of ${yField}` } },
      series: [{ name: `${aggFn} of ${yField}`, data: values }],
    };
  };

  return (
    <div
      onClick={onClick}
      className="absolute flex flex-col rounded-xl border border-gray-300 bg-white shadow-lg p-4 min-w-[350px] min-h-[280px] z-[1] cursor-grab hover:shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
      }}
      
    >
      {/* Title bar */}
      <div className="flex justify-between items-center mb-2">
        {editing ? (
          <input
            autoFocus
            className="flex-1 border px-1 py-0.5 rounded mr-2"
            value={editableName}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
          />
        ) : (
          <div
            onClick={handleTitleClick}
            className="flex-1 cursor-pointer font-bold underline underline-dotted"
          >
            {editableName}
            <FaPencilAlt size={12} className="inline ml-1 text-gray-500" />
          </div>
        )}
        <button
          onClick={() => onRemove(id)}
          className="text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
      </div>

      {/* Chart / Grid */}
      <div className="flex-1 overflow-auto">
        {type === "grid" ? (
          selectedColumns.length > 0 ? (
            <table className="min-w-full table-auto text-xs border-collapse">
              <thead>
                <tr>
                  {selectedColumns.map((col) => (
                    <th
                      key={col}
                      className="border px-2 py-1 bg-gray-100 font-medium"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flatRows.map((row, i) => (
                  <tr key={i}>
                    {selectedColumns.map((col) => (
                      <td key={col} className="border px-2 py-1">
                        {row[col] != null ? String(row[col]) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No columns selected. Please choose columns in the sidebar.
            </div>
          )
        ) : hcLoaded ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={getOptions()}
            constructorType={type === "worldmap" ? "mapChart" : undefined}
            containerProps={{ style: { width: "100%", height: "100%" } }}
          />
        ) : (
          <div className="text-gray-400">Loading chart…</div>
        )}
      </div>
    </div>
  );
};

export default DraggableChart;
