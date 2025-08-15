"use client";
import axios from "axios";
import Swal from "sweetalert2";
import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import {
  FiTable,
  FiDatabase,
  FiRefreshCw,
  FiX,
  FiSettings,
  FiCpu,
} from "react-icons/fi";
import "reactflow/dist/style.css";
import Navbar from "../components/Navbar";
import { url, authUrl } from "../config";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Home() {
  const navigate = useNavigate();

  // === State ===
  const [tables, setTables] = useState([]);
  const [pageLoading, setpageLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [openModal, setOpenModal] = useState("response"); // 'response' | 'dataset' | 'modal'
  const [modalTableName, setModalTableName] = useState("");
  const [modalData, setModalData] = useState([]);
  const [sql, setSql] = useState();
  const [selectedTables, setSelectedTables] = useState({});
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [columnSearches, setColumnSearches] = useState({});
  const [bottomHeight, setBottomHeight] = useState(100);
  const [isResizing, setIsResizing] = useState(false);
  const [responseData, setResponseData] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null); // 'sales' | 'inventory' | null
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedDatasets, setSelectedDatasets] = useState(null);
  const [activePanel, setActivePanel] = useState(null); // 'tables' | 'datasets' | null
  const [settingsPanel, setSettingsPanel] = useState(false);
  const [validityLeft, setValidityLeft] = useState();
  const [valid, setValid] = useState(true);
  const [aiTargetColumn, setAiTargetColumn] = useState(null);

  const [presetKeys, setPresetKeys] = useState([]);      // string[]
const [presetsLoading, setPresetsLoading] = useState(false);
const [presetsError, setPresetsError] = useState(null);

  // Separate search terms
  const [tablesSearch, setTablesSearch] = useState("");
  const [datasetsSearch, setDatasetsSearch] = useState("");
const [isAIProcessing, setIsAIProcessing] = useState(false);
const [currentAIStep, setCurrentAIStep] = useState(0); // 0 idle, 1 processing, 2 done
const [aiTargetTable, setAiTargetTable] = useState(null); // table name to highlight
const [aiLoaderMessage, setAiLoaderMessage] = useState("");


  const resizerRef = useRef(null);
// Add this ref to track tables state changes
const tablesRef = useRef(tables);
useEffect(() => {
  tablesRef.current = tables;
}, [tables]);

const waitForTables = () =>
  new Promise((resolve) => {
    if (tablesRef.current && tablesRef.current.length > 0) return resolve();
    const start = Date.now();
    const timer = setInterval(() => {
      if (
        (tablesRef.current && tablesRef.current.length > 0) ||
        Date.now() - start > 10000 // 10 second timeout
      ) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
  });

// Enhanced automation function focusing only on the main table (schema[0])
const simulateAITableSelectionFromPreset = async (presetKey) => {
  try {
    setIsAIProcessing(true);
    setCurrentAIStep(1);
    setAiLoaderMessage("Fetching preset details...");

    // 1) Fetch preset details
    const response = await fetch(
      `https://demo.techfinna.com/api/datasets/presets/${encodeURIComponent(presetKey)}`
    );
    const data = await response.json();
    console.log("Preset response:", data);

    if (!data.schema || typeof data.schema !== 'object') {
      toast.error("Invalid preset schema received");
      return;
    }

    // 2) Get ONLY the main table (first key in schema) - e.g., "sale_order_line"
    const mainTableName = Object.keys(data.schema)[0];
    const mainTableColumns = data.schema[mainTableName];
    
    if (!mainTableName || !mainTableColumns) {
      toast.error("No main table found in preset schema");
      return;
    }

    console.log("Main table identified:", mainTableName);
    console.log("Main table columns:", mainTableColumns);

    // 3) Open Tables panel with visual feedback
    setAiLoaderMessage("Opening Tables panel...");
    setActivePanel("tables");
    await new Promise((r) => setTimeout(r, 800));

    // 4) Wait for tables list to load
    setAiLoaderMessage("Loading tables list...");
    await waitForTables();
    await new Promise((r) => setTimeout(r, 500));

    // 5) Typing animation for table search
    setAiLoaderMessage(`Searching for main table: ${mainTableName}...`);
    setAiTargetTable(mainTableName);
    
    // Clear search field first
    setTablesSearch("");
    await new Promise((r) => setTimeout(r, 300));
    
    // Type each character with natural delays
    for (let i = 0; i <= mainTableName.length; i++) {
      const partialText = mainTableName.substring(0, i);
      setTablesSearch(partialText);
      
      // Variable typing speed for natural feel
      const delay = Math.random() * 120 + 80; // Random delay between 80-200ms
      await new Promise((r) => setTimeout(r, delay));
    }
    
    // Hold the complete search term
    await new Promise((r) => setTimeout(r, 1000));

    // 6) Select the main table and load its metadata
    setAiLoaderMessage(`Loading ${mainTableName} metadata...`);
    await handleTableSelect(mainTableName);
    await new Promise((r) => setTimeout(r, 1500));

    // 7) Now automate column selection for the main table
    setAiLoaderMessage("Selecting relevant columns...");
    await automateColumnSelection(mainTableName, mainTableColumns);

    // 8) Completion
    setAiLoaderMessage("AI automation completed successfully!");
    setCurrentAIStep(2);
    await new Promise((r) => setTimeout(r, 1000));

    toast.success("AI automation completed! Main table and columns selected.", { autoClose: 3000 });
    
  } catch (error) {
    console.error("AI automation failed:", error);
    toast.error("Failed to complete AI automation");
  } finally {
    setIsAIProcessing(false);
    setCurrentAIStep(0);
    setAiTargetTable(null);
    setTablesSearch(""); // Clear search after automation
    setAiLoaderMessage("");
    setActivePanel(null);
  }
};
// New function to automate column selection with animations
const automateColumnSelection = async (tableName, schemaColumns) => {
  // Wait a bit for the table to be fully loaded
  await new Promise((r) => setTimeout(r, 800));
  
  // Get the table object to access its columns
  const table = tables.find((t) => t.name === tableName);
  if (!table || !table.columns || table.columns.length === 0) {
    console.warn("Table not found or has no columns loaded");
    return;
  }

  // Extract column names from schema (handling both string and object formats)
  const columnsToSelect = [];
schemaColumns.forEach(item => {
  if (typeof item === 'string') {
    // Direct column name like "state", "product_uom_qty"
    columnsToSelect.push(item);
  } else if (typeof item === 'object' && item !== null) {
    // Relation object like {"order_id": [{"relation": "sale_order"}]}
    const columnName = Object.keys(item)[0];
    if (columnName) {
      columnsToSelect.push(columnName);
    }
  }
});

  console.log("Columns to select:", columnsToSelect);

  // Animate selection of each column with delays
  for (let i = 0; i < columnsToSelect.length; i++) {
    const columnName = columnsToSelect[i];
    const columnObj = table.columns.find(col => col.name === columnName);
    
    if (columnObj) {
      setAiLoaderMessage(`Selecting column: ${columnName}...`);
      
      // Highlight this specific column by updating the target
      setAiTargetColumn(columnName);
      
      // Simulate the column toggle with delay
      await new Promise((r) => setTimeout(r, 600));
      await handleColumnToggle(tableName, columnObj, true);
      
      // Brief pause between selections
      await new Promise((r) => setTimeout(r, 400));
    }
    else {
  console.warn(`Column ${columnName} not found in table ${tableName}`);
}
  }
  
  // Clear column highlighting
  setAiTargetColumn(null);
};

  // ─────────────────────────────────────────────────────────────
  // ✅ NEW: Centralized auth guards + API wrapper
  // ─────────────────────────────────────────────────────────────

  // remove tokens helper
  const clearLocalTokens = () => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("db_token");
    } catch {}
  };

  // check & redirect if tokens missing
  const ensureAuthOrRedirect = (opts = { requireDB: true }) => {
    const token = localStorage.getItem("accessToken");
    const dbToken = localStorage.getItem("db_token");

    if (!token) {
      toast.error("Access token is missing. Redirecting to login...");
      clearLocalTokens();
      navigate("/login");
      return { ok: false };
    }
    if (opts.requireDB && !dbToken) {
      toast.error("DB token is missing. Redirecting to login...");
      clearLocalTokens();
      navigate("/login");
      return { ok: false };
    }
    return { ok: true, token, dbToken };
  };

  // detect token invalid JSON
  const isInvalidTokenResponse = (json) => {
    if (!json || typeof json !== "object") return false;
    if (json.code === "token_not_valid") return true;
    if (
      json.status === 403 &&
      json.detail &&
      String(json.detail).toLowerCase().includes("token")
    ) {
      return true;
    }
    if (Array.isArray(json.messages)) {
      return json.messages.some(
        (m) =>
          (m?.message && String(m.message).toLowerCase().includes("token")) ||
          (m?.token_type &&
            String(m.token_type).toLowerCase().includes("access"))
      );
    }
    return false;
  };

  // SweetAlert for invalid token
  const promptInvalidToken = async () => {
    const result = await Swal.fire({
      title: "Access token is not valid",
      text: "Do you wish to go back to the dashboard or stay here?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Go to Dashboard",
      cancelButtonText: "Stay Here",
    });
    if (result.isConfirmed) {
      navigate("/dashboard"); // or "/dashboard" if you prefer
    }
  };

  // unified API fetcher that attaches token, checks invalid-token response, and returns json
  const apiFetch = async (
    endpoint,
    options = {},
    { attachAuth = true } = {}
  ) => {
    const authCheck = ensureAuthOrRedirect({ requireDB: true });
    if (!authCheck.ok) {
      throw new Error("Auth missing");
    }
    const token = authCheck.token;

    const finalHeaders = {
      "Content-Type": "application/json",
      ...(attachAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(endpoint, { ...options, headers: finalHeaders });
    let json = null;
    try {
      json = await res.json();
    } catch {
      // ignore parse error, handle below
    }

    if (isInvalidTokenResponse(json) || res.status === 403) {
      await promptInvalidToken();
      throw new Error("Token not valid");
    }

    return { res, json };
  };
  // ─────────────────────────────────────────────────────────────

  // fetch presets keys
  useEffect(() => {
  if (activePanel === "agent") {
    setPresetsLoading(true);
    setPresetsError(null);
    fetch("https://demo.techfinna.com/api/datasets/presets/")
      .then((r) => r.json())
      .then((d) => {
        const keys =
          Array.isArray(d?.presets) ? d.presets.map((p) => p.key).filter(Boolean) : [];
        setPresetKeys(keys);
      })
      .catch((err) => {
        console.error("Failed to load presets:", err);
        setPresetsError("Failed to load presets");
        setPresetKeys([]);
      })
      .finally(() => setPresetsLoading(false));
  }
}, [activePanel]);

// fetch preset key data tables
const fetchPresetDetails = (key) => {
  console.log("Fetching preset:", key);
  fetch(`https://demo.techfinna.com/api/datasets/presets/${encodeURIComponent(key)}`)
    .then((r) => r.json())
    .then((d) => {
      console.log("Preset response:", d);
    })
    .catch((err) => {
      console.error("Preset fetch failed:", err);
      toast.error("Failed to fetch preset details");
    });
};

  // Add this at the top of your Home component, after the imports
  useEffect(() => {
    // Suppress ResizeObserver errors
    const resizeObserverErrDiv = document.getElementById(
      "webpack-dev-server-client-overlay-div"
    );
    const resizeObserverErr = document.getElementById(
      "webpack-dev-server-client-overlay"
    );

    if (resizeObserverErr) {
      resizeObserverErr.setAttribute("style", "display: none");
    }
    if (resizeObserverErrDiv) {
      resizeObserverErrDiv.setAttribute("style", "display: none");
    }

    // Alternative: Override console.error temporarily for ResizeObserver
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("ResizeObserver loop completed")
      ) {
        return; // Ignore ResizeObserver errors
      }
      originalError.apply(console, args);
    };

    // Cleanup
    return () => {
      console.error = originalError;
    };
  }, []);

  // === Fetch tables ===
  useEffect(() => {
    // ✅ guard: redirect if tokens missing
    const authCheck = ensureAuthOrRedirect({ requireDB: true });
    if (!authCheck.ok) return;

    setTablesLoading(true);

    // phase 1: just fetch the flat list of table names
    apiFetch(`${authUrl.BASE_URL}/db_connector/tables/`, {
      method: "POST",
      body: JSON.stringify({ db_token: authCheck.dbToken }),
    })
      .then(({ res, json }) => {
        if (!res.ok) throw new Error(`Network error: ${res.status}`);
        if (json?.success && Array.isArray(json.data)) {
          const list = json.data.map((t) => ({ name: t, columns: [] }));
          setTables(list);
        }
      })
      .catch((err) => console.error("Error fetching tables:", err))
      .finally(() => setTablesLoading(false));
  }, []);

  // === Fetch datasets ===
  useEffect(() => {
    // ✅ guard: redirect if tokens missing
    const authCheck = ensureAuthOrRedirect({ requireDB: true });
    if (!authCheck.ok) return;

    setpageLoading(true);

    apiFetch(`${authUrl.BASE_URL}/dataset/info/`, {
      method: "POST",
      body: JSON.stringify({ db_token: authCheck.dbToken }),
    })
      .then(({ res, json }) => {
        if (!res.ok) throw new Error(`Network error: ${res.status}`);
        setDatasets(Array.isArray(json?.data) ? json.data : []);
      })
      .catch((err) => console.error("Error fetching datasets:", err))
      .finally(() => setpageLoading(false));
  }, []);

  // Clear dataset modal state when closing
  useEffect(() => {
    if (openModal !== "dataset") {
      setSelectedIndex(null);
      setSelectedDatasets(null);
    }
  }, [openModal]);

  // Clear search when panel changes
  useEffect(() => {
    if (activePanel === "tables") setTablesSearch("");
    else if (activePanel === "datasets") setDatasetsSearch("");
  }, [activePanel]);

  // Resizing bottom pane
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setBottomHeight(Math.max(80, newHeight));
    };
    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = () => setIsResizing(true);

  // Open modal and fetch top 50 rows (no auth header used here by your code)
  const handleOpenModal = (tableName) => {
    setModalTableName(tableName);
    setOpenModal("modal");
    setpageLoading(true);
    fetch(`${url.BASE_URL}/ai/fifty/${tableName}`)
      .then((res) => res.json())
      .then((data) => setModalData(data || []))
      .catch((err) => {
        console.error(`Error fetching top rows for ${tableName}:`, err);
        setModalData([]);
      })
      .finally(() => setpageLoading(false));
  };

  const handleSearchChange = (tableName, value) => {
    setColumnSearches((prev) => ({ ...prev, [tableName]: value }));
    setNodes((nds) =>
      nds.map((n) =>
        n.id === tableName ? { ...n, data: { ...n.data, search: value } } : n
      )
    );
  };

  // ─────────────── ADD THIS ───────────────
  const handleTableSelect = async (tableName) => {
    // ✅ guard: redirect if tokens missing
    const authCheck = ensureAuthOrRedirect({ requireDB: true });
    if (!authCheck.ok) return;

    setTablesLoading(true);
    try {
      const { res, json } = await apiFetch(
        `${authUrl.BASE_URL}/db_connector/table/metadata/`,
        {
          method: "POST",
          body: JSON.stringify({
            db_token: authCheck.dbToken,
            table_name: tableName,
          }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (json?.success && json.data) {
        const cols = Object.entries(json.data).map(([colName, meta]) => ({
          name: colName,
          relation: meta.relation || null,
          referenced_column: meta.referenced_column || null
        }));
        setTables((prev) =>
          prev.map((t) => (t.name === tableName ? { ...t, columns: cols } : t))
        );
        addTable(tableName);
      } else {
        throw new Error(json?.message || "Failed to fetch metadata");
      }
    } catch (err) {
      console.error("Error fetching metadata:", err);
      toast.error(`Could not load columns for ${tableName}`);
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    const newNodes = Object.entries(selectedTables).map(
      ([tableName, { position, columns: selCols }]) => ({
        id: tableName,
        position,
        type: "default",
        data: {
          ...nodes.find((n) => n.id === tableName)?.data,
          search: columnSearches[tableName] || "",
          onSearchChange: handleSearchChange,
        },
      })
    );
    setNodes(newNodes);
  }, [selectedTables, tables]);

  // Generate a React Flow node
 const generateNode = useCallback(
  (tableName, x, y, selectedCols = []) => {
    const table = tables.find((t) => t.name === tableName);
    if (!table) return null;
    const search = columnSearches[tableName] || "";

    return {
      id: tableName,
      position: { x, y },
      type: "default",
      data: {
        label: (
          <div className="bg-white text-xs max-w-[240px] border border-gray-300 rounded-lg shadow p-2">
            <div className="flex items-center mb-1 justify-between">
              <strong
                onClick={() => handleOpenModal(tableName)}
                className={`block hover:text-blue-500 cursor-pointer truncate ${
                  isAIProcessing && aiTargetTable === tableName ? 'text-blue-700 font-bold' : ''
                }`}
              >
                {tableName}
                {isAIProcessing && aiTargetTable === tableName && (
                  <span className="ml-1 text-blue-600 animate-pulse">⚡</span>
                )}
              </strong>
            </div>
            <div className="flex items-center mb-2 gap-1">
              <input
                type="text"
                placeholder="Search columns"
                className="w-full px-1 py-0.5 text-[11px] border border-gray-300 rounded"
                value={search}
                onChange={(e) => handleSearchChange(tableName, e.target.value)}
                disabled={isAIProcessing}
              />
            </div>
            <ul className="max-h-[150px] overflow-y-auto scrollsettings space-y-1 pr-1">
              {table.columns
                .filter(
                  (col) =>
                    col.name.toLowerCase() !== "id" &&
                    (!search ||
                      col.name.toLowerCase().includes(search.toLowerCase()))
                )
                .map((col) => {
                  const isAITargetCol = isAIProcessing && aiTargetColumn === col.name;
                  const isSelected = selectedCols.includes(col.name);
                  
                  return (
                    <li
                      key={col.name}
                      className={`flex items-center justify-between transition-all duration-300 ${
                        isAITargetCol ? 'bg-yellow-100 border border-yellow-400 rounded px-1 animate-pulse' : ''
                      }`}
                    >
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleColumnToggle(tableName, col)}
                          disabled={isAIProcessing}
                          className={isAITargetCol ? 'accent-yellow-500' : ''}
                        />
                        {col.relation ? (
                          <span className={`text-blue-600 truncate ${
                            isAITargetCol ? 'font-bold text-yellow-700' : ''
                          }`}>
                            {col.name}
                            {isAITargetCol && <span className="ml-1 animate-bounce">←</span>}
                          </span>
                        ) : (
                          <span className={`truncate ${
                            isAITargetCol ? 'font-bold text-yellow-700' : ''
                          }`}>
                            {col.name}
                            {isAITargetCol && <span className="ml-1 animate-bounce">←</span>}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
            </ul>
          </div>
        ),
      },
    };
  },
  [tables, columnSearches, isAIProcessing, aiTargetTable, aiTargetColumn]
);

  // Add a table node
  const addTable = (tableName) => {
    if (selectedTables[tableName]) {
      setActivePanel(null);
      return;
    }
    const index = Object.keys(selectedTables).length;
    const x = 100 + index * 300;
    const y = 100 + index * 150;
    const newSelected = {
      ...selectedTables,
      [tableName]: { columns: [], position: { x, y } },
    };
    setSelectedTables(newSelected);
    setNodes((nds) => [...nds, generateNode(tableName, x, y, [])]);
    setActivePanel(null);
  };

 const handleColumnToggle = async (tableName, column, skipAutoLoad = false) => {
  // Skip auto-loading related tables during automation
  if (!skipAutoLoad && column.relation) {
    const related = column.relation.replace(/\./g, "_").toLowerCase();
    if (!selectedTables[related]) {
      await handleTableSelect(related);
    }
  }
  toggleColumn(tableName, column);
};

  // Toggle column selection (and auto-add related tables)
  const toggleColumn = (tableName, column) => {
    setSelectedTables((prev) => {
      const entry = prev[tableName];
      if (!entry) return prev;

      const isSelected = entry.columns.includes(column.name);
      const newCols = isSelected
        ? entry.columns.filter((c) => c !== column.name)
        : [...entry.columns, column.name];

      const updated = {
        ...prev,
        [tableName]: {
          ...entry,
          columns: newCols,
        },
      };

      if (column.relation) {
        const normalized = column.relation.replace(/\./g, "_").toLowerCase();
        const relatedTable = tables.find(
          (t) => t.name.toLowerCase() === normalized
        )?.name;

        if (!isSelected) {
          if (relatedTable && !prev[relatedTable]) {
            handleTableSelect(relatedTable);
          }
        } else {
          if (relatedTable) {
            const stillReferenced = Object.entries(updated).some(
              ([tbl, data]) =>
                data.columns.some((colName) => {
                  const colMeta = tables
                    .find((t) => t.name === tbl)
                    ?.columns.find((c) => c.name === colName);
                  return (
                    colMeta?.relation &&
                    colMeta.relation.replace(/\./g, "_").toLowerCase() ===
                      normalized
                  );
                })
            );
            if (!stillReferenced) {
              delete updated[relatedTable];
            }
          }
        }
      }

      return updated;
    });
  };

  // Recompute edges & nodes when selections change
  useEffect(() => {
    const newEdges = [];
    Object.entries(selectedTables).forEach(([tableName, data]) => {
      const table = tables.find((t) => t.name === tableName);
      if (!table) return;
      data.columns.forEach((colName) => {
        const col = table.columns.find((c) => c.name === colName);
        if (!col?.relation) return;
        const normalized = col.relation.replace(/\./g, "_").toLowerCase();
        if (selectedTables[normalized]) {
          newEdges.push({
            id: `${tableName}-${colName}-${normalized}`,
            source: tableName,
            target: normalized,
            type: "smoothstep",
            label: col.name,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: "black",
            },
            style: { stroke: "black", strokeWidth: 2 },
            animated: true,
          });
        }
      });
    });
    setEdges(newEdges);

    const updatedNodes = Object.entries(selectedTables).map(
      ([tableName, data]) =>
        generateNode(tableName, data.position.x, data.position.y, data.columns)
    );
    setNodes(updatedNodes);
  }, [selectedTables, tables, columnSearches, generateNode]);

  const onNodeDragStop = useCallback((_, node) => {
    setSelectedTables((prev) => ({
      ...prev,
      [node.id]: {
        ...prev[node.id],
        position: node.position,
        columns: prev[node.id].columns,
      },
    }));
  }, []);

  const handleAIAgent = async () => {
    const { value: report } = await Swal.fire({
      title: "AI Agent",
      text: "Choose a report to generate",
      input: "radio",
      inputOptions: {
        sales: "Sales Report",
        inventory: "Inventory Report",
      },
      inputValidator: (v) => (!v ? "Please choose a report" : undefined),
      confirmButtonText: "Continue",
      showCancelButton: true,
    });

    if (report) {
      // You can branch your logic here
      // e.g., navigate(`/agent/${report}`) or trigger an API
      toast.info(
        report === "sales"
          ? "Sales Report selected"
          : "Inventory Report selected"
      );
    }
  };
  // Reset everything
  const handleReset = () => {
    setSelectedTables({});
    setNodes([]);
    setEdges([]);
    setTablesSearch("");
    setDatasetsSearch("");
    setColumnSearches({});
    setResponseData([]);
    setOpenModal("response");
    setModalData([]);
    setSelectedDatasets(null);
    setSelectedIndex(null);
    setActivePanel(null);
  };

  // Submit preview
  // Updated handleSubmit function with debugging and fixes
  const handleSubmit = async () => {
    // ✅ guard: redirect if tokens missing
    const authCheck = ensureAuthOrRedirect({ requireDB: true });
    if (!authCheck.ok) return;

    const output = {};
    Object.entries(selectedTables).forEach(([tableName, data]) => {
      const table = tables.find((t) => t.name === tableName);
      if (!table) return;
      const relationCols = [];
      const regularCols = [];
      data.columns.forEach((colName) => {
        const col = table.columns.find((c) => c.name === colName);
        if (col?.relation) {
          relationCols.push({
            [col.name]: [
              { relation: col.relation.replace(/\./g, "_").toLowerCase(),
                referenced_column: col.referenced_column || "id"
               },
            ],
          });
        } else {
          regularCols.push(col.name);
        }
      });
      output[tableName] = [...regularCols, ...relationCols];
    });

    if (Object.keys(output).length === 0) {
      toast.error("Please select at least one table with columns");
      return;
    }

    const payload = { selected_columns: output, db_token: authCheck.dbToken };

    console.log("Payload being sent:", payload);

    try {
      setpageLoading(true);

      const { res, json } = await apiFetch(
        `${authUrl.BASE_URL}/dataset/preview/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      console.log("Full API response:", json);
      console.log("Response status:", res.ok);
      console.log("JSON status:", json?.status);
      console.log("JSON data:", json?.data);

      if (res.ok && json?.status) {
        let previewData = [];

        if (json.data?.data && Array.isArray(json.data.data)) {
          previewData = json.data.data;
        } else if (json.data && Array.isArray(json.data)) {
          previewData = json.data;
        } else if (Array.isArray(json)) {
          previewData = json;
        }

        console.log("Preview data to set:", previewData);
        console.log("Preview data length:", previewData.length);

        setResponseData(previewData);
        setSql(json.sql || "");
        setOpenModal("response");

        if (previewData.length > 0) {
          Swal.fire("Preview Generated", "success");
        } else {
          Swal.fire(
            "Preview Generated",
            "Preview generated but no data returned. Check your table selections.",
            "warning"
          );
        }
      } else {
        console.error("API Error:", json);
        Swal.fire(
          "Preview Failed",
          json?.error || json?.message || "Failed to generate preview",
          "error"
        );
      }
    } catch (error) {
      console.error("Request failed:", error);
      if (error.message !== "Token not valid") {
        Swal.fire(
          "Error",
          error.message || "An unexpected error occurred.",
          "error"
        );
      }
    } finally {
      setpageLoading(false);
    }
  };
  // Enhanced table list rendering focusing on main table


  // Updated handleGenerateCharts function for the new API structure
  const handleGenerateCharts = async () => {
    // ✅ guard: redirect if tokens missing
    const authCheck = ensureAuthOrRedirect({ requireDB: true });
    if (!authCheck.ok) return;

    const { value: name } = await Swal.fire({
      title: "Enter Dataset name",
      text: "Preferably provide proper name for the dataset. (Example: Sales Report)",
      input: "text",
      inputPlaceholder: "Dataset name...",
      showCancelButton: true,
      inputValidator: (value) => {
        const regex = /^[A-Za-z0-9 ]+$/;
        if (!value) {
          return "Dataset name is required!";
        } else if (!regex.test(value)) {
          return "Only letters, numbers, and spaces are allowed.";
        } else if (value.length > 60) {
          return "Maximum 60 characters allowed.";
        }
        return null;
      },
    });

    if (!name) return;

    const confirmation = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to create this dataset?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, create it",
      cancelButtonText: "No, cancel",
    });

    if (!confirmation.isConfirmed) return;

    const selectedColumns = {};
    Object.entries(selectedTables).forEach(([tableName, data]) => {
      const table = tables.find((t) => t.name === tableName);
      if (!table) return;

      const relationCols = [];
      const regularCols = [];

      data.columns.forEach((colName) => {
        const col = table.columns.find((c) => c.name === colName);
        if (col?.relation) {
          relationCols.push({
            [col.name]: [
              { relation: col.relation.replace(/\./g, "_").toLowerCase(),
                referenced_column: col.referenced_column || "id"
               },
            ],
          });
        } else {
          regularCols.push(col.name);
        }
      });

      selectedColumns[tableName] = [...regularCols, ...relationCols];
    });

    const payload = {
      db_token: authCheck.dbToken,
      table_name: name.toLowerCase().replace(/\s+/g, "_"),
      selected_columns: selectedColumns,
    };

    console.log("Payload being sent to field_mapping:", payload);

    try {
      setpageLoading(true);

      const { res: res1, json } = await apiFetch(
        `${authUrl.BASE_URL}/dataset/field_mapping/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      console.log("API Response:", json);

      if (!res1.ok) {
        throw new Error(json?.message || `HTTP error! status: ${res1.status}`);
      }

      if (json?.success) {
        setResponseData(json.data || []);
        if (json.sql_query) {
          setSql(json.sql_query);
        }
        setOpenModal("response");

        if (json.id && json.created_table_name) {
          try {
            const generatePayload = {
              db_token: authCheck.dbToken,
              table_name: json.created_table_name,
            };

            console.log(
              "Triggering dataset generation with payload:",
              generatePayload
            );

            const { res: generateRes, json: generateJson } = await apiFetch(
              `${authUrl.BASE_URL}/dataset/generate_dataset/`,
              {
                method: "POST",
                body: JSON.stringify(generatePayload),
              }
            );

            if (generateRes.ok) {
              console.log("Dataset generation response:", generateJson);

              if (generateJson?.success) {
                Swal.fire({
                  title: "Dataset Created Successfully!",
                  icon: "success",
                  showCancelButton: true,
                  confirmButtonText: "View in Gallery",
                  cancelButtonText: "Stay Here",
                }).then((result) => {
                  if (result.isConfirmed) {
                    navigate("/gallery");
                  }
                });
              } else {
                console.warn(
                  "Dataset generation completed but returned success: false"
                );
              }
            } else {
              console.warn(
                "Dataset generation request failed:",
                generateRes.status
              );
            }
          } catch (generateError) {
            console.warn(
              "Failed to trigger dataset generation:",
              generateError
            );
          }
        }
      } else {
        if (json?.message && json.message.includes("already exists")) {
          Swal.fire({
            title: "Name already exists!",
            text: `Dataset with name "${name}" already exists. Please choose a different name.`,
            icon: "warning",
            confirmButtonText: "Ok",
          });
        } else {
          throw new Error(json?.message || "Failed to create dataset");
        }
      }
    } catch (error) {
      console.error("Error creating dataset:", error);
      if (error.message !== "Token not valid") {
        Swal.fire({
          title: "Failed to Create Dataset",
          text:
            error.message ||
            "An unexpected error occurred while creating the dataset.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    } finally {
      setpageLoading(false);
    }
  };

  // Filtered lists
  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(tablesSearch.toLowerCase())
  );
  const filteredDatasets =
    datasets &&
    datasets.filter((d) =>
      d.name.toLowerCase().includes(datasetsSearch.toLowerCase())
    );

  // Enhanced renderBottomContent function with debugging
  const renderBottomContent = () => {
    

    // 1) Dataset preview panel
    if (
      openModal === "dataset" &&
      selectedDatasets &&
      Array.isArray(selectedDatasets.data) &&
      selectedDatasets.data.length > 0
    ) {
      console.log("Rendering dataset preview panel");
      return (
        <div style={{ height: `${bottomHeight}px` }} className="rounded">
          <div className="w-full flex p-1 items-center justify-between">
            <p className="text-xl">{selectedDatasets.name} Preview</p>
            <button
              onClick={() => setOpenModal("response")}
              disabled={!responseData || responseData.length <= 0}
              className="bg-pink-600 disabled:cursor-not-allowed disabled:bg-gray-500 text-white px-4 py-2 rounded shadow"
            >
              Show Dataset
            </button>
          </div>
          <div
            className="overflow-auto"
            style={{ height: `${bottomHeight - 60}px` }}
          >
            <table className="w-full mb-3 text-xs text-left border border-gray-300">
              <thead className="bg-[#FAFAFB] border-b border-gray-300 text-gray-700 sticky top-0">
                <tr>
                  {Object.keys(selectedDatasets.data[0]).map((key) => (
                    <th key={key} className="px-2 py-3 whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedDatasets.data.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 border border-gray-300"
                  >
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-2 py-3 whitespace-nowrap">
                        {typeof val === "object" && val !== null
                          ? JSON.stringify(val)
                          : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 2) Response data preview
    if (openModal === "response") {
     

      if (Array.isArray(responseData) && responseData.length > 0) {

        return (
          <div style={{ height: `${bottomHeight}px` }} className="rounded">
            <div className="w-full flex p-1 items-center justify-between bg-gray-50 border-b">
              <p className="text-xl font-semibold">
                Dataset Preview (Top {responseData.length} rows)
              </p>
              <button
                onClick={handleGenerateCharts}
                disabled={!responseData || responseData.length === 0}
                className="bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
              >
                Generate Charts
              </button>
            </div>
            <div
              className="overflow-auto"
              style={{ height: `${bottomHeight - 60}px` }}
            >
              <table className="w-full mb-3 text-xs text-left border border-gray-300">
                <thead className="bg-[#FAFAFB] border-b border-gray-300 text-gray-700 sticky top-0">
                  <tr>
                    {Object.keys(responseData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-2 py-3 whitespace-nowrap font-medium"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responseData.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 border-b border-gray-200"
                    >
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-2 py-3 whitespace-nowrap">
                          {typeof val === "object" && val !== null
                            ? JSON.stringify(val)
                            : val?.toString() || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      } else {
        return (
          <div className="p-4 text-center">
            <p className="text-gray-500 mb-2">No preview data available</p>
            <p className="text-sm text-gray-400">
              {!responseData
                ? "No data generated yet"
                : !Array.isArray(responseData)
                ? "Invalid data format received"
                : "Empty dataset returned"}
            </p>
            <button
              onClick={() => console.log("Current responseData:", responseData)}
              className="mt-2 px-3 py-1 text-xs bg-gray-200 rounded"
            >
              Debug: Log Response Data
            </button>
          </div>
        );
      }
    }

    // 3) Modal showing top 50 rows
    if (openModal === "modal") {
      console.log("Rendering modal for table:", modalTableName);
      return (
        <div
          style={{ height: `${bottomHeight}px` }}
          className="relative rounded"
        >
          <div className="w-full flex p-1 items-center justify-between bg-gray-50 border-b">
            <h4 className="text-2xl font-semibold">
              {modalTableName} - Top 50 rows
            </h4>
            <button
              onClick={() => setOpenModal("response")}
              disabled={!responseData || responseData.length <= 0}
              className="bg-pink-600 disabled:cursor-not-allowed disabled:bg-gray-500 text-white px-4 py-2 rounded shadow"
            >
              Show Dataset
            </button>
          </div>
          {modalData.length > 0 ? (
            <div
              className="overflow-auto"
              style={{ height: `${bottomHeight - 60}px` }}
            >
              <table className="w-full mb-3 text-xs text-left border border-gray-300">
                <thead className="bg-[#FAFAFB] border-b border-gray-300 text-gray-700 sticky top-0">
                  <tr>
                    {Object.keys(modalData[0]).map((key) => (
                      <th key={key} className="px-2 py-3 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-300 hover:bg-gray-50"
                    >
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-2 py-3 whitespace-nowrap">
                          {val !== null && val !== undefined
                            ? val.toString()
                            : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-4">
              No data available for this table.
            </p>
          )}
        </div>
      );
    }

    // 4) Default placeholder
    console.log("Rendering default placeholder");
    return (
      <div className="p-4 text-gray-500 text-center">
        <p className="mb-2">No preview available</p>
        <p className="text-sm">
          Generate a dataset, select one to preview, or click a table in the
          flow above to see its top 50 rows.
        </p>
        <div className="mt-4 text-xs text-gray-400">
          <p>Current state:</p>
          <p>openModal: {openModal}</p>
          <p>responseData length: {responseData?.length || 0}</p>
        </div>
      </div>
    );
  };

  function extendValidity() {
    Swal.fire({
      title: "Extend validity",
      text: "Extend your validity by sending us email at",
      html: `Extend your validity by sending us email at <a class="text-blue-600" href="mailto:hello@byteloom.ai" autofocus>hello@byteloom.ai</a>`,
    });
  }

  function ValidityLeft() {
    Swal.fire({
      title: "Validity Left",
      text: `${validityLeft} Days`,
    });
  }

  // === JSX ===
  return (
    <>
      <Navbar />
      <div className="h-[calc(100%-55px)] mt-[55px] w-screen bg-[#f9f9fb] relative overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[60px] h-[calc(100vh-55px)] fixed top-[55px] left-0 flex flex-col items-center py-4 space-y-4 border-r border-gray-200 bg-white z-50">
          <div className="flex flex-col items-center">
            <button
              onClick={() =>
                setActivePanel((prev) => (prev === "tables" ? null : "tables"))
              }
              className={`p-2 rounded hover:bg-gray-200 ${
                activePanel === "tables" ? "bg-gray-200" : ""
              }`}
              title="Select Tables"
            >
              <FiTable size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">Tables</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={() =>
                setActivePanel((prev) =>
                  prev === "datasets" ? null : "datasets"
                )
              }
              className={`p-2 rounded hover:bg-gray-200 ${
                activePanel === "datasets" ? "bg-gray-200" : ""
              }`}
              title="Select Dataset"
            >
              <FiDatabase size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">Datasets</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={() =>
                setActivePanel((prev) => (prev === "agent" ? null : "agent"))
              }
              className={`p-2 rounded hover:bg-gray-200 ${
                activePanel === "agent" ? "bg-gray-200" : ""
              }`}
              title="AI Agent"
            >
              <FiCpu size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">AI Agent</span>
          </div>
          <div className="flex-1"></div>
          <div className="flex flex-col items-center">
            <button
              onClick={handleReset}
              className="p-2 rounded hover:bg-gray-200"
              title="Reset Flow"
            >
              <FiRefreshCw size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">Reset</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={() => setSettingsPanel((prev) => !prev)}
              className="p-2 relative rounded hover:bg-gray-200"
              title="Settings"
            >
              {validityLeft && validityLeft < 8 && (
                <div className="h-[7px] w-[7px] absolute right-0.5 top-0.5 bg-red-600 rounded-full animate-pulse"></div>
              )}
              <FiSettings size={20} className="text-gray-600" />
            </button>
            <span className="text-[10px]">Settings</span>
          </div>
        </aside>

        {/* Floating Panel */}
        {activePanel && (
          <div
            className="fixed w-[280px] left-[70px] h-[80vh] z-40 top-[55px] rounded-lg overflow-hidden drop-shadow-xl flex bg-opacity-50"
            onClick={() => setActivePanel(null)}
          >
            <div
              className="bg-white border border-gray-200 text-gray-600 w-full rounded-lg flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <p className="text-lg font-medium text-gray-800">
                  {activePanel === "tables"
                    ? "Tables"
                    : activePanel === "datasets"
                    ? "Datasets"
                    : "AI Agent"}
                </p>
                <button
                  onClick={() => setActivePanel(null)}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-2 border-b border-gray-200">
                {activePanel === "tables" ? (
  <div className="relative">
    <input
      type="text"
      placeholder="Search tables..."
      value={tablesSearch}
      onChange={(e) => setTablesSearch(e.target.value)}
      className={`w-full px-2 py-1 text-sm border rounded transition-all duration-300 ${
        isAIProcessing && currentAIStep === 1 && aiTargetTable
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 animate-pulse'
          : 'border-gray-300'
      }`}
      disabled={isAIProcessing}
    />
    {isAIProcessing && currentAIStep === 1 && aiTargetTable && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
  </div>
) : activePanel === "datasets" ? (
  <input
    type="text"
    placeholder="Search datasets..."
    value={datasetsSearch}
    onChange={(e) => setDatasetsSearch(e.target.value)}
    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
  />
) : (
  <div className="text-sm text-gray-500">
    Choose a report type below.
  </div>
)}
              </div>
              <div className="p-2 overflow-y-auto flex-1 scrollsettings">
{activePanel === "tables" && (
  <div className="space-y-2">
    {tablesLoading ? (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mx-auto w-full border p-4 border-gray-200 rounded-md"
          >
            <div className="flex space-x-4">
              <div className="h-6 w-6 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-2 rounded bg-gray-200"></div>
                <div className="h-2 rounded bg-gray-200 w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : filteredTables.length === 0 ? (
      <div className="p-4 text-gray-400">
        {tables.length === 0
          ? "No tables available"
          : "No tables match your search"}
      </div>
    ) : (
      filteredTables.map((table) => {
        const isAITarget = isAIProcessing && aiTargetTable === table.name;
        const isSelected = !!selectedTables[table.name];
        
        return (
          <label
            key={table.name}
            className={`flex px-2 py-2 cursor-pointer justify-between items-center rounded transition-all duration-300 ${
              isAITarget
                ? 'bg-blue-100 border-2 border-blue-400 shadow-md animate-pulse'
                : isSelected
                ? 'bg-green-100 border border-green-300'
                : 'hover:bg-gray-100'
            }`}
          >
            <span className={`truncate ${isAITarget ? 'text-blue-700 font-semibold' : ''}`}>
              {table.name}
              {isAITarget && (
                <span className="ml-2 text-xs text-blue-600 animate-bounce">
                  ← AI Selecting
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {isAITarget && (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              <input
                type="checkbox"
                checked={isSelected}
                disabled={Object.keys(selectedTables).length > 0 || isAIProcessing}
                onChange={() => handleTableSelect(table.name)}
                className={isAITarget ? 'accent-blue-500' : ''}
              />
            </div>
          </label>
        );
      })
    )}
  </div>
)}

                {activePanel === "datasets" && (
                  <div className="space-y-2">
                    {filteredDatasets.length === 0 ? (
                      <div className="p-4 text-gray-400">
                        {datasets.length === 0
                          ? "No datasets available"
                          : "No datasets match your search"}
                      </div>
                    ) : (
                      filteredDatasets.map((dataset, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <label
                            key={idx}
                            className="flex px-2 py-2 cursor-pointer justify-between items-center rounded hover:bg-gray-100"
                          >
                            <span className="truncate">{dataset.name}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const newIndex = isSelected ? null : idx;
                                setSelectedIndex(newIndex);
                                setSelectedDatasets(
                                  isSelected ? null : dataset
                                );
                                setOpenModal(isSelected ? null : "dataset");
                                setActivePanel(null);
                              }}
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                )}

                {activePanel === "agent" && (
  <div className="space-y-3">
    <div className="p-3 border border-gray-200 rounded">
      <p className="text-sm mb-2">Select a preset</p>

      {presetsLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!presetsLoading && presetsError && (
        <div className="text-sm text-red-600">
          {presetsError}
          <button
            onClick={() => {
              setPresetsLoading(true);
              setPresetsError(null);
              fetch("https://demo.techfinna.com/api/datasets/presets/")
                .then((r) => r.json())
                .then((d) => {
                  const keys =
                    Array.isArray(d?.presets) ? d.presets.map((p) => p.key).filter(Boolean) : [];
                  setPresetKeys(keys);
                })
                .catch((err) => {
                  console.error("Failed to load presets:", err);
                  setPresetsError("Failed to load presets");
                  setPresetKeys([]);
                })
                .finally(() => setPresetsLoading(false));
            }}
            className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded"
          >
            Retry
          </button>
        </div>
      )}

      {!presetsLoading && !presetsError && presetKeys.length === 0 && (
        <div className="text-sm text-gray-500">No presets found.</div>
      )}

      {!presetsLoading && !presetsError && presetKeys.length > 0 && (
        <div className="space-y-1">
          {presetKeys.map((k) => (
            <label
              key={k}
              className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
            >
              <input
                type="radio"
                name="agent-report"
                value={k}
                checked={selectedReport === k}
                onChange={() => setSelectedReport(k)}
              />
              <span className="truncate">{k}</span>
            </label>
          ))}
        </div>
      )}
    </div>

    <button
      onClick={async () => {
        if (!selectedReport) {
          toast.error("Please choose a preset");
          return;
        }
        // TODO: wire your navigation/API call here using `selectedReport`
        setActivePanel(null);
  toast.info(`Starting AI automation for: ${selectedReport}`, { autoClose: 2000 });
  await simulateAITableSelectionFromPreset(selectedReport);
      }}
      
      className="w-full bg-blue-600 text-white px-3 py-2 rounded shadow disabled:bg-gray-400"
     
      disabled={!selectedReport}
    >
      Continue
    </button>
  </div>
)}

              </div>
            </div>
          </div>
        )}

        {settingsPanel && (
          <div className="fixed w-[280px] left-[70px] h-[25vh] z-40 bottom-[55px] rounded-lg overflow-hidden drop-shadow-xl flex bg-opacity-50">
            <div
              className="bg-white border border-gray-200 text-gray-600 w-full rounded-lg flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <p className="text-lg font-medium text-gray-800">Settings</p>
                <button
                  onClick={() => setSettingsPanel(false)}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div
                onClick={() => ValidityLeft()}
                className="flex mx-2 mt-2 px-2 py-2 cursor-pointer justify-between items-center rounded hover:bg-gray-100"
              >
                {validityLeft && validityLeft < 8 && (
                  <div className="h-[5px] w-[5px] absolute left-1 top-1 bg-red-600 rounded-full animate-pulse"></div>
                )}
                Check API Key Validity
              </div>
              <div
                onClick={() => extendValidity()}
                className="flex mx-2 relative mt-2 px-2 py-2 cursor-pointer justify-between items-center rounded hover:bg-gray-100"
              >
                Extend API Key Validity
              </div>
            </div>
          </div>
        )}

        {/* Generate Dataset Button */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!(nodes && nodes.length > 0)}
            className="bg-pink-600 disabled:cursor-not-allowed disabled:bg-gray-500 text-white px-4 py-2 rounded shadow"
          >
            Generate Dataset
          </button>
        </div>

        {/* ReactFlow canvas */}
        <div
          style={{ height: `calc(100vh - (${bottomHeight}px + 55px))` }}
          className="ml-[60px]"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            zoomOnScroll={false}
            preventScrolling={false}
          >
            <Background color="#eaeaea" />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        {/* Resizer */}
        <div
          ref={resizerRef}
          onMouseDown={handleMouseDown}
          className="h-2 bg-gray-300 cursor-row-resize w-full ml-[60px]"
        />

        {/* Bottom pane */}
        <div
          className="h-full w-[calc(100%-60px)] bg-white shadow-inner border-t overflow-scroll scrollsettings border-gray-200 ml-[60px]"
          style={{ height: `${bottomHeight - 10}px` }}
        >
          <div className="h-full text-sm text-gray-600">
            {renderBottomContent()}
          </div>
        </div>
      </div>
      {pageLoading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="loader"></div>
        </div>
      )}
      <ToastContainer />
    </>
  );
}
export default Home;