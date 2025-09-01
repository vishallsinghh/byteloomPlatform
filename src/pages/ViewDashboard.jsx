// File: /pages/ViewDashboard.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import RGL, { WidthProvider } from 'react-grid-layout'
import Navbar from '../components/Navbar'
import { authUrl, url } from '../config'
import { toast } from "react-toastify"

// Icons
import { RiFilter2Line, RiRobot2Line } from "react-icons/ri"
import { MdOutlineAddchart } from "react-icons/md"
import { RxDragHandleDots2 } from "react-icons/rx"
import {
  FiTrash2, FiSave, FiX, FiEdit, FiMoreVertical, FiFilter,
  FiMaximize, FiSearch, FiChevronDown, FiSettings,
  FiTrendingUp, FiBarChart, FiPieChart, FiCode,
  FiMessageSquare, FiSend,
} from "react-icons/fi"
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Highcharts
import Highcharts from "highcharts"
import HighchartsReact from "highcharts-react-official"
import worldMap from "@highcharts/map-collection/custom/world.geo.json"
import "highcharts/highcharts-more"
import "highcharts/modules/stock"
import "highcharts/modules/map"
import "highcharts/modules/boost" 


// Constants
const GridLayout = WidthProvider(RGL)
const ROW_HEIGHT = 30
const COLS = 12

// Color palette
const LINE_COLORS = ['rgb(207,37,0)', 'rgb(7,164,199)']
const OTHER_COLORS = [
  'rgb(165,148,249)', 'rgb(176,219,156)', 'rgb(255,128,128)',
  'rgb(148,181,249)', 'rgb(185,178,219)', 'rgb(249,165,148)',
  'rgb(247,207,216)', 'rgb(255,199,133)', 'rgb(163,216,255)',
  'rgb(185,243,252)', 'rgb(174,226,255)', 'rgb(147,198,231)',
  'rgb(254,222,255)', 'rgb(244,191,191)', 'rgb(255,217,192)',
  'rgb(250,240,215)', 'rgb(140,192,222)', 'rgb(216,148,249)'
]

// ---------- helpers: net/concurrency/cache ----------
async function pLimitAll(items, limit, fn) {
  const ret = []; let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++
      ret[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return ret
}

async function fetchJSON(url, options = {}, { timeoutMs = 20000, retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal })
      clearTimeout(to)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      clearTimeout(to)
      if (attempt === retries) throw e
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
    }
  }
}

function cacheKey(datasetId, widgetId, dbToken) {
  return `wdcache:${datasetId}:${widgetId}:${dbToken}`
}
function readCache(datasetId, widgetId, dbToken) {
  try { return JSON.parse(sessionStorage.getItem(cacheKey(datasetId, widgetId, dbToken))) } catch { return null }
}
function writeCache(datasetId, widgetId, dbToken, value) {
  try { sessionStorage.setItem(cacheKey(datasetId, widgetId, dbToken), JSON.stringify(value)) } catch {}
}

// ---------- small utils ----------
const transparentizeRgb = (rgbStr, opacity = 0.5) => {
  const m = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i)
  if (!m) return rgbStr
  const [, r, g, b] = m
  return `rgba(${r}, ${g}, ${b}, ${1 - opacity})`
}

const isErrorish = (obj) => !obj || obj.error || obj.status === false || obj.success === false
const isValidChartData = (d) => !isErrorish(d) && typeof d.chart_type === 'string'
const isValidKpiData = (d) => !isErrorish(d)

function chartHasData(chartData) {
  const content = chartData?.data || {}
  const labels = Array.isArray(content.labels) ? content.labels : []
  const datasets = Array.isArray(content.datasets) ? content.datasets : []
  if (labels.length === 0 || datasets.length === 0) return false
  return datasets.some(ds => Array.isArray(ds?.data) && ds.data.length > 0)
}

const normTypeStr = (t = '') => String(t || '').toLowerCase().replace(/\(.+?\)/g, '').trim()
const isNumericType = (t = '') => /(int|numeric|double|real|bigint|smallint|decimal|^20$|^21$|^23$|^700$|^701$|^1700$)/i.test(normTypeStr(t))
const isDateType = (t = '') => /(date|timestamp|time zone|^1082$|^1114$|^1184$)/i.test(normTypeStr(t))
const isBooleanType = (t = '') => /(boolean|^16$)/i.test(normTypeStr(t))
const isJsonType = (t = '') => /(jsonb?|^114$|^3802$)/i.test(normTypeStr(t))
const isTextType = (t = '') => /(varchar|character varying|text|^25$|^1043$)/i.test(normTypeStr(t))
function categorizeColumnType(t){ const s = normTypeStr(t); if(!s) return 'other'; if(isDateType(s)) return 'date'; if(isBooleanType(s)) return 'boolean'; if(isNumericType(s)) return 'number'; if(isJsonType(s)) return 'json'; if(isTextType(s)) return 'text'; return 'other' }

const TEXT_OPS = ['contains','not_contains','begins_with','ends_with']
const NUM_OPS = ['=','!=','>','<']
const BOOL_OPS = ['=','!=','in','not_in','is_empty','is_not_empty']
const prettyOp = (op)=>({contains:'Contains',not_contains:'Not contains',begins_with:'Begins with',ends_with:'Ends with','=':'Equals','!=':'Not equal','>':'Greater than','<':'Less than','>=':'Greater or equal','<=':'Less or equal',between:'Between',in_ranges:'In selected ranges',in:'In',not_in:'Not in',is_empty:'Is empty',is_not_empty:'Is not empty'}[op]||op)

const fmtNumber = (n)=>{ const abs=Math.abs(n); if(abs>=1e9) return `${(n/1e9).toFixed(1).replace(/\.0$/,'')}B`; if(abs>=1e6) return `${(n/1e6).toFixed(1).replace(/\.0$/,'')}M`; if(abs>=1e3) return `${(n/1e3).toFixed(1).replace(/\.0$/,'')}k`; return `${n}` }

function niceStep(span,maxBins=12){ if(!isFinite(span)||span<=0) return 1; const rough=span/Math.max(1,maxBins); const pow10=Math.pow(10,Math.floor(Math.log10(rough))); const base=rough/pow10; const niceBase=base<=1?1:base<=2?2:base<=5?5:10; return niceBase*pow10 }
function computeNumericBins(values,maxBins=12){ const nums=values.map(Number).filter(v=>isFinite(v)); if(!nums.length) return []; const min=Math.min(...nums); const max=Math.max(...nums); if(min===max){ return [{key:`${min}..${max}`,start:min,end:max,label:fmtNumber(min),c:nums.length,isRange:true}] } const step=Math.max(niceStep(max-min,maxBins),Number.EPSILON); const startEdge=Math.floor(min/step)*step; const endEdge=Math.ceil(max/step)*step; const bins=[]; for(let a=startEdge;a<endEdge;a+=step){ const b=a+step; bins.push({key:`${a}..${b}`,start:a,end:b,label:`${fmtNumber(a)}–${fmtNumber(b)}`,c:0,isRange:true}) } nums.forEach(v=>{ const idx=Math.min(Math.floor((v-startEdge)/step),bins.length-1); bins[idx].c+=1 }); while(bins.length&&bins[0].c===0) bins.shift(); while(bins.length&&bins[bins.length-1].c===0) bins.pop(); return bins }

function labelsLookLikeDates(labels){ if(!Array.isArray(labels)||labels.length===0) return false; let valid=0; const sample=labels.slice(0,Math.min(12,labels.length)); for(const lbl of sample){ const t=Date.parse(lbl); if(!isNaN(t)) valid++ } return valid>=Math.ceil(sample.length*0.6) }

function buildPresetQuery(field,preset){ if(!preset||preset==='All') return ''; const map={'7D':'7d','30D':'30d','90D':'90d','1Y':'1y','YTD':'ytd'}; const date=map[preset]||String(preset).toLowerCase(); const params=new URLSearchParams(); params.set('date',date); if(field) params.set('field',field); const qs=params.toString(); return qs?`?${qs}`:'' }

// ---------- AutoSizeHighchart (debounced) + SmartChart (lazy) ----------
function AutoSizeHighchart({ options, constructorType = 'chart', minHeight = 120 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const rafId = useRef(0)
  const lastW = useRef(0)
  const lastH = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const onResize = (entry) => {
      if (!entry || !chartRef.current) return
      const { width, height } = entry.contentRect
      const w = Math.max(60, Math.floor(width))
      const h = Math.max(minHeight, Math.floor(height))
      if (Math.abs(w - lastW.current) < 4 && Math.abs(h - lastH.current) < 4) return
      lastW.current = w; lastH.current = h
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        chartRef.current && chartRef.current.setSize(w, h, false)
      })
    }
    const ro = new ResizeObserver((entries)=>onResize(entries[0]))
    ro.observe(el)
    return () => { cancelAnimationFrame(rafId.current); ro.disconnect() }
  }, [minHeight])

  const memoOpts = useMemo(() => ({ ...options, chart: { ...(options.chart || {}) } }), [options])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <HighchartsReact
        highcharts={Highcharts}
        options={memoOpts}
        constructorType={constructorType}
        callback={(chart)=>{ chartRef.current = chart }}
      />
    </div>
  )
}

function SmartChart({ options, constructorType = 'chart', minHeight = 120 }) {
  const [visible, setVisible] = useState(false)
  const hostRef = useRef(null)

  useEffect(() => {
    let observer; let idleId
    const start = () => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => setVisible(true), { timeout: 1200 })
      } else {
        idleId = setTimeout(() => setVisible(true), 300)
      }
    }
    if (hostRef.current && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          start()
          observer.disconnect()
        }
      }, { rootMargin: '200px' })
      observer.observe(hostRef.current)
    } else {
      start()
    }
    return () => {
      if (observer) observer.disconnect()
      if ('cancelIdleCallback' in window && idleId) window.cancelIdleCallback(idleId)
      else clearTimeout(idleId)
    }
  }, [])

  return (
    <div ref={hostRef} className="w-full h-full">
      {visible ? (
        <AutoSizeHighchart options={options} constructorType={constructorType} minHeight={minHeight} />
      ) : (
        <div className="w-full h-full grid place-items-center text-xs text-gray-400">Preparing…</div>
      )}
    </div>
  )
}

// ---------- Build chart options (with perf tweaks) ----------
function buildChartOptions(chart, colorOffset = 0, useStock = false) {
  const { chart_type, data: payload, chart_title, x_axis, y_axis } = chart
  const type = String(chart_type || '').toLowerCase()
  const data = payload?.data || {}
  const labels = Array.isArray(data.labels) ? data.labels : []
  const datasets = Array.isArray(data.datasets) ? data.datasets : []

  const palette = (type === 'line' || type === 'scatter' || type === 'multi_line')
    ? LINE_COLORS : OTHER_COLORS
  const rotated = [
    ...palette.slice(colorOffset % palette.length),
    ...palette.slice(0, colorOffset % palette.length),
  ]

  const baseStockBits = useStock ? {
    rangeSelector: { enabled: false },
    navigator: { enabled: true },
    scrollbar: { enabled: true },
    xAxis: { type: 'datetime' },
    tooltip: { split: true },
  } : {}

  const base = {
    title: { text: chart_title || '' },
    legend: { enabled: true },
    colors: rotated,
    chart: {},
    xAxis: {},
    yAxis: {},
    series: [],
    plotOptions: {},
    ...baseStockBits,
  }

  const zoomXTypes = ['line','multi_line','area','areaspline','bar','multi_bar','column']
  const zoomXYTypes = ['scatter','bubble']
  const isXYZoom = zoomXYTypes.includes(type)
  const isZoomable = zoomXTypes.includes(type) || isXYZoom

  if (isZoomable || useStock) {
    base.chart = {
      ...base.chart,
      zoomType: isXYZoom || useStock ? 'x' : 'x',
      pinchType: isXYZoom || useStock ? 'x' : 'x',
      panning: { enabled: true, type: 'x' },
      panKey: 'shift',
      resetZoomButton: { theme: { r: 6 } },
    }
  }

  const makeSeries = () =>
    datasets.map((ds, i) => {
      const s = { name: ds.label ?? `Series ${i + 1}` }
      const c = rotated[i % rotated.length]

      if (useStock) {
        s.data = (ds.data || [])
          .map((y, idx) => {
            const t = Date.parse(labels[idx])
            const yy = typeof y === 'number' ? y : parseFloat(y)
            if (isNaN(t) || isNaN(yy)) return null
            return [t, yy]
          })
          .filter(Boolean)
        s.type = (type === 'area' || type === 'areaspline') ? 'areaspline' : 'line'
        s.tooltip = { valueDecimals: 2 }
        s.animation = false
        return s
      }

      if (type === 'scatter') {
        s.type = 'scatter'
        s.data = (ds.data || [])
          .map((pt, idx) => {
            if (pt && typeof pt === 'object' && 'x' in pt && 'y' in pt) return [pt.x, pt.y]
            const y = typeof pt === 'number' ? pt : parseFloat(pt)
            return isNaN(y) ? null : [idx, y]
          })
          .filter(Boolean)
        s.animation = false
        return s
      }

      if (type === 'bubble') {
        s.type = 'bubble'
        s.data = (ds.data || [])
          .map((val, idx) => {
            const lbl = labels[idx]
            const x = parseFloat(lbl)
            const y = typeof val === 'number' ? val : parseFloat(val)
            if (isNaN(x) || isNaN(y)) return null
            return { x, y, z: y, name: String(lbl) }
          })
          .filter(Boolean)
        s.animation = false
        return s
      }

      if (['bar','multi_bar','column'].includes(type)) {
        s.type = 'column'
        s.color = c
        s.borderColor = c
        s.borderWidth = 0
        s.animation = false
      } else if (['line','multi_line'].includes(type)) {
        s.type = 'line'
        s.color = c
        s.fillColor = transparentizeRgb(c)
        s.marker = { enabled: false }
        s.animation = false
      } else if (['radar','area','areaspline','polar','polararea','polar-area'].includes(type)) {
        s.type = (type === 'areaspline') ? 'areaspline' : (type === 'area') ? 'area' : 'line'
        s.color = c
        s.marker = { enabled: false }
        s.animation = false
      }
      s.data = ds.data || []
      return s
    })

  switch (type) {
    case 'multi_line':
    case 'line':
    case 'area':
    case 'areaspline':
      if (useStock) {
        base.series = makeSeries()
      } else {
        base.chart.type = (type === 'areaspline') ? 'areaspline' : (type === 'area') ? 'area' : 'line'
        base.xAxis = { categories: labels, title: { text: x_axis || '' } }
        base.yAxis = { title: { text: y_axis || '' } }
        base.series = makeSeries()
        base.plotOptions = { line: { marker: { enabled: false } } }
      }
      break

    case 'multi_bar':
    case 'bar':
    case 'column':
      base.chart.type = 'column'
      base.xAxis = { categories: labels, title: { text: x_axis || '' } }
      base.yAxis = { title: { text: y_axis || '' } }
      base.series = makeSeries()
      base.plotOptions = { column: { borderWidth: 0, pointPadding: 0.1, groupPadding: 0.1 } }
      break

    case 'pie':
    case 'doughnut': {
      const ds0 = datasets[0] || { data: [] }
      const values = ds0.data || []
      const maxValue = values.length ? Math.max(...values.map(v => +v || 0)) : null
      const maxIndex = maxValue !== null ? values.findIndex(v => +v === maxValue) : -1
      base.chart.type = 'pie'
      base.series = [{
        name: ds0.label || 'Pie',
        innerSize: type === 'doughnut' ? '60%' : '0%',
        data: labels.map((lbl, i) => ({
          name: lbl,
          y: Number(values[i]) || 0,
          color: OTHER_COLORS[i % OTHER_COLORS.length],
          sliced: i === maxIndex,
          selected: i === maxIndex,
        })),
        animation: false,
      }]
      break
    }

    case 'worldmap': {
      const values = datasets?.[0]?.data || []
      const mapDataArr = labels.map((lbl, i) => [String(lbl || '').trim().toLowerCase(), Number(values[i]) || 0])
      return {
        chart: { map: worldMap },
        title: { text: chart_title || '' },
        mapNavigation: { enabled: true, enableDoubleClickZoom: true, enableMouseWheelZoom: true, enableTouchZoom: true, enableButtons: true },
        colorAxis: { min: 0 },
        series: [{ type: 'map', name: chart_title || 'World Map', data: mapDataArr, joinBy: 'hc-key', states: { hover: { color: '#BADA55' } }, dataLabels: { enabled: false }, nullColor: '#f2f2f2' }],
        credits: { enabled: false },
        tooltip: { animation: false },
      }
    }

    case 'grid':
      return base

    default:
      base.chart.type = 'areaspline'
      base.xAxis = { categories: labels, title: { text: x_axis || '' } }
      base.yAxis = { title: { text: y_axis || '' } }
      base.series = makeSeries()
  }

  base.tooltip = base.tooltip || {}
  base.tooltip.animation = false
  return base
}

// ---------- normalize layout ----------
function normalizeRglLayout(baseWidgets) {
  if (!Array.isArray(baseWidgets) || baseWidgets.length === 0) return []
  const positions = baseWidgets.map(w => `${w.layout?.x ?? 0},${w.layout?.y ?? 0}`)
  const uniquePositions = new Set(positions)
  const needsSpacing = uniquePositions.size === 1 && positions[0] === "0,0"
  const xs = baseWidgets.map(w => Number(w.layout?.x ?? 0))
  const ys = baseWidgets.map(w => Number(w.layout?.y ?? 0))
  const hasZeroX = xs.some(v => v === 0)
  const hasZeroY = ys.some(v => v === 0)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const looksOneBased = !hasZeroX && !hasZeroY && (minX >= 1 || minY >= 1)

  return baseWidgets.map((w, index) => {
    const x = Number(w.layout?.x ?? 0)
    const y = Number(w.layout?.y ?? 0)
    const widgetKey = w.key || `${w.type}-${w.id}`
    return {
      ...w,
      key: widgetKey,
      layout: {
        i: widgetKey,
        x: looksOneBased ? Math.max(0, x - 1) : x,
        y: looksOneBased ? Math.max(0, y - 1) : (needsSpacing ? y + (index * 4) : y),
        w: Number(w.layout?.w ?? 4),
        h: Number(w.layout?.h ?? 4),
      },
    }
  })
}

// ---------- main component ----------
export default function ViewDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')

  const token = localStorage.getItem('accessToken')
  const dbToken = localStorage.getItem('db_token')

  const [dashboardName, setDashboardName] = useState('')
  const [widgets, setWidgets] = useState([])
  const [fields, setFields] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFetchingCharts, setIsFetchingCharts] = useState(false)
  const [serverRangeActive, setServerRangeActive] = useState(false)

  const [menuOpenFor, setMenuOpenFor] = useState(null)
  const [modalChart, setModalChart] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const closeBtnRef = useRef(null)

  const [appliedFilters, setAppliedFilters] = useState([])
  const [matchMode, setMatchMode] = useState('ALL')
  const [fieldSearch, setFieldSearch] = useState('')
  const [selectedField, setSelectedField] = useState(null)
  const selectedFieldMeta = useMemo(
    () => fields.find(f => f.filtered_column_name === selectedField) || null,
    [fields, selectedField]
  )
  const [chipSearch, setChipSearch] = useState('')
  const [sortBy, setSortBy] = useState('AZ')
  const [operator, setOperator] = useState('contains')
  const [typedValue, setTypedValue] = useState('')
  const [selectedValues, setSelectedValues] = useState(new Set())
  const [rangeField, setRangeField] = useState('')
  const [rangePreset, setRangePreset] = useState('All')
  const [gridSort, setGridSort] = useState({})

  // AI/chatbot (unchanged except payload dataset_name fix)
  const [activePanel, setActivePanel] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedName, setSelectedName] = useState("dataaaaa");
  const [selectedId, setSelectedId] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [charts, setCharts] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const selectedNameRef = useRef("dataaaaa");
  const chatMessagesEndRef = useRef(null);
  const [secureDatasetName, setSecureDatasetName] = useState('')

  // kebab outside click
  useEffect(() => { const close = () => setMenuOpenFor(null); document.addEventListener('click', close); return () => document.removeEventListener('click', close) }, [])
  useEffect(() => { if (!modalOpen) return; const onKey = e => { if (e.key === 'Escape') setModalOpen(false) }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [modalOpen])
  useEffect(() => { if (modalOpen && closeBtnRef.current) closeBtnRef.current.focus() }, [modalOpen])

  // ---------- STREAMING loadAll ----------
  const loadAll = useCallback(async () => {
    if (!id || !token || !dbToken) {
      setError('Missing authentication or dashboard ID')
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)

    try {
      // 1) Layout first (fast)
      const layoutJson = await fetchJSON(`${authUrl.BASE_URL}/dataset/layout/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      }, { timeoutMs: 20000, retries: 1 })

      if (!layoutJson?.success) throw new Error(layoutJson?.message || 'Failed to load dashboard')
      if (layoutJson.dataset_name) setSecureDatasetName(layoutJson.dataset_name)
      setDashboardName(layoutJson.name || `Dashboard #${id}`)

      const baseWidgets = Array.isArray(layoutJson.widgets) ? layoutJson.widgets : []
      const normalizedWidgets = normalizeRglLayout(baseWidgets)

      // paint placeholders immediately
      setWidgets(normalizedWidgets.map(w => ({ ...w, data: null })))
      setLoading(false)

      // 2) fetch datatypes async
      ;(async () => {
        try {
          const schema = localStorage.getItem("db_schema")
          if (!schema) { toast.error("Schema is missing. Delete this connection and create a new one."); return }
          const payload = { db_token: dbToken, dataset_id: id, schema }
          const dt = await fetchJSON(`${authUrl.BASE_URL}/dataset/dashboard/datatype/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
          }, { timeoutMs: 20000, retries: 0 })
          if (Array.isArray(dt?.data)) {
            setFields(dt.data)
            const firstNonDate = dt.data.find(f => categorizeColumnType(f.column_type) !== 'date')
            setSelectedField(firstNonDate?.filtered_column_name || null)
          }
        } catch (e) { console.warn('datatype fetch failed', e) }
      })()

      // 3) stream widget data with concurrency + cache
      await pLimitAll(normalizedWidgets, 5, async (widget) => {
        try {
          const cached = readCache(id, widget.id, dbToken)
          if (cached) {
            setWidgets(prev => prev.map(w => (w.key === widget.key ? { ...w, data: cached } : w)))
            return
          }

          const endpoint = widget.type === 'chart'
            ? `${authUrl.BASE_URL}/dataset/chart/${widget.id}/data/`
            : `${authUrl.BASE_URL}/dataset/kpi/${widget.id}/data/`

          const result = await fetchJSON(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ db_token: dbToken })
          }, { timeoutMs: 25000, retries: 1 })

          if (!result?.success) throw new Error(result?.message || `Failed widget ${widget.id}`)

          const payload = result.data
          if (widget.type === 'chart') {
            if (!(isValidChartData(payload) && chartHasData(payload))) {
              setWidgets(prev => prev.map(w => (w.key === widget.key ? { ...w, data: { ...payload, _empty: true } } : w)))
              return
            }
          }

          writeCache(id, widget.id, dbToken, payload)
          setWidgets(prev => prev.map(w => (w.key === widget.key ? { ...w, data: payload } : w)))
        } catch (err) {
          console.error(`Widget ${widget.id} error:`, err)
          setWidgets(prev => prev.map(w => (w.key === widget.key ? { ...w, data: { error: true, message: 'Load failed' } } : w)))
        }
      })

      setServerRangeActive(false)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err.message || 'Failed to load dashboard')
      setLoading(false)
    }
  }, [id, token, dbToken])

  useEffect(() => { loadAll() }, [loadAll])

  // ---------- Date preset refetch ----------
  const refetchChartsForPreset = useCallback(async (field, preset) => {
    if (!widgets.length || !token || !dbToken) return
    try {
      setIsFetchingCharts(true)
      const suffix = buildPresetQuery(field, preset)
      const results = await Promise.allSettled(
        widgets.map(async w => {
          if (w.type !== 'chart') return { w, data: w.data }
          const endpoint = `${authUrl.BASE_URL}/dataset/chart/${w.id}/data/${suffix}`
          try {
            const json = await fetchJSON(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ db_token: dbToken })
            }, { timeoutMs: 20000, retries: 0 })
            if (!json?.success) throw new Error('Failed')
            return { w, data: json.data }
          } catch {
            return { w, data: w.data }
          }
        })
      )
      const updated = widgets.map(w => {
        const hit = results.find(x => x.status === 'fulfilled' && x.value.w.key === w.key)
        return hit ? { ...w, data: hit.value.data } : w
      })
      setWidgets(updated)
      setServerRangeActive(preset !== 'All' && !!field)
    } finally {
      setIsFetchingCharts(false)
    }
  }, [widgets, token, dbToken])

  // ---------- type inference + filter engine ----------
  const inferType = useCallback(
    col => { const f = fields.find(x => x.filtered_column_name === col); if (!f) return 'text'; return categorizeColumnType(f.column_type) },
    [fields]
  )

  const parseBooleanLoose = cell => {
    if (cell === true || cell === false) return cell
    const s = String(cell ?? '').trim().toLowerCase()
    if (['true','t','1','yes','y'].includes(s)) return true
    if (['false','f','0','no','n'].includes(s)) return false
    return null
  }

  function checkCondition({ cell, type, operator, value, value2, ranges }) {
    if (type === 'number' || (type === 'other' && NUM_OPS.includes(operator))) {
      const num = Number(cell)
      if (operator === 'is_empty') return cell == null || cell === ''
      if (operator === 'is_not_empty') return !(cell == null || cell === '')
      if (operator === 'in_ranges' && Array.isArray(ranges) && ranges.length) {
        if (!isFinite(num)) return false
        return ranges.some(({ start, end }) => {
          const a = Number(start), b = Number(end)
          if (!isFinite(a) || !isFinite(b)) return false
          const lo = Math.min(a, b), hi = Math.max(a, b)
          return num >= lo && num <= hi
        })
      }
      if (isNaN(num)) return false
      const v = Number(value)
      switch (operator) {
        case '=': return num === v
        case '!=': return num !== v
        case '>': return num > v
        case '<': return num < v
        default: return true
      }
    } else if (type === 'date') {
      const d = new Date(cell)
      if (isNaN(d.getTime())) return false
      const toMid = x => new Date(x.getFullYear(), x.getMonth(), x.getDate())
      switch (operator) {
        case 'on': { const v = new Date(value); if (isNaN(v.getTime())) return false; return toMid(d).getTime() === toMid(v).getTime() }
        case 'before': { const v = new Date(value); if (isNaN(v.getTime())) return false; return d.getTime() < v.getTime() }
        case 'after': { const v = new Date(value); if (isNaN(v.getTime())) return false; return d.getTime() > v.getTime() }
        case 'between': {
          const v1 = new Date(value), v2 = new Date(value2)
          if (isNaN(v1.getTime()) || isNaN(v2.getTime())) return false
          const a = Math.min(v1.getTime(), v2.getTime())
          const b = Math.max(v1.getTime(), v2.getTime())
          const t = d.getTime()
          return t >= a && t <= b
        }
        default: return true
      }
    } else if (type === 'boolean') {
      const b = parseBooleanLoose(cell)
      if (operator === 'is_empty') return cell == null || cell === ''
      if (operator === 'is_not_empty') return !(cell == null || cell === '')
      if (b === null) return false
      if (operator === '=' || operator === '!=') {
        const v = parseBooleanLoose(value); if (v === null) return false
        return operator === '=' ? b === v : b !== v
      }
      if (operator === 'in' || operator === 'not_in') {
        const set = String(value || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
        const bs = b ? 'true' : 'false'
        return operator === 'in' ? set.includes(bs) : !set.includes(bs)
      }
      return true
    } else {
      const s = String(cell ?? ''), v = String(value ?? '')
      switch (operator) {
        case 'contains': return s.toLowerCase().includes(v.toLowerCase())
        case 'not_contains': return !s.toLowerCase().includes(v.toLowerCase())
        case 'begins_with': return s.toLowerCase().startsWith(v.toLowerCase())
        case 'ends_with': return s.toLowerCase().endsWith(v.toLowerCase())
        case 'is_empty': return s === '' || s == null
        case 'is_not_empty': return !(s === '' || s == null)
        case '=': return s === v
        case '!=': return s !== v
        case 'in': { const set = String(value || '').split(',').map(x => x.trim()).filter(Boolean); return set.some(x => s === x) }
        case 'not_in': { const set = String(value || '').split(',').map(x => x.trim()).filter(Boolean); return !set.some(x => s === x) }
        default: return true
      }
    }
  }

  function applyFieldFilters(chartData, filters, mode = 'ALL') {
    if (!filters?.length) return chartData
    const content = chartData?.data || {}
    const labels = Array.isArray(content.labels) ? content.labels : []
    const datasets = Array.isArray(content.datasets) ? content.datasets : []
    const xAxisCol = chartData?.x_axis || ''
    const yAxisRaw = chartData?.y_axis || content?.y_axis || chartData?.y_axis_title || ''
    const yCols = typeof yAxisRaw === 'string'
      ? yAxisRaw.split(',').map(s => s.trim()).filter(Boolean)
      : Array.isArray(yAxisRaw) ? yAxisRaw : []

    if (!labels.length || !datasets.length) return chartData

    const keepMask = labels.map((_, rowIdx) => {
      const results = filters.map(f => {
        const t = inferType(f.column)
        if (f.column === xAxisCol) {
          const cell = labels[rowIdx]
          return checkCondition({ cell, type: t, operator: f.operator, value: f.value, value2: f.value2, ranges: f.ranges })
        }
        const colIdx = yCols.findIndex(c => c === f.column)
        if (colIdx !== -1) {
          const cell = datasets[colIdx]?.data?.[rowIdx]
          return checkCondition({ cell, type: t, operator: f.operator, value: f.value, value2: f.value2, ranges: f.ranges })
        }
        return true
      })
      return mode === 'ALL' ? results.every(Boolean) : results.some(Boolean)
    })

    const keptIdx = labels.map((_, i) => i).filter(i => keepMask[i])
    const newLabels = keptIdx.map(i => labels[i])
    const newDatasets = datasets.map(ds => ({ ...ds, data: keptIdx.map(i => ds.data?.[i]) }))
    return { ...chartData, data: { ...chartData.data, labels: newLabels, datasets: newDatasets } }
  }

  const applyAllFilters = chartOrKpi => {
    if (chartOrKpi?.chart_type) {
      let cd = chartOrKpi
      cd = applyFieldFilters(cd, appliedFilters, matchMode)
      return cd
    }
    return chartOrKpi
  }

  function collectDistinctForColumn(widgets, colName) {
    const m = new Map()
    if (!colName) return m
    for (const w of widgets) {
      if (w.type !== 'chart') continue
      const cd = w.data
      const labels = cd?.data?.labels || []
      const ds = cd?.data?.datasets || []
      const xAxis = cd?.x_axis
      const yCols = (cd?.y_axis || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      if (xAxis && xAxis === colName && Array.isArray(labels)) {
        for (const lbl of labels) { const key = lbl == null ? '' : String(lbl); m.set(key, (m.get(key) || 0) + 1) }
      }
      const idx = yCols.indexOf(colName)
      if (idx !== -1 && Array.isArray(ds?.[idx]?.data)) {
        for (const v of ds[idx].data) { const key = v == null ? '' : String(v); m.set(key, (m.get(key) || 0) + 1) }
      }
    }
    return m
  }
  function collectNumericValues(widgets, colName) {
    const out = []
    if (!colName) return out
    for (const w of widgets) {
      if (w.type !== 'chart') continue
      const cd = w.data
      const labels = cd?.data?.labels || []
      const ds = cd?.data?.datasets || []
      const xAxis = cd?.x_axis
      const yCols = (cd?.y_axis || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      if (xAxis && xAxis === colName && Array.isArray(labels)) {
        for (const lbl of labels) { const num = Number(lbl); if (isFinite(num)) out.push(num) }
      }
      const idx = yCols.indexOf(colName)
      if (idx !== -1 && Array.isArray(ds?.[idx]?.data)) {
        for (const v of ds[idx].data) { const num = Number(v); if (isFinite(num)) out.push(num) }
      }
    }
    return out
  }

  const onLayoutChange = newLayout => {
    setWidgets(prev => prev.map(w => {
      const l = newLayout.find(n => n.i === w.key)
      return l ? { ...w, layout: { ...w.layout, ...l } } : w
    }))
  }

  const saveLayout = async () => {
    const { isConfirmed } = await Swal.fire({ title: 'Save Layout?', icon: 'question', showCancelButton: true, confirmButtonText: 'Save' })
    if (!isConfirmed) return
    setSaving(true)
    try {
      const payload = {
        dataset_id: id,
        widgets: widgets.map(w => ({
          key: w.key, type: w.type, id: w.id,
          layout: { x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h },
        })),
      }
      const r = await fetch(`${authUrl.BASE_URL}/dataset/layout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(`Save failed: ${r.status}`)
      setIsEditingLayout(false)
      Swal.fire('Saved!', 'Layout updated.', 'success')
    } catch (err) {
      console.error(err)
      Swal.fire('Error', err.message || 'Failed to save layout', 'error')
    } finally { setSaving(false) }
  }

  const deleteDashboard = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Delete Dashboard?', text: `This will delete "${dashboardName}".`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, delete it', cancelButtonText: 'Cancel',
    })
    if (!isConfirmed) return
    try {
      const resp = await fetch(`${authUrl.BASE_URL}/dataset/delete/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      await Swal.fire('Deleted!', 'Your dashboard has been deleted.', 'success')
      navigate('/dashboards')
    } catch (err) {
      console.error('Delete failed:', err)
      Swal.fire('Error', 'Could not delete the dashboard.', 'error')
    }
  }

  const toggleMenu = chartId => {
    if (isEditingLayout) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Save layout first', showConfirmButton: false, timer: 1500 })
      return
    }
    setMenuOpenFor(prev => (prev === chartId ? null : chartId))
  }

  const handleEditChart = chartId => { setMenuOpenFor(null); navigate(`/edit?datasetId=${encodeURIComponent(id)}&chartid=${encodeURIComponent(chartId)}`) }

  const handleDeleteChart = async chartId => {
    setMenuOpenFor(null)
    const { isConfirmed } = await Swal.fire({ title: 'Delete chart?', text: 'This will permanently delete the chart.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, delete it!' })
    if (!isConfirmed) return
    try {
      const response = await fetch(`${authUrl.BASE_URL}/dataset/chart/${chartId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error(`Server responded ${response.status}`)
      setWidgets(prev => prev.filter(w => !(w.type === 'chart' && w.id === String(chartId))))
      Swal.fire('Deleted!', 'Your chart has been removed.', 'success')
    } catch (err) {
      console.error('Failed to delete chart:', err)
      Swal.fire('Error', 'There was a problem deleting your chart.', 'error')
    }
  }

  const handleFilterChart = () => { setMenuOpenFor(null); setFilterPanelOpen(true) }
  const handleMaximizeChart = chartObj => { setMenuOpenFor(null); setModalChart(chartObj); setModalOpen(true) }

  const handleExplainChart = async chartObj => {
    setExplainModalChart(chartObj); setExplainModalOpen(true); setExplainLoading(true); setExplainResponse(null); setExplainError(null)
    try {
      const chartData = chartObj?.data || chartObj
      const dataContent = chartData?.data || {}
      const datasets = dataContent?.datasets || []
      const labels = dataContent?.labels || []
      const payload = {
        title: chartData?.chart_title || 'Untitled Chart',
        chart_type: chartData?.chart_type || 'unknown',
        x_axis: chartData?.x_axis || '',
        y_axis: chartData?.y_axis || '',
        dataset_name: dashboardName || `Dataset ${id}`,
        table_name: 'dashboard_data',
        data: datasets?.[0]?.data || [],
        labels: labels || []
      }
      const response = await fetch('https://demo.techfinna.com/ai/explain_chart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`)
      const result = await response.json()
      if (result.result && result.result.success) setExplainResponse(result.result.data)
      else if (result.success) setExplainResponse(result.data)
      else throw new Error(result.result?.errors || result.errors || 'API returned an error')
    } catch (error) {
      setExplainError(error.message || 'Failed to get AI explanation')
    } finally { setExplainLoading(false) }
  }

  // AI chat handlers (unchanged core)
  const handleSendMessage = async () => {
    const inputElement = document.getElementById("aiInput")
    const textToSend = inputElement.value.trim()
    if (!textToSend) return
    const userMessage = { id: Date.now().toString(), text: textToSend, isUser: true, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMessage])
    inputElement.value = ""
    setShowSuggestions(false)
    setIsTyping(true)
    try {
      const token = localStorage.getItem("accessToken")
      if (!token) { toast.error("Auth Error: No access token found."); return }
      const dbToken = localStorage.getItem("db_token")
      if (!dbToken) { toast.error("Auth Error: No DB token found."); return }
      const payload = {
        db_token: dbToken,
        dataset_name: secureDatasetName || dashboardName || `Dashboard ${id}`,
        dataset_id: id,
        message: textToSend,
      }
      const response = await fetch("https://backend.techfinna.com/chat_with_ai/chat/", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      })
      const result = await response.json()
      setIsTyping(false)
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: result?.data?.response || result?.reply || "No response from AI.",
        isUser: false, timestamp: new Date(), aiResponse: result,
      }
      setChatMessages(prev => [...prev, aiMessage])
    } catch (err) {
      console.error("AI Chat error:", err)
      setIsTyping(false)
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: "⚠️ Error contacting AI service.", isUser: false, timestamp: new Date() }])
    }
  }
  const handleCreateChart = async (chartData) => {
    if (!chartData || !token || !dbToken || !id) { toast.error("Missing required data to create chart"); return }
    try {
      const payload = {
        db_token: dbToken,
        dataset_id: parseInt(id, 10),
        chart_title: `AI Generated ${chartData.chart_type.charAt(0).toUpperCase() + chartData.chart_type.slice(1)} Chart`,
        chart_type: chartData.chart_type,
        x_axis: chartData.x_axis,
        y_axis: chartData.y_axis,
      }
      const response = await fetch(`${authUrl.BASE_URL}/dataset/create/chart/`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Failed to create chart: ${response.status}`)
      const result = await response.json()
      if (result.success) { toast.success("Chart created successfully!"); await loadAll() }
      else throw new Error(result.message || "Failed to create chart")
    } catch (error) {
      console.error("Error creating chart:", error)
      toast.error(`Failed to create chart: ${error.message}`)
    }
  }
  const handleSuggestionClick = (s) => { const input = document.getElementById("aiInput"); input.value = s; handleSendMessage() }
  const handleKeyPress = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }

  // Chips/fields derived state
  const selectedType = useMemo(() => (selectedField ? inferType(selectedField) : 'text'), [selectedField, inferType])
  const distinctMap = useMemo(() => collectDistinctForColumn(widgets, selectedField), [widgets, selectedField])
  const numericValues = useMemo(() => selectedType === 'number' ? collectNumericValues(widgets, selectedField) : [], [widgets, selectedField, selectedType])

  const chipItems = useMemo(() => {
    if (selectedType === 'number') {
      let bins = computeNumericBins(numericValues, 12)
      if (chipSearch) bins = bins.filter(b => b.label.toLowerCase().includes(chipSearch.toLowerCase()))
      switch (sortBy) { case 'AZ': bins.sort((a,b)=>a.start-b.start); break; case 'ZA': bins.sort((a,b)=>b.start-a.start); break; case 'FREQ': bins.sort((a,b)=>b.c-a.c||a.start-b.start); break; case 'RARE': bins.sort((a,b)=>a.c-b.c||a.start-b.start); break }
      return bins
    } else if (selectedType === 'boolean') {
      const tCount = (distinctMap.get('true') || distinctMap.get('True') || 0) + (distinctMap.get('1') || 0) + (distinctMap.get('yes') || distinctMap.get('Yes') || 0)
      const fCount = (distinctMap.get('false') || distinctMap.get('False') || 0) + (distinctMap.get('0') || 0) + (distinctMap.get('no') || distinctMap.get('No') || 0)
      const base = [{ key: 'true', label: 'true', c: tCount, isRange: false }, { key: 'false', label: 'false', c: fCount, isRange: false }]
      return base.filter(it => it.label.includes(chipSearch.toLowerCase()))
    } else {
      let arr = Array.from(distinctMap.entries()).map(([v, c]) => ({ key: v, label: v, c, isRange: false }))
      if (chipSearch) arr = arr.filter(item => item.label.toLowerCase().includes(chipSearch.toLowerCase()))
      switch (sortBy) { case 'AZ': arr.sort((a,b)=>a.label.localeCompare(b.label)); break; case 'ZA': arr.sort((a,b)=>b.label.localeCompare(a.label)); break; case 'FREQ': arr.sort((a,b)=>b.c-a.c||a.label.localeCompare(b.label)); break; case 'RARE': arr.sort((a,b)=>a.c-b.c||a.label.localeCompare(b.label)); break }
      return arr
    }
  }, [selectedType, numericValues, distinctMap, chipSearch, sortBy])

  useEffect(() => {
    setChipSearch(''); setSortBy('AZ'); setSelectedValues(new Set()); setTypedValue('')
    if (selectedType === 'number') setOperator('=')
    else if (selectedType === 'boolean') setOperator('=')
    else setOperator('contains')
  }, [selectedField, selectedType])

  const groupedFields = useMemo(() => {
    const groups = { text: [], number: [], boolean: [], json: [], other: [] }
    for (const f of fields) {
      const cat = categorizeColumnType(f.column_type)
      if (cat === 'date') continue
      const entry = { name: f.column_name, key: f.filtered_column_name, type: f.column_type }
      groups[cat]?.push(entry)
    }
    const match = s => s.toLowerCase().includes(fieldSearch.toLowerCase())
    const filterGroup = arr => arr.filter(x => match(x.name) || match(x.key))
    return {
      text: filterGroup(groups.text),
      number: filterGroup(groups.number),
      boolean: filterGroup(groups.boolean),
      json: filterGroup(groups.json),
      other: filterGroup(groups.other),
    }
  }, [fields, fieldSearch])

  const sectionMeta = [
    { id: 'text', title: 'Text', dot: 'bg-rose-500', accent: 'rose' },
    { id: 'number', title: 'Numeric', dot: 'bg-amber-500', accent: 'amber' },
    { id: 'boolean', title: 'Boolean', dot: 'bg-emerald-500', accent: 'emerald' },
    { id: 'json', title: 'JSON', dot: 'bg-indigo-500', accent: 'indigo' },
    { id: 'other', title: 'Other', dot: 'bg-slate-500', accent: 'slate' },
  ]
  const rightBgByType = t => t === 'number' ? 'bg-amber-50/60' : t === 'boolean' ? 'bg-emerald-50/60' : t === 'json' ? 'bg-indigo-50/60' : t === 'other' ? 'bg-slate-50/60' : 'bg-rose-50/60'

  // Renderers
  const renderKpi = w => {
    const name = w?.data?.kpi_name || 'KPI'
    const value = w?.data?.value ?? w?.data?.raw_value ?? '—'
    return (
      <div className="bg-white p-6 flex flex-col items-center justify-center border border-gray-200 rounded-xl shadow-sm h-full">
        <div className="text-xs tracking-wide font-medium text-gray-500 uppercase">{name}</div>
        <div className="mt-1.5 text-3xl font-semibold text-gray-900">{value}</div>
      </div>
    )
  }

  const sortGridRows = (labels, series, colIdx, dir) => {
    if (colIdx == null || !dir) return { labels, series }
    const rows = labels.map((_, r) => {
      const cell = series[colIdx]?.data?.[r]
      const num = Number(cell)
      return { r, v: isNaN(num) ? String(cell ?? '') : num }
    })
    rows.sort((a, b) => dir === 'asc' ? (a.v > b.v ? 1 : a.v < b.v ? -1 : 0) : (a.v < b.v ? 1 : a.v > b.v ? -1 : 0))
    const mapIndex = rows.map(x => x.r)
    const newLabels = mapIndex.map(i => labels[i])
    const newSeries = series.map(ds => ({ ...ds, data: mapIndex.map(i => ds.data?.[i]) }))
    return { labels: newLabels, series: newSeries }
  }

  const renderGridTable = w => {
    const chart = w
    const labels = Array.isArray(chart?.data?.data?.labels) ? chart.data.data.labels : []
    const series = Array.isArray(chart?.data?.data?.datasets) ? chart.data.data.datasets : []
    const cols = (chart?.data?.y_axis || '').toString().split(',').map(s => s.trim()).filter(Boolean)
    const sort = gridSort[w.key] || { col: null, dir: null }
    const { labels: sortedLabels, series: sortedSeries } = sortGridRows(labels, series, sort.col, sort.dir)
    const toggleSort = colIdx => {
      setGridSort(prev => {
        const cur = prev[w.key] || { col: null, dir: null }
        let dir = 'asc'
        if (cur.col === colIdx) dir = cur.dir === 'asc' ? 'desc' : cur.dir === 'desc' ? null : 'asc'
        return { ...prev, [w.key]: { col: dir ? colIdx : null, dir } }
      })
    }
    const sortIcon = colIdx => {
      if (!sort || sort.col !== colIdx || !sort.dir) return <FaSort className="inline-block ml-1 opacity-50" />
      return sort.dir === 'asc' ? <FaSortUp className="inline-block ml-1" /> : <FaSortDown className="inline-block ml-1" />
    }
    return (
      <div className="overflow-auto h-full">
        <table className="min-w-full table-auto text-xs border-collapse">
          <thead>
            <tr>{cols.map((c, i) => (
              <th key={c} className="border px-2 py-1 bg-gray-50 font-medium text-left cursor-pointer select-none" onClick={() => toggleSort(i)} title="Sort">
                {c} {sortIcon(i)}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {sortedLabels.map((_, rIdx) => (
              <tr key={rIdx} className="odd:bg-white even:bg-gray-50">
                {sortedSeries.map((ds, cIdx) => (<td key={cIdx} className="border px-2 py-1">{ds?.data?.[rIdx] ?? ''}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderChart = (w, idx, forModal = false) => {
    if (!w?.data) return <div className="h-full w-full grid place-items-center"><div className="text-xs text-gray-400">Loading chart…</div></div>
    if (w?.data?.error) return <div className="h-full w-full grid place-items-center text-sm text-red-600">Failed to load</div>
    if (w?.data?._empty) return <div className="h-full w-full grid place-items-center text-sm text-gray-500">No data</div>

    const t = String(w?.data?.chart_type || '').toLowerCase()
    if (t === 'grid') return renderGridTable(w)

    const labels = Array.isArray(w?.data?.data?.labels) ? w.data.data.labels : []
    const isTs = (t === 'line' || t === 'multi_line' || t === 'area' || t === 'areaspline') && labelsLookLikeDates(labels)
    const constructorType = t === 'worldmap' ? 'mapChart' : isTs ? 'stockChart' : 'chart'

    const options = buildChartOptions({ chart_type: w?.data?.chart_type, data: w?.data, x_axis: w?.data?.x_axis, y_axis: w?.data?.y_axis }, idx, isTs)
    return <SmartChart options={options} constructorType={constructorType} minHeight={forModal ? 240 : 120} />
  }

  const filteredWidgets = useMemo(() => {
    const mapped = widgets.map(w => w.type === 'chart' ? { ...w, data: applyAllFilters(w.data) } : w)
    return mapped.filter(w => w.type === 'chart' ? chartHasData(w.data) || w?.data?._empty || w?.data?.error || w?.data===null : true)
  }, [widgets, appliedFilters, matchMode])

  const addChipFilter = () => {
    if (!selectedField) return
    const t = selectedType
    if (t === 'number' || (t === 'other' && NUM_OPS.includes(operator))) {
      if (t === 'number' && selectedValues.size > 0) {
        const chosenBins = chipItems.filter(it => selectedValues.has(it.key))
        if (chosenBins.length > 0) {
          const ranges = chosenBins.map(b => ({ start: b.start, end: b.end }))
          setAppliedFilters(fs => [...fs, { column: selectedField, operator: 'in_ranges', ranges }])
        }
      } else if (typedValue !== '') {
        const v = Number(typedValue)
        if (!isNaN(v)) setAppliedFilters(fs => [...fs, { column: selectedField, operator, value: v }])
      }
    } else if (t === 'boolean') {
      if (selectedValues.size > 0) {
        const val = Array.from(selectedValues).join(', ')
        setAppliedFilters(fs => [...fs, { column: selectedField, operator: 'in', value: val }])
      } else if (typedValue) {
        setAppliedFilters(fs => [...fs, { column: selectedField, operator, value: typedValue }])
      }
    }
    setSelectedValues(new Set()); setTypedValue('')
  }
  const removeFilter = idx => setAppliedFilters(fs => fs.filter((_, i) => i !== idx))
  const handlePresetClick = async preset => { if (!rangeField && preset !== 'All') return; setRangePreset(preset); await refetchChartsForPreset(rangeField, preset) }

  // explain chart modal state (unchanged)
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [explainModalChart, setExplainModalChart] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainResponse, setExplainResponse] = useState(null)
  const [explainError, setExplainError] = useState(null)

  // ---------- render return continues in Part 3 ----------

    // Loading + error gates
  if (loading) {
    return (<><Navbar /><div className="mt-[55px] h-[calc(100vh-55px)] flex items-center justify-center text-gray-500">Loading dashboard…</div></>)
  }
  if (error) {
    return (<><Navbar /><div className="mt-[55px] p-6 text-red-600">{error}</div></>)
  }

  return (
    <>
      <Navbar />

      {/* Left rail */}
      <aside className="w-[60px] h-[calc(100vh-55px)] fixed top-[55px] left-0 flex flex-col items-center py-4 space-y-4 border-r border-gray-200 bg-white/95 backdrop-blur z-30">
        <div className="flex flex-col items-center">
          <button
            className={`p-2 rounded-lg transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filterPanelOpen ? 'bg-gray-200' : ''}`}
            onClick={() => setFilterPanelOpen(v => !v)}
            title="Filters"
          >
            <RiFilter2Line size={20} className="text-gray-700" />
          </button>
          <span className="text-[10px] mt-1 text-gray-600">Filters</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => navigate(`/chart?datasetId=${encodeURIComponent(id)}`)}
            className="p-2 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            title="Add Chart"
          >
            <MdOutlineAddchart size={20} className="text-gray-700" />
          </button>
          <span className="text-[10px] mt-1 text-gray-600">Add Chart</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            disabled={isEditingLayout}
            onClick={() => setIsEditingLayout(true)}
            className={`p-2 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isEditingLayout ? 'bg-gray-200 opacity-60 cursor-not-allowed' : ''}`}
            title={isEditingLayout ? 'Save layout first' : 'Edit Layout'}
            aria-disabled={isEditingLayout}
          >
            <RxDragHandleDots2 size={20} className="text-gray-700" />
          </button>
          <span className="text-[10px] mt-1 text-gray-600">{isEditingLayout ? 'Editing…' : 'Edit Layout'}</span>
        </div>

        {/* AI Chat */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setActivePanel(prev => prev === "chatbot" ? null : "chatbot")}
            className={`p-2 rounded hover:bg-gray-200 ${activePanel === "chatbot" ? "bg-gray-200" : ""}`}
            title="AI Chatbot"
          >
            <FiMessageSquare size={20} className="text-gray-600" />
          </button>
          <span className="text-[10px]">AI Chat</span>
        </div>

        <div className="flex flex-col items-center">
          <button onClick={deleteDashboard} className="p-2 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 transition" title="Delete Dashboard">
            <FiTrash2 size={20} className="text-gray-700" />
          </button>
          <span className="text-[10px] mt-1 text-gray-600">Delete</span>
        </div>

        <div className="flex-1" />
        {isEditingLayout && (
          <div className="flex flex-col items-center pb-3">
            <button disabled={saving} onClick={saveLayout} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" title="Save Layout">
              <FiSave size={20} className="text-gray-800" />
            </button>
            <span className="text-[10px] mt-1 text-gray-700">{saving ? 'Saving…' : 'Save'}</span>
          </div>
        )}
      </aside>

      {/* Slide-over panel (chatbot) */}
      {activePanel && (
        <div className="fixed w-[320px] left-[70px] h-[500px] z-30 top-[60px] rounded-lg overflow-hidden drop-shadow-xl flex bg-black bg-opacity-25" onClick={() => setActivePanel(null)}>
          <div className="bg-white border border-gray-200 text-gray-600 w-full max-h-[500px] overflow-y-auto scrollsettings rounded-lg" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <p className="text-lg font-medium text-gray-800">
                {activePanel === "chatbot" && (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <FiMessageSquare className="text-gray-600 text-xs" />
                    </div>
                    <span className="text-md font-medium text-gray-600">AI Assistant</span>
                  </div>
                )}
              </p>
              <button onClick={() => setActivePanel(null)} className="p-1 rounded hover:bg-gray-200" title="Close">
                <FiX size={20} />
              </button>
            </div>

            {/* Chat content */}
            <div className="p-2">
              <div className="flex flex-col h-full">
                {showSuggestions && chatMessages.length === 0 && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                      <p>Ask me anything about your data, charts, or KPIs to get started!</p>
                    </div>

                    <div className="space-y-2">
                      <button onClick={() => handleSuggestionClick("Can you explain me the charts in my dataset?")} className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                        <span className="text-sm text-gray-700">Can you explain me the charts in my dataset?</span>
                      </button>
                      <button onClick={() => handleSuggestionClick("Please generate a chart for me.")} className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                        <span className="text-sm text-gray-700">Please generate a chart for me.</span>
                      </button>
                      <button onClick={() => handleSuggestionClick("How do I add more data to my dataset?")} className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                        <span className="text-sm text-gray-700">How do I add more data to my dataset?</span>
                      </button>
                    </div>
                  </div>
                )}

                {chatMessages.length > 0 && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "items-start space-x-2"}`}>
                        {!message.isUser && (
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <FiMessageSquare className="text-gray-600 text-xs" />
                          </div>
                        )}
                        <div className={`rounded-xl p-3 max-w-[85%] text-sm ${message.isUser ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-700 border border-gray-200"}`}>
                          {message.isUser ? <p className="leading-relaxed">{message.text}</p> : <p className="leading-relaxed">{message.text}</p>}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <FiMessageSquare className="text-gray-600 text-xs" />
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                            </div>
                            <span className="text-xs text-gray-500">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>
                )}

                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input type="text" id="aiInput" onKeyPress={handleKeyPress} placeholder="Ask a question or request..." className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50" />
                    <button onClick={handleSendMessage} className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                      <FiSend className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="pl-[60px] pt-[55px]">
        <div className="sticky top-[55px] bg-white/90 backdrop-blur z-20 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{dashboardName}</h1>
            </div>

            {/* Date presets */}
            <div className="flex items-center gap-2">
              <select className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[220px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={rangeField} onChange={e => setRangeField(e.target.value)}>
                <option value="">Select date field…</option>
                {fields.filter(f => categorizeColumnType(f.column_type) === 'date').map(f => (
                  <option key={f.filtered_column_name} value={f.filtered_column_name}>{f.column_name}</option>
                ))}
              </select>
              {['7D','30D','90D','1Y','YTD','All'].map(p => {
                const selected = rangePreset === p
                const disabled = !rangeField && p !== 'All'
                return (
                  <button key={p} type="button" disabled={disabled || isFetchingCharts} onClick={() => handlePresetClick(p)}
                    className={['px-3 py-1.5 rounded-md text-sm border transition focus:outline-none focus:ring-2 focus:ring-blue-500',
                      selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                      (disabled || isFetchingCharts) && 'opacity-50 cursor-not-allowed',
                    ].join(' ')}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Canvas grid */}
        <div className="p-3 bg-gradient-to-b from-slate-50 to-slate-100">
          <GridLayout
            className="layout"
            layout={filteredWidgets.map(w => ({ ...w.layout, i: w.key }))}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            margin={[12, 12]}
            containerPadding={[12, 12]}
            isDraggable={isEditingLayout}
            isResizable={isEditingLayout}
            onLayoutChange={onLayoutChange}
            compactType={isEditingLayout ? 'vertical' : null}
            preventCollision={!isEditingLayout}
            autoSize={true}
            useCSSTransforms={true}
            isDroppable={false}
          >
            {filteredWidgets.map((w, idx) => (
              <div key={w.key} data-grid={{ ...w.layout, i: w.key }} className="rounded-lg">
                {w.type === 'chart' ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col relative shadow-sm">
                    {/* Header */}
                    <div className="border-b flex items-center justify-between px-3 py-2.5 border-gray-200">
                      <div className="min-w-0 truncate text-sm font-medium text-gray-900">
                        {w?.data?.chart_title || '(No Title)'}
                      </div>
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleMenu(w.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" title="More options" aria-haspopup="menu" aria-expanded={menuOpenFor === w.id}>
                          <FiMoreVertical size={18} />
                        </button>
                        {menuOpenFor === w.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-[100] py-1 ring-1 ring-black/5" role="menu" aria-orientation="vertical">
                            <button onClick={() => handleEditChart(w.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" role="menuitem">
                              <FiEdit size={16} /> Edit
                            </button>
                            <button onClick={() => handleDeleteChart(w.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" role="menuitem">
                              <FiTrash2 size={16} /> Delete
                            </button>
                            <button onClick={handleFilterChart} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" role="menuitem">
                              <FiFilter size={16} /> Filters
                            </button>
                            <button onClick={() => handleMaximizeChart(w)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" role="menuitem">
                              <FiMaximize size={16} /> Maximize
                            </button>
                            <button onClick={() => handleExplainChart(w)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2" role="menuitem">
                              <RiRobot2Line size={16} /> Explain with AI
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chart body */}
                    <div className="flex-1 min-h-0 p-2">
                      {isFetchingCharts ? (
                        <div className="h-full w-full grid place-items-center text-sm text-gray-500">Refreshing…</div>
                      ) : (
                        renderChart(w, idx)
                      )}
                    </div>
                  </div>
                ) : (
                  renderKpi(w)
                )}
              </div>
            ))}
          </GridLayout>
        </div>
      </div>

      {/* Maximize modal */}
      {modalOpen && modalChart && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-label="Maximized chart">
          <div className="bg-white w-[90vw] max-w-6xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="h-12 px-4 border-b bg-white/90 backdrop-blur flex items-center justify-between">
              <div className="font-medium truncate pr-2">{modalChart?.data?.chart_title || 'Chart'}</div>
              <button ref={closeBtnRef} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => setModalOpen(false)} title="Close" aria-label="Close">
                <FiX /> <span className="text-sm">Close</span>
              </button>
            </div>
            <div className="h-[calc(85vh-3rem)] p-3">{renderChart(modalChart, 0, true)}</div>
          </div>
        </div>
      )}

      {/* AI Explain modal */}
      {explainModalOpen && explainModalChart && (
        <div className="fixed inset-0 bg-black/20 z-[100] flex items-center justify-center p-4" onClick={() => setExplainModalOpen(false)} role="dialog" aria-modal="true" aria-label="AI Explanation">
          <div className="bg-white w-[600px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden relative border" onClick={e => e.stopPropagation()}>
            <div className="h-12 px-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiRobot2Line size={18} className="text-blue-600" />
                <span className="font-medium">AI Explanation</span>
              </div>
              <button className="p-1.5 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => setExplainModalOpen(false)} aria-label="Close">
                <FiX size={16} />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-3rem)]">
              {explainLoading && (<div className="flex items-center justify-center py-8"><div className="text-sm text-gray-600">Analyzing chart with AI...</div></div>)}
              {explainError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 text-sm font-medium">Error</div>
                  <div className="text-red-700 text-sm mt-1">{explainError}</div>
                </div>
              )}
              {explainResponse && (
                <div className="space-y-4">
                  <div><h3 className="font-semibold text-gray-900 mb-2">Analysis</h3><p className="text-sm text-gray-700">{explainResponse.response}</p></div>
                  {explainResponse.business_value?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Business Value</h3>
                      <ul className="space-y-1">{explainResponse.business_value.map((v,i)=>(
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-600 mt-1">•</span><span>{v}</span></li>
                      ))}</ul>
                    </div>
                  )}
                  {explainResponse.suggestions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Suggestions</h3>
                      <ul className="space-y-1">{explainResponse.suggestions.map((s,i)=>(
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-blue-600 mt-1">•</span><span>{s}</span></li>
                      ))}</ul>
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
            </div>
          </div>
        </div>
      )}
    </>
  )
}
