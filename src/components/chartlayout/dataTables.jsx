import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/router";

export default function DataTables({
  sampleTableData = [],
  selectedChartId,
  charts = [],
  onFieldChange,
  filters = { region: "", product: "", month: "", timeAfter: "" },
  onFilterChange,
  setAggFn2,
  aggFn2,
  id,
  setSelectedChartId,
  editableName,
}) {
  const [searchTab, setSearchTab] = useState("Data & Filters");
  const router = useRouter();

  useEffect(() => {
    if (charts.length > 0) {
      setSelectedChartId(charts[0].id);
    }
  }, [charts, setSelectedChartId]);

  // Flatten nested objects into dot-notation keys
  const flattenObject = (obj, prefix = "") =>
    Object.entries(obj).reduce((acc, [key, val]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(acc, flattenObject(val, newKey));
      } else {
        acc[newKey] = val;
      }
      return acc;
    }, {});

  // Safely derive available field names
  const sampleFields =
    sampleTableData.length > 0
      ? Object.keys(flattenObject(sampleTableData[0]))
      : [];

  // Build unique sets for filters
  const regionSet = {};
  const partnerSet = {};
  const monthSet = {};

  for (let i = 0; i < sampleTableData.length; i++) {
    const d = sampleTableData[i];
    if (d.res_country_name?.en_US) regionSet[d.res_country_name.en_US] = true;
    if (d.res_partner_id) partnerSet[d.res_partner_id] = true;
    if (d.sale_order_date_order) {
      const month = d.sale_order_date_order.slice(5, 7);
      monthSet[month] = true;
    }
  }

  const allRegions = Object.keys(regionSet);
  const allPartners = Object.keys(partnerSet);
  const allMonths = Object.keys(monthSet);

  const selectedChart = charts.find((c) => c.id === selectedChartId);

  const createNewChart = async () => {
    if (!selectedChart?.xField || !selectedChart?.yField) {
      Swal.fire("Error", "Please select both X and Y axis fields.", "error");
      return;
    }

    const response = await fetch(
      "https://demo.techfinna.com/api/dataset/create/chart",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: parseInt(id, 10),
          chart_title: editableName,
          chart_type: selectedChart.type,
          x_axis: selectedChart.xField,
          y_axis: `${aggFn2}(${selectedChart.yField})`,
          aggregation: selectedChart.aggFn || "sum",
        }),
      }
    );

    if (response.status === 201) {
      Swal.fire("Success!", "Chart added", "success").then(() => {
        router.push(`/gallery`);
      });
    } else {
      Swal.fire("Error", "Failed to add chart", "error");
    }
  };

  return (
    <div className="w-60 bg-white dark:bg-gray-900 border-l border-gray-200 text-white dark:border-gray-700 flex flex-col h-full text-sm">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {["Data & Filters"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSearchTab(tab)}
            className={`flex-1 py-2 px-4 text-center border-b-2 ${
              searchTab === tab
                ? "border-blue-500 font-medium"
                : "border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {searchTab === "Data & Filters" && (
        <div className="flex-1 overflow-y-auto">
          {selectedChartId && selectedChart && (
            <>
              <div className="p-3 space-y-3">
                <div>
                  <label className="block mb-1">Country</label>
                  <select
                    value={filters.region || ""}
                    onChange={(e) =>
                      onFilterChange({ ...filters, region: e.target.value })
                    }
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                  >
                    <option value="">All</option>
                    {allRegions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Partner ID</label>
                  <select
                    value={filters.product || ""}
                    onChange={(e) =>
                      onFilterChange({ ...filters, product: e.target.value })
                    }
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                  >
                    <option value="">All</option>
                    {allPartners.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Month</label>
                  <select
                    value={filters.month || ""}
                    onChange={(e) =>
                      onFilterChange({ ...filters, month: e.target.value })
                    }
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                  >
                    <option value="">All</option>
                    {allMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Time After</label>
                  <input
                    type="time"
                    value={filters.timeAfter || ""}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        timeAfter: e.target.value,
                      })
                    }
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-gray-700 mt-2 space-y-3">
                <div>
                  <label className="block text-xs mb-1">X Axis</label>
                  <select
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                    value={selectedChart.xField || ""}
                    onChange={(e) =>
                      onFieldChange(selectedChartId, "xField", e.target.value)
                    }
                  >
                    {sampleFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1">Y Axis</label>
                  <select
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                    value={selectedChart.yField || ""}
                    onChange={(e) =>
                      onFieldChange(selectedChartId, "yField", e.target.value)
                    }
                  >
                    {sampleFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1">Aggregation</label>
                  <select
                    className="w-full p-1.5 rounded bg-gray-800 border border-gray-600"
                    value={selectedChart.aggFn || "sum"}
                    onChange={(e) => {
                      onFieldChange(selectedChartId, "aggFn", e.target.value);
                      setAggFn2(e.target.value);
                    }}
                  >
                    {["sum", "avg", "count", "max", "min"].map((agg) => (
                      <option key={agg} value={agg}>
                        {agg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={createNewChart}
                className="mt-12 mx-auto px-3 cursor-pointer py-1.5 text-sm bg-blue-800 text-white rounded hover:bg-opacity-90 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-save h-4 w-4 mr-2"
                >
                  <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                  <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                </svg>
                Add Chart
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
