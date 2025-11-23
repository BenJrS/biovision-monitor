import React from 'react';
import { Keypoint, GazeData, ModelData, PostureStatus } from '../types';
import { Eye, Activity, AlertTriangle, CheckCircle, ScanFace } from 'lucide-react';

interface RightDataPanelProps {
  tiltData: ModelData & { keypoints: Keypoint[] };
  gaze: GazeData;
  posture: ModelData & { status: PostureStatus };
}

export const RightDataPanel: React.FC<RightDataPanelProps> = ({ tiltData, gaze, posture }) => {

  const getPostureColor = (status: PostureStatus) => {
    switch(status) {
        case PostureStatus.GOOD: return 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
        case PostureStatus.BAD: return 'bg-rose-500/10 border-rose-500 text-rose-400';
        default: return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  const getPostureIcon = (status: PostureStatus) => {
      switch(status) {
          case PostureStatus.GOOD: return <CheckCircle className="w-8 h-8" />;
          case PostureStatus.BAD: return <AlertTriangle className="w-8 h-8 animate-pulse" />;
          default: return <Activity className="w-8 h-8" />;
      }
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        <h2 className="font-bold text-lg text-white">Kết Quả AI</h2>
      </div>

      <div className="p-4 space-y-6">

        {/* POSTURE EVALUATION (CAM 2) */}
        <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Đánh Giá Tư Thế (Cam 2)</h3>
            <div className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${getPostureColor(posture.status)}`}>
                {getPostureIcon(posture.status)}
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg uppercase truncate" title={posture.label || "WAITING"}>
                        {posture.label || "WAITING"}
                    </div>
                    <div className="text-xs opacity-80 flex justify-between">
                        <span>{posture.status === PostureStatus.GOOD ? 'Tốt' : (posture.status === PostureStatus.BAD ? 'Cảnh báo' : '---')}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* GAZE TRACKING (CAM 1) */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Eye className="w-3 h-3" /> Gaze Tracking (Cam 1)
          </h3>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
             <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                 <span className="text-xs text-slate-400">Hướng nhìn</span>
                 <span className={`font-bold font-mono ${gaze.label?.toLowerCase() === 'center' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {gaze.label || "--"}
                 </span>
             </div>
             <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-slate-900/50 p-2 rounded">
                    <div className="text-slate-500 mb-1">Mắt Trái (L)</div>
                    <div className="font-mono text-blue-300">
                        {gaze.leftEye && gaze.leftEye.x > 0 ? `${gaze.leftEye.x}, ${gaze.leftEye.y}` : "--, --"}
                    </div>
                 </div>
                 <div className="bg-slate-900/50 p-2 rounded">
                    <div className="text-slate-500 mb-1">Mắt Phải (R)</div>
                    <div className="font-mono text-blue-300">
                        {gaze.rightEye && gaze.rightEye.x > 0 ? `${gaze.rightEye.x}, ${gaze.rightEye.y}` : "--, --"}
                    </div>
                 </div>
             </div>
          </div>
        </div>

        {/* KEYPOINTS & TILT (CAM 1) */}
        <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <ScanFace className="w-3 h-3" /> Tilt & Keypoints (Cam 1)
            </h3>

            {/* Tilt Label Display */}
            <div className="bg-slate-800 px-3 py-2 rounded border border-slate-700 flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400">Tilt Label:</span>
                <span className="text-sm font-bold text-cyan-400 truncate max-w-[120px]" title={tiltData.label}>{tiltData.label || "Searching..."}</span>
            </div>

            {/* Keypoints Table */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-xs text-left table-fixed">
                    <thead className="bg-slate-900 text-slate-400">
                        <tr>
                            <th className="px-3 py-2 w-1/3">Point</th>
                            <th className="px-2 py-2 text-right w-1/3">X</th>
                            <th className="px-2 py-2 text-right w-1/3">Y</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tiltData.keypoints && tiltData.keypoints.length > 0 ? (
                            tiltData.keypoints.map((kp) => (
                                <tr key={kp.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-3 py-1.5 font-medium text-slate-300 truncate">{kp.label}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                                        {kp.x > 0 ? Math.round(kp.x) : '-'}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                                        {kp.y > 0 ? Math.round(kp.y) : '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                             // Render empty rows if no data yet to keep layout stable
                             Array.from({ length: 7 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-3 py-1.5 font-medium text-slate-500">KP{i}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600">-</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600">-</td>
                                </tr>
                             ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};