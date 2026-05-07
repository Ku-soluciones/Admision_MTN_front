import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface EChartProps {
  option: EChartsOption;
  height?: number;
  onEvents?: Record<string, (params: any) => void>;
}

const EChart: React.FC<EChartProps> = ({ option, height = 300, onEvents }) => (
  <ReactECharts
    option={option}
    notMerge
    lazyUpdate
    onEvents={onEvents}
    style={{ width: '100%', height }}
  />
);

export default EChart;
