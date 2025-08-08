// File: /pages/editDashboard.jsx

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import {
  FiDatabase,
  FiBarChart2,
  FiTrendingUp,
  FiRefreshCw,
  FiSave,
  FiX,
} from 'react-icons/fi'
import { RiDraggable } from 'react-icons/ri'
import { RxCross2 } from 'react-icons/rx'
import ChartIcon from '../components/ChartIcon'
import RGL, { WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import Navbar from '../components/Navbar'
import colorLib from '@kurkle/color'
import { authUrl, url } from '../config'
import { toast } from 'react-toastify'

// Wrap the grid layout
const GridLayout = WidthProvider(RGL)
const ROW_HEIGHT = 30

// Load highcharts-more for bubble support
function loadHighchartsMore() {
  if (typeof window === 'undefined') return
  import('highcharts/highcharts-more')
    .then((mod) => {
      const init = mod.default || mod
      if (typeof init === 'function') init(Highcharts)
    })
    .catch(() => { })
}

// Make a color semi-transparent
const transparentize = (value, opacity = 0.5) => {
  const alpha = 1 - opacity
  return colorLib(value).alpha(alpha).rgbString()
}

// Build Highcharts options for any chart type - Updated to handle new data structure
function getHighchartsOptions(chart, colorOffset = 0) {
  const { type, data } = chart
  const xAxisLabel = chart.x_axis
  const yAxisLabel = chart.y_axis
  const labels = Array.isArray(data.labels) ? data.labels : []

  const LINE_COLORS = ['rgb(207,37,0)', 'rgb(7,164,199)']
  const OTHER_COLORS = [
    'rgb(165, 148, 249)', 'rgb(176, 219, 156)', 'rgb(255, 128, 128)',
    'rgb(148, 181, 249)', 'rgb(185, 178, 219)', 'rgb(249, 165, 148)',
    'rgb(247, 207, 216)', 'rgb(255, 199, 133)', 'rgb(163, 216, 255)',
    'rgb(185, 243, 252)', 'rgb(174, 226, 255)', 'rgb(147, 198, 231)',
    'rgb(254, 222, 255)', 'rgb(244, 191, 191)', 'rgb(255, 217, 192)',
    'rgb(250, 240, 215)', 'rgb(140, 192, 222)', 'rgb(216, 148, 249)'
  ]

  const PALETTE = ['scatter', 'line'].includes(type)
    ? LINE_COLORS
    : OTHER_COLORS

  const offset = colorOffset % PALETTE.length
  const rotated = [
    ...PALETTE.slice(offset),
    ...PALETTE.slice(0, offset),
  ]

  const base = {
    title: { text: '' },
    credits: { enabled: false },
    colors: rotated,
    chart: {},
    xAxis: {},
    yAxis: {},
    series: [],
    plotOptions: {},
    tooltip: {},
  }

  const makeSeries = () =>
    (data.datasets || []).map((ds, i) => {
      const color = rotated[i % rotated.length]
      const seriesObj = { name: ds.label || `Series ${i + 1}` }

      if (type === 'scatter') {
        seriesObj.data = (ds.data || []).map((pt, j) => {
          if (pt && typeof pt === 'object' && 'x' in pt && 'y' in pt) {
            return [pt.x, pt.y]
          }
          const y = parseFloat(pt)
          return isNaN(y) ? null : [j, y]
        }).filter(p => p)
        seriesObj.color = color

      } else if (type === 'bubble') {
        seriesObj.data = (ds.data || []).map((v, j) => {
          const x = parseFloat(labels[j]) || j
          const y = parseFloat(v)
          return isNaN(y) ? null : { x, y, z: y, name: labels[j] }
        }).filter(p => p)
        seriesObj.color = color

      } else {
        seriesObj.data = ds.data || []
        if (['bar', 'column'].includes(type)) {
          seriesObj.color = color
          seriesObj.borderColor = color
          seriesObj.borderWidth = 0
        } else if (type === 'line') {
          seriesObj.color = color
          seriesObj.fillColor = transparentize(color, 0.5)
          seriesObj.marker = { fillColor: color }
        } else {
          seriesObj.color = color
        }
      }

      return seriesObj
    })

  switch (type) {
    case 'bar':
    case 'column':
      base.chart = { type: 'column' }
      base.xAxis = { categories: labels, title: { text: xAxisLabel } }
      base.yAxis = { title: { text: yAxisLabel } }
      base.series = makeSeries()
      base.plotOptions = {
        column: {
          states: { inactive: { opacity: 0.3 } },
          point: {
            events: {
              mouseOver() {
                this.series.points.forEach(pt => pt !== this && pt.setState('inactive'))
              },
              mouseOut() {
                this.series.points.forEach(pt => pt !== this && pt.setState(''))
              },
            },
          },
          borderWidth: 0,
        },
      }
      break

    case 'multi_bar':
      base.chart = { type: 'column' }
      base.xAxis = { categories: labels, title: { text: xAxisLabel } }
      base.yAxis = { title: { text: "" } }
      base.series = makeSeries()
      base.plotOptions = {
        column: {
          states: { inactive: { enabled: true, opacity: 0.3 } },
          point: {
            events: {
              mouseOver: function () {
                this.series.points.forEach(pt => {
                  if (pt !== this) pt.setState('inactive')
                })
              },
              mouseOut: function () {
                this.series.points.forEach(pt => {
                  if (pt !== this) pt.setState('')
                })
              }
            }
          },
          borderWidth: 0
        }
      }
      break
    case 'multi_line':
      base.chart = { type: 'line' }
      base.xAxis = {
        categories: labels, title: { text: xAxisLabel }
      }
      base.yAxis = { title: { text: "" } }
      base.series = makeSeries()
      base.plotOptions = {
        line: {
          marker: { enabled: false },
          states: { hover: { lineWidthPlus: 1 } }
        }
      }
      break

    case 'line':
      base.chart = { type: 'line' }
      base.xAxis = { categories: labels, title: { text: xAxisLabel } }
      base.yAxis = { title: { text: yAxisLabel } }
      base.series = makeSeries()
      base.plotOptions = {
        line: {
          marker: { enabled: false },
          states: { hover: { lineWidthPlus: 1 } },
        },
      }
      break

    case 'pie':
    case 'doughnut':
      base.chart = { type: 'pie' }
      if (data.datasets[0]) {
        const ds0 = data.datasets[0]
        base.series = [{
          name: chart.name || ds0.label || (type === 'pie' ? 'Pie' : 'Doughnut'),
          innerSize: type === 'doughnut' ? '60%' : '0%',
          data: labels.map((lbl, j) => ({
            name: lbl,
            y: ds0.data[j] || 0,
            color: rotated[j % rotated.length],
          })),
        }]
      }
      base.plotOptions = {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: { enabled: true },
        },
      }
      break

    case 'scatter':
      base.chart = { type: 'scatter', zoomType: 'xy' }
      base.xAxis = { title: { text: xAxisLabel } }
      base.yAxis = { title: { text: yAxisLabel } }
      base.series = makeSeries()
      base.plotOptions = {
        scatter: {
          marker: {
            radius: 4,
            states: { hover: { radiusPlus: 2 } },
          },
        },
      }
      break

    case 'bubble':
      base.chart = { type: 'bubble', plotBorderWidth: 1, zoomType: 'xy' }
      base.xAxis = {
        categories: labels,
        title: { text: xAxisLabel },
        type: 'category',
      }
      base.yAxis = { title: { text: yAxisLabel } }
      base.series = makeSeries()
      base.plotOptions = {
        bubble: {
          minSize: 5,
          maxSize: '20%',
          tooltip: {
            pointFormat:
              '<b>{point.name}</b><br/>Value: {point.y}<br/>Size: {point.z}',
          },
        },
      }
      break

    default:
      base.chart = { type: 'areaspline' }
      base.xAxis = { categories: labels, title: { text: xAxisLabel } }
      base.yAxis = { title: { text: yAxisLabel } }
      base.series = makeSeries()
      base.plotOptions = { areaspline: { marker: { enabled: false } } }
  }

  return base
}

// Find first available spot in grid
function getFirstAvailablePosition(layouts, w, h, cols) {
  const heights = Array(cols).fill(0)
  layouts.forEach(({ x, y, w: wi, h: hi }) => {
    for (let col = x; col < x + wi; col++) {
      heights[col] = Math.max(heights[col], y + hi)
    }
  })
  let bestX = 0, bestY = Infinity
  for (let start = 0; start <= cols - w; start++) {
    const slice = heights.slice(start, start + w)
    const yCandidate = Math.max(...slice)
    if (yCandidate < bestY) {
      bestY = yCandidate
      bestX = start
    }
  }
  return { x: bestX, y: bestY }
}

export default function EditDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [widgets, setWidgets] = useState([])

  const [datasets, setDatasets] = useState([])
  const [selectedDatasetId, setSelectedDatasetId] = useState(null)
  const [charts, setCharts] = useState([])
  const [kpis, setKpis] = useState([])
  const [activePanel, setActivePanel] = useState(null)

  // load highcharts-more once
  useEffect(loadHighchartsMore, [])

  // fetch list of datasets - Updated with new auth pattern
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
      .then(res => {
        if (!res.ok) throw new Error('Failed to load datasets')
        return res.json()
      })
      .then(json => {
        setDatasets(Array.isArray(json.data) ? json.data : [])
      })
      .catch(err => {
        console.error(err)
        Swal.fire('Error', 'Could not load datasets', 'error')
      })
  }, [])

  // load existing dashboard layout + widget data - Updated with new auth pattern
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Auth Error: No access token found.");
      setError("No access token found");
      setLoading(false);
      return;
    }

    const dbToken = localStorage.getItem("db_token");
    if (!dbToken) {
      toast.error("Auth Error: No DB token found.");
      setError("No DB token found");
      setLoading(false);
      return;
    }

    ; (async () => {
      try {
        const resp = await fetch(`${authUrl.BASE_URL}/dashboard/layout/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
        if (!resp.ok) throw new Error(`Layout fetch failed: ${resp.status}`)
        const json = await resp.json()
        setName(json.name || '')

        const detailed = await Promise.all(
          (json.widgets || []).map(async (w) => {
            try {
              let dataJson;
              if (w.type === 'chart') {
                const r = await fetch(`${authUrl.BASE_URL}/dataset/chart/${w.id}/data/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ db_token: dbToken })
                });
                if (!r.ok) throw new Error(`Chart ${w.id} fetch failed`);
                const result = await r.json();
                dataJson = {
                  id: result?.data?.chart_id || w.id,
                  name: result?.data?.chart_title || 'Chart',
                  type: result?.data?.chart_type || 'line',
                  data: result?.data?.data || null,
                  x_axis: result?.data?.x_axis,
                  y_axis: result?.data?.y_axis
                };
              } else {
                const r = await fetch(`${authUrl.BASE_URL}/dataset/kpi/${w.id}/data/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ db_token: dbToken })
                });
                if (!r.ok) throw new Error(`KPI ${w.id} fetch failed`);
                const result = await r.json();
                dataJson = {
                  id: result?.data?.kpi_id || w.id,
                  name: result?.data?.kpi_name || 'KPI',
                  value: result?.data?.value || result?.data?.raw_value || 'N/A'
                };
              }

              return {
                key: w.key,
                type: w.type,
                data: dataJson,
                layout: {
                  i: w.key,
                  x: w.layout.x,
                  y: w.layout.y,
                  w: w.layout.w,
                  h: w.layout.h,
                },
              }
            } catch (err) {
              console.error(`Error loading widget ${w.id}:`, err);
              return null;
            }
          })
        )

        setWidgets(detailed.filter(w => w !== null))
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // Updated selectDataset function matching the new DashboardPage pattern
  const selectDataset = async (dsId) => {
    setSelectedDatasetId(dsId)
    setActivePanel(null)

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
        fetch(`${authUrl.BASE_URL}/dataset/kpis/${dsId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        }),
        fetch(`${authUrl.BASE_URL}/dataset/chart/${dsId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        })
      ]);

      if (!kpisRes.ok || !chartsRes.ok) {
        throw new Error(`Failed to load data for dataset ${dsId}`);
      }

      const kpisData = await kpisRes.json();
      const chartsData = await chartsRes.json();

      console.log('Raw KPIs data:', kpisData);
      console.log('Raw Charts data:', chartsData);

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
            console.log(`KPI ${kpi.id} result:`, result);

            return {
              id: kpi.id,
              name: result?.data?.kpi_name || kpi.kpi_name,
              value: result?.data?.value || result?.data?.raw_value || 'N/A'
            };
          } else {
            console.error(`Failed to fetch KPI ${kpi.id} data:`, response.status);
          }
        } catch (err) {
          console.error(`Error fetching KPI ${kpi.id}:`, err);
        }

        return {
          id: kpi.id,
          name: kpi.kpi_name,
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
            console.log(`Chart ${chart.id} result:`, result);

            return {
              id: result?.data?.chart_id || chart.id,
              name: result?.data?.chart_title || chart.chart_title,
              type: result?.data?.chart_type || chart.chart_type,
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
        .filter(({ name, value }) =>
          name != null && name !== "" && value != null && value !== ""
        );

      // 7) Process chart results
      const visibleCharts = chartResults
        .filter(r => r.status === 'fulfilled' && r.value && r.value.type !== 'heatmap')
        .map(r => r.value)
        .filter(c => {
          // Must have at least one dataset and one label
          const hasDatasets = Array.isArray(c.data?.datasets) && c.data.datasets.length > 0;
          const hasLabels = Array.isArray(c.data?.labels) && c.data.labels.length > 0;
          return hasDatasets && hasLabels;
        });

      // 8) Update state
      setCharts(visibleCharts)
      setKpis(formattedKpis)

      console.log('Final charts:', visibleCharts);
      console.log('Final KPIs:', formattedKpis);

    } catch (err) {
      console.error('Error in selectDataset:', err)
      Swal.fire('Error', err.message, 'error')
    }
  }

  // add widget to canvas
  const addWidgetToCanvas = (item, type) => {
    // avoid dupes
    if (widgets.some(w => w.type === type && w.data.id === item.id)) return

    const newKey = `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const defaultSize = type === 'chart' ? { w: 6, h: 10 } : { w: 3, h: 4 }
    const { x, y } = getFirstAvailablePosition(
      widgets.map(w => w.layout),
      defaultSize.w,
      defaultSize.h,
      12
    )
    const newWidget = {
      key: newKey,
      type,
      data: item,
      layout: { i: newKey, x, y, w: defaultSize.w, h: defaultSize.h },
    }
    setWidgets(ws => [...ws, newWidget])
  }

  // remove widget
  const removeWidget = (key) => {
    setWidgets(ws => ws.filter(w => w.key !== key))
  }

  // on drag/resize
  const onLayoutChange = (newLayout) => {
    setWidgets(ws =>
      ws.map(w => {
        const l = newLayout.find(n => n.i === w.key)
        return l ? { ...w, layout: l } : w
      })
    )
  }

  // reset dashboard
  const resetDashboard = () => {
    Swal.fire({
      title: 'Reset Dashboard?',
      text: 'This will clear all widgets and dataset selection.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset',
    }).then(res => {
      if (res.isConfirmed) {
        setWidgets([])
        setSelectedDatasetId(null)
        setCharts([])
        setKpis([])
        setActivePanel(null)
      }
    })
  }

  // save updated layout - Updated with new auth pattern and endpoint
  const saveDashboard = async () => {
    if (widgets.length === 0) {
      Swal.fire('Info', 'Add at least one widget before saving.', 'info')
      return
    }
    const { isConfirmed } = await Swal.fire({
      title: 'Save Dashboard?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, save',
    })
    if (!isConfirmed) return

    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Auth Error: No access token found.");
      return;
    }

    const payload = {
      id,
      name,
      widgets: widgets.map(w => ({
        key: w.key,
        type: w.type,
        id: w.data.id,
        layout: {
          x: w.layout.x,
          y: w.layout.y,
          w: w.layout.w,
          h: w.layout.h,
        },
      })),
    }

    try {
      console.log("Saving payload:", payload);
      const r = await fetch(`${authUrl.BASE_URL}/dashboard/edit/layout/${id}`, {
        method: 'PUT', // Using PUT for update
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(`Status ${r.status}`)
      await Swal.fire('Saved!', '', 'success')
      navigate(`/view-dashboard?id=${id}`)
    } catch (err) {
      console.error('Failed to save dashboard:', err)
      Swal.fire('Error', err.message, 'error')
    }
  }

  if (loading) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="loader"></div>
  </div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <>
      <Navbar />

      {/* Sidebar */}
      <aside className="w-[60px] h-[calc(100vh-55px)] fixed top-[55px] flex flex-col items-center py-4 space-y-4 border-r bg-white z-20">
        {/* Dataset */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setActivePanel(prev => prev === 'dataset' ? null : 'dataset')}
            className={`p-2 rounded hover:bg-gray-200 ${activePanel === 'dataset' ? 'bg-gray-200' : ''}`}
            title="Select Dataset"
          >
            <FiDatabase size={20} />
          </button>
          <span className="text-[10px]">Dataset</span>
        </div>
        {/* Charts */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              if (!selectedDatasetId) return Swal.fire('Info', 'Select a dataset first', 'info')
              setActivePanel(prev => prev === 'charts' ? null : 'charts')
            }}
            className={`p-2 rounded hover:bg-gray-200 ${activePanel === 'charts' ? 'bg-gray-200' : ''
              } ${!selectedDatasetId ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Add Charts"
            disabled={!selectedDatasetId}
          >
            <FiBarChart2 size={20} />
          </button>
          <span className="text-[10px]">Charts</span>
        </div>
        {/* KPIs */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              if (!selectedDatasetId) return Swal.fire('Info', 'Select a dataset first', 'info')
              setActivePanel(prev => prev === 'kpis' ? null : 'kpis')
            }}
            className={`p-2 rounded hover:bg-gray-200 ${activePanel === 'kpis' ? 'bg-gray-200' : ''
              } ${!selectedDatasetId ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Add KPIs"
            disabled={!selectedDatasetId}
          >
            <FiTrendingUp size={20} />
          </button>
          <span className="text-[10px]">KPIs</span>
        </div>
        <div className="flex-1" />
        {/* Save */}
        <div className="flex flex-col items-center">
          <button
            onClick={saveDashboard}
            className="p-2 rounded hover:bg-gray-200"
            title="Save Dashboard"
          >
            <FiSave size={20} />
          </button>
          <span className="text-[10px]">Save</span>
        </div>
      </aside>

      {/* Panels */}
      {activePanel && (
        <div
          className="fixed top-[60px] left-[70px] w-[320px] h-[500px] z-30 flex bg-opacity-50"
          onClick={() => setActivePanel(null)}
        >
          <div
            className="bg-white border border-gray-200 w-full h-full rounded-lg overflow-hidden drop-shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {activePanel === 'dataset' ? 'Datasets'
                  : activePanel === 'charts' ? 'Charts'
                    : 'KPIs'}
              </h3>
              <button onClick={() => setActivePanel(null)} className="p-1">
                <FiX size={20} />
              </button>
            </div>
            {/* Content */}
            <div className="p-2 h-full overflow-y-auto">
              {activePanel === 'dataset' && (
                datasets.map(ds => (
                  <div
                    key={ds.id}
                    onClick={() => selectDataset(ds.id)}
                    className={`px-3 py-2 cursor-pointer flex justify-between items-center rounded hover:bg-gray-100 ${selectedDatasetId === ds.id ? 'bg-gray-100' : ''}`}
                  >
                    <span className="truncate">{ds.name}</span>
                  </div>
                ))
              )}
              {activePanel === 'charts' && (
                selectedDatasetId
                  ? charts
                    .filter(
                      (c) =>
                        !widgets.some((w) => w.type === 'chart' && w.data.id === c.id)
                    )
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => addWidgetToCanvas(c, 'chart')}
                        className="px-3 py-2 cursor-pointer flex items-center space-x-2 rounded hover:bg-gray-100"
                      >
                        <ChartIcon type={c.type} className="text-xl" />
                        <span className="truncate">{c.name}</span>
                      </div>
                    ))
                  : <div className="p-4 text-gray-500">Select a dataset first.</div>
              )}
              {activePanel === 'kpis' && (
                selectedDatasetId
                  ? kpis
                    .filter(k => !widgets.some(w => w.type === 'kpi' && w.data.id === k.id))
                    .map(k => (
                      <div
                        key={k.id}
                        onClick={() => addWidgetToCanvas(k, 'kpi')}
                        className="px-3 py-2 cursor-pointer rounded hover:bg-gray-100"
                      >
                        {k.name}
                      </div>
                    ))
                  : <div className="p-4 text-gray-500">Select a dataset first.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <main
        className="ml-[60px] mt-[55px] p-4 bg-[#F4F5F9] overflow-auto"
        style={{ height: 'calc(100vh - 55px)' }}
      >
        {widgets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            {selectedDatasetId
              ? 'Add charts or KPIs from the sidebar.'
              : 'Select a dataset to begin.'}
          </div>
        ) : (
          <GridLayout
            className='layout'
            layout={widgets.map(w => w.layout)}
            cols={12}
            rowHeight={ROW_HEIGHT}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
            compactType="vertical"
          >
            {widgets.map((w, idx) => (
              <div key={w.key} data-grid={w.layout} className="bg-white rounded shadow relative">
                {/* remove */}
                <div
                  className="absolute top-2 right-2 cursor-pointer text-gray-500"
                  onClick={() => removeWidget(w.key)}
                >
                  <RxCross2 size={18} />
                </div>

                {w.type === 'chart' ? (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center border-b px-2 py-3 drag-handle cursor-move">
                      <RiDraggable size={16} />
                      <span className="ml-2">{w.data.name}</span>
                    </div>
                    <div
                      className="w-full pt-8"
                      style={{
                        height: 'calc(100% - 32px)',
                        boxSizing: 'border-box',
                        flexGrow: 1,
                      }}>
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={getHighchartsOptions(
                          {
                            type: w.data.type,
                            data: w.data.data,
                            name: w.data.name,
                            x_axis: w.data.x_axis,
                            y_axis: w.data.y_axis,
                          },
                          idx
                        )}
                        containerProps={{ style: { width: '100%', height: '100%' } }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center p-3 drag-handle cursor-move">
                      <RiDraggable size={16} />
                      <span className="ml-2 uppercase text-sm">{w.data.name}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-3xl font-bold">
                      {w.data.value}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </GridLayout>
        )}
      </main>
    </>
  )
}