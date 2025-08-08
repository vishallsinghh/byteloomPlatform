// File: /pages/ViewDashboard/[id].js

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import colorLib from '@kurkle/color'
import {
  FiTrash2,
  FiCode,
  FiEye,
  FiPlus,
  FiX,
} from 'react-icons/fi'
import { RiFilter2Line } from "react-icons/ri"
import { LuCalendarPlus } from "react-icons/lu"
import RGL, { WidthProvider } from 'react-grid-layout'
import Navbar from '../components/Navbar'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { authUrl, url } from '../config';
import { toast, ToastContainer } from "react-toastify";


// Highcharts imports
import Highcharts from 'highcharts/highstock'

import HighchartsReact from 'highcharts-react-official';

// Load highcharts-more dynamically for bubble support
function loadHighchartsMore() {
  if (typeof window === 'undefined') return;

  import('highcharts/highcharts-more')
    .then((HighchartsMoreModule) => {
      // module may export the init function as default or directly
      const initMore = HighchartsMoreModule.default || HighchartsMoreModule;
      if (typeof initMore === 'function') {
        initMore(Highcharts);
      } else {
        console.warn('highcharts-more didn’t export a function:', initMore);
      }
    })
    .catch((err) => {
      console.warn('Could not load highcharts-more:', err);
    });
}

Highcharts.setOptions({
  lang: {
    rangeSelectorZoom: ''
  }
})

// Constants for layout
const GridLayout = WidthProvider(RGL)
const CANVAS_HEIGHT = 615
const ROW_HEIGHT = 30
const MAX_ROWS = Math.floor(CANVAS_HEIGHT / ROW_HEIGHT) // ~20 rows

// Helper to make a colour semi-transparent
const transparentize = (value, opacity = 0.5) => {
  const alpha = 1 - opacity
  return colorLib(value).alpha(alpha).rgbString()
}

/**
 * Build Highcharts (or Highstock) options for a given chart descriptor.
 * If the X-axis labels are all parseable dates, it will return a stockChart config
 * with rangeSelector enabled; otherwise falls back to regular Highcharts options.
 */
function getHighchartsOptions(chart, colorOffset = 0) {
  // Destructure incoming chart object
  const { chart_type, data: chartData, chart_title } = chart;
  const payload = chartData || {};
  const content = payload.data || {};
  const labels = Array.isArray(content.labels) ? content.labels : [];
  const datasets = Array.isArray(content.datasets) ? content.datasets : [];
  const type = (chart_type || '').toLowerCase();

  // Detect if every label is a valid ISO‐date string
  const isDateChart =
    labels.length > 0 &&
    labels.every(lbl => !isNaN(Date.parse(lbl)));

  // Precompute timestamp array if date chart
  const timestamps = isDateChart
    ? labels.map(lbl => Date.parse(lbl))
    : [];

  // Color palettes
  const LINE_COLORS = [
    'rgb(207,37,0)',
    'rgb(7,164,199)',
  ];
  const OTHER_COLORS = [
    'rgb(165, 148, 249)', 'rgb(176, 219, 156)', 'rgb(255, 128, 128)',
    'rgb(148, 181, 249)', 'rgb(185, 178, 219)', 'rgb(249, 165, 148)',
    'rgb(247, 207, 216)', 'rgb(255, 199, 133)', 'rgb(163, 216, 255)',
    'rgb(185, 243, 252)', 'rgb(174, 226, 255)', 'rgb(147, 198, 231)',
    'rgb(254, 222, 255)', 'rgb(244, 191, 191)', 'rgb(255, 217, 192)',
    'rgb(250, 240, 215)', 'rgb(140, 192, 222)', 'rgb(216, 148, 249)'
  ];

  // Choose palette based on type
  let CHART_COLORS = OTHER_COLORS;
  if (type === 'line' || type === 'scatter') {
    CHART_COLORS = LINE_COLORS;
  }
  // Rotate colors by offset
  const offset = colorOffset % CHART_COLORS.length;
  const rotatedColors = [
    ...CHART_COLORS.slice(offset),
    ...CHART_COLORS.slice(0, offset),
  ];

  // Helper to make a colour semi‐transparent
  const transparentize = (value, opacity = 0.5) => {
    const alpha = 1 - opacity;
    return colorLib(value).alpha(alpha).rgbString();
  };

  // ----- DATE‐BASED CHART WITH RANGE SELECTOR -----
  if (isDateChart) {
    // Determine chart subtype (line or column; default to line)
    const stockType = (type === 'column' || type === 'bar') ? 'column' : 'line';

    return {
      chart: { type: stockType },
      title: { text: chart_title || '' },
      subtitle: { text: '' },
      credits: { enabled: false },
      colors: rotatedColors,
      // Highstock range selector config
      rangeSelector: {
        selected: 5,        // e.g. second button (commonly “7d”)
        inputEnabled: true,
        buttons: [
          { type: 'day', count: 1, text: '1D' },
          { type: 'day', count: 7, text: '1W' },
          { type: 'month', count: 1, text: '1M' },
          { type: 'month', count: 3, text: '3M' },
          { type: 'month', count: 6, text: '6M' },
          { type: 'year', count: 1, text: '1Y' },
          { type: 'ytd', text: 'YTD' },
          { type: 'all', text: 'All' },
        ]
      },
      xAxis: {
        type: 'datetime',
        title: { text: payload.x_axis || '' }
      },
      yAxis: {
        title: { text: payload.y_axis || '' }
      },
      tooltip: {},
      plotOptions: stockType === 'line'
        ? {
          line: {
            marker: { enabled: false, radius: 3 },
            states: { hover: { lineWidthPlus: 1 } }
          }
        }
        : {},
      series: datasets.map((ds, i) => {
        const baseColor = rotatedColors[i % rotatedColors.length];
        return {
          name: ds.label ?? `Series ${i + 1}`,
          // map to [timestamp, y] pairs
          data: Array.isArray(ds.data)
            ? ds.data.map((y, idx) => [
              timestamps[idx],
              typeof y === 'number' ? y : parseFloat(y)
            ]).filter(pt => !isNaN(pt[0]) && !isNaN(pt[1]))
            : [],
          color: baseColor,
          ...(stockType === 'line' && {
            fillColor: transparentize(baseColor, 0.5),
            marker: { fillColor: baseColor }
          }),
          ...(stockType === 'column' && {
            borderColor: baseColor,
            borderWidth: 0
          })
        };
      })
    };
  }

  // ----- NON‐DATE CHARTS: FALL BACK TO ORIGINAL LOGIC -----
  const baseOptions = {
    title: { text: chart_title || '' },
    subtitle: { text: '' },
    credits: { enabled: false },
    colors: rotatedColors,
    chart: {},
    xAxis: {},
    yAxis: {},
    series: [],
    plotOptions: {},
    tooltip: {},
  };

  // Helper to build series in non‐date mode
  const makeSeries = () =>
    datasets.map((ds, i) => {
      const baseColor = rotatedColors[i % rotatedColors.length];
      const seriesObj = { name: ds.label ?? `Series ${i + 1}` };

      if (type === 'scatter') {
        // scatter: look for {x,y} or numeric
        const pts = Array.isArray(ds.data)
          ? ds.data.map((pt, idx) => {
            if (pt && typeof pt === 'object' && 'x' in pt && 'y' in pt) {
              return [pt.x, pt.y];
            } else {
              const y = typeof pt === 'number' ? pt : parseFloat(pt);
              return isNaN(y) ? null : [idx, y];
            }
          }).filter(p => p !== null)
          : [];
        seriesObj.data = pts;
      } else if (type === 'bubble') {
        // bubble: x=parsed label or idx, y=value, z=value
        const pts = Array.isArray(ds.data)
          ? ds.data.map((value, idx) => {
            const lbl = labels[idx];
            let x = parseFloat(lbl);
            if (isNaN(x)) x = idx;
            const y = typeof value === 'number' ? value : parseFloat(value);
            return isNaN(y) ? null : { x, y, z: y, name: lbl };
          }).filter(pt => pt !== null)
          : [];
        seriesObj.data = pts;
        seriesObj.color = baseColor;
        return seriesObj;
      } else {
        // all other types: simple numeric array
        seriesObj.data = Array.isArray(ds.data) ? ds.data : [];
      }

      // style per type
      if (type === 'bar' || type === 'column') {
        seriesObj.color = baseColor;
        seriesObj.borderColor = baseColor;
        seriesObj.borderWidth = 0;
      } else if (type === 'line') {
        seriesObj.color = baseColor;
        seriesObj.fillColor = transparentize(baseColor, 0.5);
        seriesObj.marker = { fillColor: baseColor };
      } else if (['radar', 'area', 'areaspline'].includes(type)) {
        seriesObj.color = baseColor;
        seriesObj.marker = { fillColor: baseColor };
      } else if (['polararea', 'polar-area', 'polar'].includes(type)) {
        seriesObj.color = transparentize(baseColor, 0.5);
        seriesObj.borderColor = '#ffffff';
        seriesObj.borderWidth = 1;
      }

      return seriesObj;
    });

  // Build chart based on type
  switch (type) {
    case 'bar':
    case 'column':
      baseOptions.chart = { type: 'column' };
      baseOptions.xAxis = { categories: labels, title: { text: payload.x_axis } };
      baseOptions.yAxis = { title: { text: payload.y_axis } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        column: {
          states: { inactive: { enabled: true, opacity: 0.3 } },
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
              },
            },
          },
          borderWidth: 0,
        },
      };
      break;

    case 'multi_bar':
      baseOptions.chart = { type: 'column' };
      baseOptions.xAxis = { categories: labels, title: { text: payload.x_axis } };
      baseOptions.yAxis = { title: { text: '' } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        column: {
          states: { inactive: { enabled: true, opacity: 0.3 } },
          point: {
            events: {
              mouseOver() { /* … */ },
              mouseOut() { /* … */ },
            },
          },
          borderWidth: 0,
        },
      };
      break;

    case 'multi_line':
      baseOptions.chart = { type: 'line' };
      baseOptions.xAxis = { categories: labels, title: { text: payload.x_axis } };
      baseOptions.yAxis = { title: { text: '' } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        line: {
          marker: { enabled: false },
          states: { hover: { lineWidthPlus: 1 } },
        },
      };
      break;

    case 'line':
      baseOptions.chart = { type: 'line' };
      baseOptions.xAxis = { categories: labels, title: { text: payload.x_axis } };
      baseOptions.yAxis = { title: { text: payload.y_axis } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        line: {
          marker: { enabled: false, radius: 3 },
          states: { hover: { lineWidthPlus: 1 } },
        },
      };
      break;

    case 'pie':
      baseOptions.chart = { type: 'pie' };
      if (datasets.length > 0) {
        const ds0 = datasets[0];
        const values = Array.isArray(ds0.data) ? ds0.data : [];
        const maxValue = values.length ? Math.max(...values) : null;
        const maxIndex = maxValue !== null ? values.findIndex(v => v === maxValue) : -1;
        baseOptions.series = [{
          name: ds0.label || 'Pie',
          innerSize: '0%',
          data: labels.map((lbl, idx) => {
            const y = typeof ds0.data[idx] === 'number'
              ? ds0.data[idx]
              : parseFloat(ds0.data[idx]) || 0;
            return {
              name: lbl,
              y,
              color: rotatedColors[idx % rotatedColors.length],
              sliced: idx === maxIndex,
              selected: idx === maxIndex,
            };
          }),
        }];
      }
      baseOptions.plotOptions = {
        pie: {
          allowPointSelect: true,
          borderWidth: 2,
          cursor: 'pointer',
          dataLabels: { enabled: true, distance: 20 },
        },
      };
      break;

    case 'doughnut':
      baseOptions.chart = { type: 'pie' };
      if (datasets.length > 0) {
        const ds0 = datasets[0];
        baseOptions.series = [{
          name: ds0.label || 'Doughnut',
          innerSize: '60%',
          data: labels.map((lbl, idx) => {
            const y = typeof ds0.data[idx] === 'number'
              ? ds0.data[idx]
              : parseFloat(ds0.data[idx]) || 0;
            return {
              name: lbl,
              y,
              color: rotatedColors[idx % rotatedColors.length],
            };
          }),
        }];
      }
      baseOptions.plotOptions = {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: { enabled: true },
        },
      };
      break;

    case 'radar':
      baseOptions.chart = { polar: true, type: 'area' };
      baseOptions.xAxis = {
        categories: labels,
        tickmarkPlacement: 'on',
        lineWidth: 0,
      };
      baseOptions.yAxis = {
        gridLineInterpolation: 'polygon',
        lineWidth: 0,
        min: 0,
      };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        series: { marker: { enabled: false } },
      };
      break;

    case 'polararea':
    case 'polar-area':
    case 'polar':
      baseOptions.chart = { polar: true, type: 'column' };
      baseOptions.xAxis = {
        categories: labels,
        tickmarkPlacement: 'on',
        lineWidth: 0,
      };
      baseOptions.yAxis = {
        min: 0,
        endOnTick: false,
        showLastLabel: true,
      };
      if (datasets.length > 0) {
        const ds0 = datasets[0];
        baseOptions.series = [{
          name: ds0.label || 'Polar Area',
          data: Array.isArray(ds0.data)
            ? ds0.data.map(val => (typeof val === 'number' ? val : parseFloat(val) || 0))
            : [],
          borderColor: '#ffffff',
          borderWidth: 1,
        }];
      }
      baseOptions.plotOptions = {
        column: { pointPadding: 0, groupPadding: 0 },
      };
      break;

    case 'scatter':
      baseOptions.chart = { type: 'scatter', zoomType: 'xy' };
      baseOptions.xAxis = { title: { text: payload.x_axis } };
      baseOptions.yAxis = { title: { text: payload.y_axis } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        scatter: {
          marker: {
            radius: 4,
            states: {
              hover: { enabled: true, radiusPlus: 2 }
            },
          },
        },
      };
      break;

    case 'bubble':
      baseOptions.chart = { type: 'bubble', plotBorderWidth: 1, zoomType: 'xy' };
      baseOptions.xAxis = {
        title: { text: payload.x_axis },
        categories: labels,
        type: 'category',
      };
      baseOptions.yAxis = { title: { text: payload.y_axis } };
      baseOptions.series = datasets.map((ds, i) => {
        const baseColor = rotatedColors[i % rotatedColors.length];
        const pts = Array.isArray(ds.data)
          ? ds.data.map((value, idx) => {
            const lbl = labels[idx];
            let x = parseFloat(lbl);
            if (isNaN(x)) x = idx;
            const y = typeof value === 'number' ? value : parseFloat(value);
            return isNaN(y) ? null : { x, y, z: y, name: lbl };
          }).filter(p => p !== null)
          : [];
        return {
          name: ds.label ?? `Series ${i + 1}`,
          data: pts,
          color: baseColor,
        };
      });
      baseOptions.plotOptions = {
        bubble: {
          minSize: 5,
          maxSize: '20%',
          states: { hover: { enabled: true, halo: { size: 5 } } },
          tooltip: {
            pointFormat: '<b>{point.name}</b><br/>Value: {point.y}<br/>Size: {point.z}'
          },
        },
      };
      break;

    default:
      // fallback to area spline
      baseOptions.chart = { type: 'areaspline' };
      baseOptions.xAxis = { categories: labels, title: { text: payload.x_axis } };
      baseOptions.yAxis = { title: { text: payload.y_axis } };
      baseOptions.series = makeSeries();
      baseOptions.plotOptions = {
        areaspline: { marker: { enabled: false, radius: 3 } },
      };
      break;
  }

  return baseOptions;
}


function ViewDashboardPage() {

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams /*, setSearchParams*/] = useSearchParams();

  // Fetched dashboard data:
  const [dashboardName, setDashboardName] = useState('')
  const [widgets, setWidgets] = useState([])
  const [layout, setLayout] = useState([])

  // Embed code state (for normal mode)
  const [embedCode, setEmbedCode] = useState('')

  // Filters state: array of { key: string, value: string }
  const [filters, setFilters] = useState([])
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [newFilterKey, setNewFilterKey] = useState('')
  const [newFilterValue, setNewFilterValue] = useState('')

  // === New state for Range Selector ===
  const [rangePanelOpen, setRangePanelOpen] = useState(false)
  // Possible values: 'Custom','Today','Yesterday','7D','30D','3M','6M','12M','YTD'
  const [selectedRangeOption, setSelectedRangeOption] = useState('30D')
  // For custom date range: YYYY-MM-DD strings
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const id = searchParams.get('id')
  const embed = searchParams.get('embed')
  const isEmbedMode = embed === '1'

  // Load highcharts-more once on client
  useEffect(() => {
    loadHighchartsMore()
  }, [])

  // Helper: format Date object to 'YYYY-MM-DD'
  function formatDateYYYYMMDD(dateObj) {
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Apply date range helper
  const applyDateRange = () => {
    let start = null
    let end = null
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (selectedRangeOption) {
      case 'Today':
        start = new Date(today)
        end = new Date(today)
        break
      case 'Yesterday': {
        const y = new Date(today)
        y.setDate(y.getDate() - 1)
        start = y
        end = y
        break
      }
      case '7D': {
        const s = new Date(today)
        s.setDate(s.getDate() - 6)
        start = s
        end = today
        break
      }
      case '30D': {
        const s = new Date(today)
        s.setDate(s.getDate() - 29)
        start = s
        end = today
        break
      }
      case '3M': {
        const s = new Date(today)
        s.setMonth(s.getMonth() - 3)
        start = s
        end = today
        break
      }
      case '6M': {
        const s = new Date(today)
        s.setMonth(s.getMonth() - 6)
        start = s
        end = today
        break
      }
      case '12M': {
        const s = new Date(today)
        s.setFullYear(s.getFullYear() - 1)
        start = s
        end = today
        break
      }
      case 'YTD': {
        const s = new Date(today.getFullYear(), 0, 1)
        start = s
        end = today
        break
      }
      case 'Custom':
        if (customStartDate && customEndDate) {
          const s = new Date(`${customStartDate}T00:00:00`)
          const e = new Date(`${customEndDate}T00:00:00`)
          if (s <= e) {
            start = s
            end = e
          }
        }
        break
      default:
        break
    }

    if (start && end) {
      const startStr = formatDateYYYYMMDD(start)
      const endStr = formatDateYYYYMMDD(end)
      setFilters(prev => {
        const others = prev.filter(f => f.key !== 'start_date' && f.key !== 'end_date')
        return [
          ...others,
          { key: 'start_date', value: startStr },
          { key: 'end_date', value: endStr },
        ]
      })
    }
  }

// Updated fetchDashboardAndWidgets function for new API schema
useEffect(() => {
  if (!id) return

  async function fetchDashboardAndWidgets() {
    setLoading(true)
    setError(null)
    
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
      // 1) Fetch the dashboard layout
      const resp = await fetch(`${authUrl.BASE_URL}/dashboard/layout/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      })
      
      if (!resp.ok) throw new Error(`Dashboard layout fetch failed: ${resp.status}`)
      const json = await resp.json()

      setDashboardName(json.name || '')
      const baseWidgets = json.widgets || []

      console.log('Base widgets from dashboard:', baseWidgets); // Debug log

      // 2) Fetch each widget's data using the new API structure
      const detailedWidgets = await Promise.all(
        baseWidgets.map(async (widget) => {
          try {
            let wJson = null;

            if (widget.type === 'chart') {
              // For charts: use the new chart data endpoint
              const response = await fetch(`${authUrl.BASE_URL}/dataset/chart/${widget.id}/data/`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ db_token: dbToken })
              });

              if (response.ok) {
                const result = await response.json();
                console.log(`Chart widget ${widget.id} result:`, result); // Debug log
                
                // Transform to expected format
                wJson = {
                  chart_id: result?.data?.chart_id || widget.id,
                  chart_title: result?.data?.chart_title || 'Chart',
                  chart_type: result?.data?.chart_type || 'bar',
                  x_axis: result?.data?.x_axis || '',
                  y_axis: result?.data?.y_axis || '',
                  data: result?.data?.data || { labels: [], datasets: [] }
                };
              } else {
                console.error(`Failed to fetch chart widget ${widget.id}:`, response.status);
                throw new Error(`Chart widget ${widget.id} fetch failed: ${response.status}`);
              }

            } else if (widget.type === 'kpi') {
              // For KPIs: use the new KPI data endpoint
              const response = await fetch(`${authUrl.BASE_URL}/dataset/kpi/${widget.id}/data/`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ db_token: dbToken })
              });

              if (response.ok) {
                const result = await response.json();
                console.log(`KPI widget ${widget.id} result:`, result); // Debug log
                
                // Transform to expected format
                wJson = {
                  kpi_id: result?.data?.kpi_id || widget.id,
                  kpi_name: result?.data?.kpi_name || 'KPI',
                  value: result?.data?.value || result?.data?.raw_value || 'N/A'
                };
              } else {
                console.error(`Failed to fetch KPI widget ${widget.id}:`, response.status);
                throw new Error(`KPI widget ${widget.id} fetch failed: ${response.status}`);
              }
            }

            return { ...widget, data: wJson }

          } catch (err) {
            console.error(`Error fetching widget ${widget.id}:`, err);
            // Return widget with error data to prevent complete failure
            return { 
              ...widget, 
              data: widget.type === 'chart' 
                ? { chart_title: 'Error Loading Chart', data: { labels: [], datasets: [] } }
                : { kpi_name: 'Error Loading KPI', value: 'Error' }
            };
          }
        })
      )

      console.log('Detailed widgets:', detailedWidgets); // Debug log

      setWidgets(detailedWidgets)
      setLayout(
        detailedWidgets.map(w => ({
          ...(w.layout || {}),
          i: w.key,
        }))
      )
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  fetchDashboardAndWidgets()
}, [id, filters])
  // Prepare embed code in normal mode
  useEffect(() => {
    if (!id) return
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      setEmbedCode(
        `<iframe src="${origin}/view-dashboard?id=${id}&embed=1" ` +
        `width="100%" height="${CANVAS_HEIGHT}" ` +
        `frameborder="0" allowfullscreen></iframe>`
      )
    }
  }, [id])

  function isIsoDateString(lbl) {
    return (
      typeof lbl === 'string' &&
      // matches "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS…" 
      /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(lbl) &&
      !isNaN(Date.parse(lbl))
    )
  }

  function renderWidget(widget, idx) {
    const { key, type, data } = widget

    // Chart widgets
    if (type === 'chart') {
      const content = data.data || {}
      const labels = Array.isArray(content.labels) ? content.labels : []
      const datasets = Array.isArray(content.datasets) ? content.datasets : []
      const hasDatasets = datasets.length > 0

      // ONLY true if every label is a parsable ISO-date string
      const isDateChart =
        labels.length > 0 &&
        labels.every(lbl => isIsoDateString(lbl))

      return (
        <div
          key={key}
          className="relative bg-white rounded overflow-hidden h-full flex flex-col"
        >
          <div className="border-b flex items-center px-3 py-3 border-gray-200 font-medium">
            {data.chart_title || '(No Title)'}
          </div>
          <div
            className="w-full pt-5"
            style={{
              height: 'calc(100% - 40px)',
              boxSizing: 'border-box',
              flexGrow: 1,
            }}
          >
            {hasDatasets ? (
              typeof window !== 'undefined' && (
                <HighchartsReact
                  highcharts={Highcharts}
                  // only stockChart (with rangeSelector) for real dates
                  constructorType={isDateChart ? 'stockChart' : undefined}
                  options={getHighchartsOptions(
                    {
                      chart_type: data.chart_type,
                      data,
                    },
                    idx
                  )}
                  containerProps={{ style: { width: '100%', height: '100%' } }}
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data to display
              </div>
            )}
          </div>
        </div>
      )
    }

    // KPI widgets remain unchanged
    return (
      <div
        key={key}
        className="relative bg-white rounded border border-gray-200 h-full flex flex-col"
      >
        <div className="flex-1 p-3 flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-gray-500 uppercase">
            {data.kpi_name}
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 flex items-center">
            <span>{data.value}</span>
          </div>
        </div>
      </div>
    )
  }

  // Handler to show embed code popup
  const showEmbedPopup = () => {
    Swal.fire({
      title: 'Embed Dashboard',
      html:
        `<textarea id="embedCodeTextarea" readonly style="width:100%;height:120px;font-family:monospace;">` +
        embedCode +
        `</textarea>`,
      showCancelButton: true,
      confirmButtonText: 'Copy to Clipboard',
      cancelButtonText: 'Close',
      preConfirm: () => {
        const textarea = Swal.getPopup().querySelector('#embedCodeTextarea')
        if (textarea) {
          textarea.select()
          document.execCommand('copy')
          return true
        }
        return false
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: 'Embed code copied to clipboard.',
        })
      }
    })
  }

  // Filter handlers
  const addFilter = () => {
    const key = newFilterKey.trim()
    const value = newFilterValue.trim()
    if (!key) {
      Swal.fire('Error', 'Filter key cannot be empty', 'error')
      return
    }
    setFilters(prev => {
      const others = prev.filter(f => f.key !== key)
      return [...others, { key, value }]
    })
    setNewFilterKey('')
    setNewFilterValue('')
  }
  const removeFilter = (key) => {
    setFilters(prev => prev.filter(f => f.key !== key))
  }

  // -----------------------------
  // SKELETON LOADING PLACEHOLDERS
  // -----------------------------
  const skeletonCount = 8

  if (loading) {
    // EMBED MODE: skeleton grid in fixed-height canvas
    if (isEmbedMode) {
      return (
        <div
          style={{
            width: '100%',
            height: `${CANVAS_HEIGHT}px`,
            background: '#f0f0f0',
          }}
        >
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4"
            style={{ height: '100%' }}
          >
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 animate-pulse rounded h-full"
              />
            ))}
          </div>
        </div>
      )
    }

    // NORMAL MODE: Navbar + skeleton title bar + skeleton cards
    return (
      <>
        <Navbar />
        <div className="h-[calc(100vh-55px)] bg-[#E7ECF2] p-6 overflow-auto">
          {/* Skeleton for title */}
          <div className="mb-6 h-8 w-48 bg-gray-200 animate-pulse rounded" />

          {/* Skeleton grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="border border-gray-300 rounded-lg bg-gray-200 animate-pulse h-64"
              />
            ))}
          </div>
        </div>
      </>
    )
  }

  // -----------------------------
  // ERROR STATES
  // -----------------------------
  if (error) {
    if (isEmbedMode) {
      return (
        <div
          style={{
            width: '100%',
            height: `${CANVAS_HEIGHT}px`,
            color: 'red',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {error}
        </div>
      )
    }
    return (
      <>
        <Navbar />
        <div className="h-[calc(100vh-55px)] bg-[#E7ECF2] text-gray-800 flex items-center justify-center">
          <span className="text-red-600">{error}</span>
        </div>
      </>
    )
  }

  // -----------------------------
  // EMBED MODE FINAL RENDER
  // -----------------------------
  if (isEmbedMode) {
    return (
      <div className="relative bg-[#E7ECF2] w-full h-[100vh] text-gray-800 overflow-hidden">
        <div style={{ width: '100%', height: `${CANVAS_HEIGHT}px` }}>
          <GridLayout
            layout={layout}
            cols={12}
            rowHeight={ROW_HEIGHT}
            margin={[10, 10]}
            containerPadding={[10, 10]}
            isDraggable={false}
            isResizable={false}
            compactType={null}
            preventCollision={true}
            maxRows={MAX_ROWS}
          >
            {widgets.map((w, idx) => (
              <div key={w.key} data-grid={layout.find((l) => l.i === w.key)}>
                {renderWidget(w, idx)}
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    )
  }

  // -----------------------------
  // NORMAL MODE FINAL RENDER
  // -----------------------------
  return (
    <>
      <Navbar />
      <div className="flex bg-white text-gray-800">
        {/* Left sidebar */}
        {/* <aside className="w-[60px] h-[calc(100vh-55px)] fixed top-[55px] flex flex-col items-center py-4 space-y-4 border-r border-gray-200 bg-white z-20">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(
                  `${window.location.origin}/view-dashboard?id=${id}&embed=1`,
                  '_blank'
                )
              }
            }}
            className="p-2 rounded hover:bg-gray-200"
            title="View Dashboard Only"
          >
            <FiEye size={20} className="text-gray-600" />
          </button>
          <button
            onClick={showEmbedPopup}
            className="p-2 rounded hover:bg-gray-200"
            title="Embed Dashboard"
          >
            <FiCode size={20} className="text-gray-600" />
          </button>
          <div className="flex-1"></div>
          <button
            onClick={deleteDashboard}
            className="p-2 rounded hover:bg-gray-200"
            title="Delete Dashboard"
          >
            <FiTrash2 size={20} className="text-gray-600" />
          </button>
        </aside> */}

        {/* Filter panel */}
        {filterPanelOpen && (
          <div
            className="fixed left-[60px] top-[55px] w-[300px] h-[calc(100vh-55px)] bg-white border-l border-gray-200 shadow-lg z-30 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Filters</h2>
              <button
                onClick={() => setFilterPanelOpen(false)}
                className="p-1 rounded hover:bg-gray-200"
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {filters.length === 0 ? (
                <div className="text-gray-500">No filters added.</div>
              ) : (
                <ul className="space-y-2">
                  {filters.map((f) => (
                    <li key={f.key} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                      <div className="truncate">
                        <span className="font-medium">{f.key}</span>: {f.value}
                      </div>
                      <button
                        onClick={() => removeFilter(f.key)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove filter"
                      >
                        <FiX />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Key</label>
                <input
                  type="text"
                  value={newFilterKey}
                  onChange={(e) => setNewFilterKey(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                  placeholder="e.g. country"
                />
                <label className="block text-sm font-medium text-gray-700 mt-2">Value</label>
                <input
                  type="text"
                  value={newFilterValue}
                  onChange={(e) => setNewFilterValue(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                  placeholder="e.g. USA"
                />
                <button
                  onClick={addFilter}
                  className="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                  Add / Update Filter
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setFilterPanelOpen(false)
                }}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Range Selector panel */}
        {rangePanelOpen && (
          <div
            className="fixed left-[60px] top-[55px] w-[320px] h-[calc(100vh-55px)] bg-white border-l border-gray-200 shadow-lg z-30 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Range Selector</h2>
              <button
                onClick={() => setRangePanelOpen(false)}
                className="p-1 rounded hover:bg-gray-200"
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <div className="space-y-2">
                {['Custom', 'Today', 'Yesterday', '7D', '30D', '3M', '6M', '12M', 'YTD'].map(opt => {
                  const isSel = selectedRangeOption === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        setSelectedRangeOption(opt)
                        if (opt !== 'Custom') {
                          setCustomStartDate('')
                          setCustomEndDate('')
                        }
                      }}
                      className={
                        "w-full text-left px-3 py-2 rounded " +
                        (isSel
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                      }
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {selectedRangeOption === 'Custom' && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                  {customStartDate && customEndDate && customStartDate > customEndDate && (
                    <div className="text-red-500 text-sm">
                      Start date must be before or equal to end date.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  applyDateRange()
                  setRangePanelOpen(false)
                }}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                disabled={
                  selectedRangeOption === 'Custom' &&
                  (!customStartDate || !customEndDate || customStartDate > customEndDate)
                }
              >
                Apply
              </button>
              <button
                onClick={() => setRangePanelOpen(false)}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div
          className="mt-[55px] flex-1 flex flex-col h-full min-h-[calc(100vh-55px)] overflow-hidden"
          onClick={() => {
            if (filterPanelOpen) setFilterPanelOpen(false)
            if (rangePanelOpen) setRangePanelOpen(false)
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between bg-[#F9FAFC] border-b border-gray-200 px-6 py-3">
            <h1 className="text-2xl font-semibold">{dashboardName}</h1>
          </div>

          {/* Canvas */}
          <main className="flex-1 bg-[#F4F5F9] p-4 flex flex-col items-center">
            <div className="relative bg-[#F4F5F9] w-full h-full">
              {widgets.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 px-4 text-center">
                  (No widgets in this dashboard)
                </div>
              ) : (
                <GridLayout
                  className="layout"
                  layout={widgets.map((w) => w.layout)}
                  cols={12}
                  rowHeight={ROW_HEIGHT}
                  margin={[10, 10]}
                  containerPadding={[10, 10]}
                  isDraggable={false}
                  isResizable={false}
                  compactType={null}
                  preventCollision={true}
                  maxRows={MAX_ROWS}
                >
                  {widgets.map((widget, idx) => (
                    <div
                      key={widget.key}
                      className="rounded-sm"
                      data-grid={layout.find((l) => l.i === widget.key)}
                    >
                      {renderWidget(widget, idx)}
                    </div>
                  ))}
                </GridLayout>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default ViewDashboardPage
