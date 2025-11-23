import React, { useRef } from 'react';
import { CameraMode, AppMode, Session } from '../types';
import { Settings, Play, Square, FileText, Network, Hash, History, Calendar, Clock, User, ScanFace, FolderInput, Info, Power } from 'lucide-react';

interface LeftControlsProps {
  // Global
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Live Props
  isRecording: boolean;
  isLogging: boolean;
  onToggleRecording: () => void;
  onToggleLogging: () => void;
  onShutdown: () => void; // New prop for shutdown

  // Cam 1 (Tilt)
  cam1Mode: CameraMode;
  setCam1Mode: (mode: CameraMode) => void;
  cam1Value: string;
  setCam1Value: (val: string) => void;
  tiltModelPath: string;
  setTiltModelPath: (path: string) => void;

  // Cam 2 (Posture)
  cam2Mode: CameraMode;
  setCam2Mode: (mode: CameraMode) => void;
  cam2Value: string;
  setCam2Value: (val: string) => void;
  postureModelPath: string;
  setPostureModelPath: (path: string) => void;

  // Playback Props
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (s: Session) => void;
  isPlayingPlayback: boolean;
  onTogglePlayback: () => void;
  playbackTime: number;
  onSeek: (time: number) => void;
}

export const LeftControls: React.FC<LeftControlsProps> = ({
  mode,
  setMode,
  isRecording,
  isLogging,
  onToggleRecording,
  onToggleLogging,
  onShutdown,
  cam1Mode,
  setCam1Mode,
  cam1Value,
  setCam1Value,
  tiltModelPath,
  setTiltModelPath,
  cam2Mode,
  setCam2Mode,
  cam2Value,
  setCam2Value,
  postureModelPath,
  setPostureModelPath,
  sessions,
  selectedSession,
  onSelectSession,
  isPlayingPlayback,
  onTogglePlayback,
  playbackTime,
  onSeek
}) => {
  const tiltFileRef = useRef<HTMLInputElement>(null);
  const postureFileRef = useRef<HTMLInputElement>(null);

  const handleTiltFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setTiltModelPath(e.target.files[0].name);
  };

  const handlePostureFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setPostureModelPath(e.target.files[0].name);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden">
      {/* Header & Tabs */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800">
        <div className="p-4 pb-2 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-lg text-white">Điều Khiển</h2>
        </div>
        <div className="flex px-2 pb-2 gap-1">
          <button
            onClick={() => setMode(AppMode.LIVE)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg border-b-2 transition-all ${mode === AppMode.LIVE ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setMode(AppMode.PLAYBACK)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg border-b-2 transition-all ${mode === AppMode.PLAYBACK ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Lịch Sử
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* LIVE MODE CONTENT */}
        {mode === AppMode.LIVE && (
          <>
             <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300 mb-4">
                <strong>Lưu ý về Model:</strong> Để tốt nhất, hãy copy file .pt vào cùng thư mục với <code>server.py</code> hoặc Paste đường dẫn tuyệt đối vào ô bên dưới.
             </div>

            {/* Camera 1 & Tilt Model */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <ScanFace className="w-4 h-4" /> Cam 1: Gaze & Tilt
              </label>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                {/* Model Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Model Tilt (.pt)</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tiltModelPath}
                      onChange={(e) => setTiltModelPath(e.target.value.replace(/"/g, ''))}
                      placeholder="C:\Path\To\model.pt"
                      className="flex-1 bg-slate-950 text-xs px-2 py-1.5 rounded border border-slate-700 text-slate-200 focus:border-blue-500 outline-none truncate"
                    />
                    <button onClick={() => tiltFileRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 text-xs rounded border border-slate-600">
                      <FolderInput className="w-4 h-4" />
                    </button>
                    <input type="file" ref={tiltFileRef} accept=".pt,.pth" className="hidden" onChange={handleTiltFile}/>
                  </div>
                </div>

                {/* Cam Source */}
                <div className="space-y-1">
                   <div className="flex bg-slate-900 rounded p-1">
                    <button onClick={() => setCam1Mode(CameraMode.INDEX)} className={`flex-1 text-xs py-1 rounded flex items-center justify-center gap-1 transition-all ${cam1Mode === CameraMode.INDEX ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Hash className="w-3 h-3" /> Index</button>
                    <button onClick={() => setCam1Mode(CameraMode.IP_URL)} className={`flex-1 text-xs py-1 rounded flex items-center justify-center gap-1 transition-all ${cam1Mode === CameraMode.IP_URL ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Network className="w-3 h-3" /> URL</button>
                  </div>
                  <input type={cam1Mode === CameraMode.INDEX ? "number" : "text"} value={cam1Value} onChange={(e) => setCam1Value(e.target.value)} placeholder={cam1Mode === CameraMode.INDEX ? "0" : "rtsp://..."} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs focus:border-blue-500 outline-none"/>
                </div>
              </div>
            </div>

            {/* Camera 2 & Posture Model */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Cam 2: Posture
              </label>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                {/* Model Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Model Posture (.pt)</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={postureModelPath}
                      onChange={(e) => setPostureModelPath(e.target.value.replace(/"/g, ''))}
                      placeholder="C:\Path\To\model.pt"
                      className="flex-1 bg-slate-950 text-xs px-2 py-1.5 rounded border border-slate-700 text-slate-200 focus:border-blue-500 outline-none truncate"
                    />
                    <button onClick={() => postureFileRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 text-xs rounded border border-slate-600">
                      <FolderInput className="w-4 h-4" />
                    </button>
                    <input type="file" ref={postureFileRef} accept=".pt,.pth" className="hidden" onChange={handlePostureFile}/>
                  </div>
                </div>

                {/* Cam Source */}
                <div className="space-y-1">
                   <div className="flex bg-slate-900 rounded p-1">
                    <button onClick={() => setCam2Mode(CameraMode.INDEX)} className={`flex-1 text-xs py-1 rounded flex items-center justify-center gap-1 transition-all ${cam2Mode === CameraMode.INDEX ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Hash className="w-3 h-3" /> Index</button>
                    <button onClick={() => setCam2Mode(CameraMode.IP_URL)} className={`flex-1 text-xs py-1 rounded flex items-center justify-center gap-1 transition-all ${cam2Mode === CameraMode.IP_URL ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Network className="w-3 h-3" /> URL</button>
                  </div>
                  <input type={cam2Mode === CameraMode.INDEX ? "number" : "text"} value={cam2Value} onChange={(e) => setCam2Value(e.target.value)} placeholder={cam2Mode === CameraMode.INDEX ? "1" : "rtsp://..."} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs focus:border-blue-500 outline-none"/>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PLAYBACK MODE CONTENT */}
        {mode === AppMode.PLAYBACK && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" /> Danh sách phiên
              </label>
              <div className="space-y-2">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedSession?.id === session.id ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                  >
                    <div className="font-medium text-sm text-slate-200">{session.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(session.timestamp)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {Math.round(session.duration)}s</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedSession && (
              <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">Playback Controls</h3>
                    <span className="text-xs font-mono text-blue-400">{formatTime(playbackTime)} / {formatTime(selectedSession.duration)}</span>
                 </div>

                 <div className="flex items-center gap-2">
                    <button
                      onClick={onTogglePlayback}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"
                    >
                      {isPlayingPlayback ? <React.Fragment><span className="sr-only">Pause</span><div className="w-3 h-3 bg-white rounded-sm"></div></React.Fragment> : <Play className="w-5 h-5 fill-current ml-0.5"/>}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={selectedSession.duration}
                      step="0.1"
                      value={playbackTime}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {mode === AppMode.LIVE && (
        <div className="shrink-0 p-4 bg-slate-900 border-t border-slate-800 space-y-2">
          <button
            onClick={onToggleRecording}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isRecording 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
            }`}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            {isRecording ? 'Dừng Hệ Thống' : 'Bắt Đầu'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
                onClick={onToggleLogging}
                className={`py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all border text-xs ${
                isLogging 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
            >
                <FileText className="w-4 h-4" />
                {isLogging ? 'Đang Ghi Log' : 'Ghi Log'}
            </button>

            <button
                onClick={onShutdown}
                className="py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all border text-xs bg-slate-800 text-red-400 border-slate-700 hover:bg-red-950 hover:border-red-900"
                title="Tắt hoàn toàn Server"
            >
                <Power className="w-4 h-4" />
                Tắt Server
            </button>
          </div>
        </div>
      )}
    </div>
  );
};