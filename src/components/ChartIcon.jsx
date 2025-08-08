// components/ChartIcon.js
import React from 'react'
import {
  AiOutlineLineChart,
  AiOutlineBarChart,
  AiOutlinePieChart,
  AiOutlineRadarChart,
  AiOutlineQuestion,
  AiOutlineHeatMap 
} from 'react-icons/ai'
import { GiWorld } from "react-icons/gi";
import { CiViewTable } from "react-icons/ci";
import { RiDonutChartLine, RiBarChartGroupedLine, RiBubbleChartLine } from 'react-icons/ri'
import { PiChartScatterLight, PiChartPolarThin } from "react-icons/pi";
import { MdOutlineStackedLineChart } from "react-icons/md";


const ChartIcon = ({ type, className, ...rest }) => {
  const t = (type || '').toLowerCase()

  const map = {
    line: AiOutlineLineChart,
    bar: AiOutlineBarChart,
    pie: AiOutlinePieChart,
    doughnut: RiDonutChartLine,    
    radar: AiOutlineRadarChart,     
    bubble: RiBubbleChartLine,         
    polar: PiChartPolarThin,
    scatter: PiChartScatterLight,
    multi_bar: RiBarChartGroupedLine,
    multi_line: MdOutlineStackedLineChart,
    heatmap: AiOutlineHeatMap,
    worldmap: GiWorld, // Assuming world map uses heatmap icon for now
    grid: CiViewTable
  }

  const IconComponent = map[t] || AiOutlineQuestion
  if (!IconComponent) {
    return <AiOutlineQuestion className={className} {...rest} />
  }
  return <IconComponent className={className} {...rest} />
}

export default ChartIcon
