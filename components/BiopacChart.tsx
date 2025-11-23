import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BiopacDataPoint, AppMode } from '../types';
import { Activity, History } from 'lucide-react';

interface BiopacChartProps {
  data: BiopacDataPoint[];
  mode?: AppMode;
}

export const BiopacChart: React.FC<BiopacChartProps> = ({ data, mode = AppMode.LIVE }) => {
  const isLive = mode === AppMode.LIVE;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-2">
            {isLive ? <Activity className="w-4 h-4 text-emerald-400" /> : <History className="w-4 h-4 text-blue-400" />}
            <h3 className="font-semibold text-sm text-slate-300">
                {isLive ? 'BIOPAC Signal (Live)' : 'BIOPAC Signal (Recorded)'}
            </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
            {isLive ? 'Live Stream: 100Hz' : 'Playback View'}
        </span>
      </div>
      
      <div className="flex-1 min-h-0 w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
                dataKey="timestamp" 
                hide={true} 
                domain={['dataMin', 'dataMax']}
                type="number"
            />
            <YAxis 
                domain={[-10, 10]} 
                hide={false} 
                stroke="#64748b"
                tick={{fontSize: 10}}
                width={30}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                itemStyle={{ color: isLive ? '#34d399' : '#60a5fa' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: number) => [value.toFixed(2), 'Amplitude']}
            />
            <Line 
                type="monotone" 
                dataKey="value" 
                stroke={isLive ? "#34d399" : "#60a5fa"} 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false} // Disable animation for performance
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
