import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface EChartCardProps {
  title: string;
  subtitle?: string;
  option: EChartsOption;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  height?: number;
  onEvents?: Record<string, (params: any) => void>;
  footer?: React.ReactNode;
}

const loadingOption = {
  text: 'Cargando datos...',
  color: '#2563eb',
  textColor: '#334155',
  maskColor: 'rgba(255, 255, 255, 0.72)',
  zlevel: 0,
};

const EChartCard: React.FC<EChartCardProps> = ({
  title,
  subtitle,
  option,
  loading = false,
  empty = false,
  emptyText = 'Sin datos para mostrar',
  height = 320,
  onEvents,
  footer,
}) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      {empty ? (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500"
          style={{ height }}
        >
          {emptyText}
        </div>
      ) : (
        <ReactECharts
          option={option}
          showLoading={loading}
          loadingOption={loadingOption}
          notMerge
          lazyUpdate
          onEvents={onEvents}
          style={{ height, width: '100%' }}
        />
      )}

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
};

export default EChartCard;
