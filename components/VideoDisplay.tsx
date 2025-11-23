import React, { useEffect, useRef, useState } from 'react';
import { AppMode } from '../types';

interface VideoDisplayProps {
  mode: AppMode;
  isConnected: boolean; // Connected to Python server?
  isProcessing: boolean; // Is the python processing loop running?
  serverUrl: string; // Dynamic Server URL from App
  playbackSrc?: string;
  playbackTime?: number;
  isPlaying?: boolean;
  onTimeUpdate?: (time: number) => void;
}

export const VideoDisplay: React.FC<VideoDisplayProps> = ({ 
  mode, 
  isConnected,
  isProcessing,
  serverUrl,
  playbackSrc, 
  playbackTime, 
  isPlaying, 
  onTimeUpdate 
}) => {
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  
  // Use dynamic URL passed from parent
  const feed1 = `${serverUrl}/video_feed_1`;
  const feed2 = `${serverUrl}/video_feed_2`;

  // Playback Video Logic
  useEffect(() => {
    if (mode === AppMode.PLAYBACK && playbackVideoRef.current) {
        if (isPlaying) {
            playbackVideoRef.current.play().catch(e => console.error("Play error", e));
        } else {
            playbackVideoRef.current.pause();
        }
    }
  }, [isPlaying, mode]);

  // Sync Playback Time (Seek)
  useEffect(() => {
    if (mode === AppMode.PLAYBACK && playbackVideoRef.current && playbackTime !== undefined) {
        const diff = Math.abs(playbackVideoRef.current.currentTime - playbackTime);
        if (diff > 0.5) { 
            playbackVideoRef.current.currentTime = playbackTime;
        }
    }
  }, [playbackTime, mode]);

  const handleTimeUpdate = () => {
    if (playbackVideoRef.current && onTimeUpdate) {
        onTimeUpdate(playbackVideoRef.current.currentTime);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Camera 1 / Video Player */}
      <div className="relative bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-mono text-green-400 flex items-center gap-1 z-10">
          <div className={`w-2 h-2 rounded-full ${mode === AppMode.LIVE && isProcessing ? 'bg-green-500 animate-pulse' : (mode === AppMode.PLAYBACK && isPlaying) ? 'bg-blue-500' : 'bg-red-500'}`}></div>
          {mode === AppMode.LIVE ? 'CAM 01 (Tilt & Gaze)' : 'PLAYBACK VIDEO'}
        </div>
        
        {mode === AppMode.LIVE ? (
           isProcessing ? (
             <img 
               src={feed1} 
               alt="Live Stream 1" 
               className="w-full h-full object-contain bg-slate-900"
               onError={(e) => {
                 // Retry loading image on error (connection drop)
                 const target = e.target as HTMLImageElement;
                 // Prevent infinite rapid reload loop if server is down
                 if (!target.getAttribute('data-retry')) {
                     target.setAttribute('data-retry', 'true');
                     setTimeout(() => { 
                         target.src = feed1 + '?' + new Date().getTime(); 
                         target.removeAttribute('data-retry');
                     }, 2000);
                 }
               }}
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-500 flex-col gap-2">
                 {isConnected ? (
                     <>
                        <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-dashed"></div>
                        <span>Sẵn sàng. Bấm 'Bắt Đầu' để chạy AI.</span>
                     </>
                 ) : (
                     <>
                        <div className="text-red-500 text-lg">⚠️ Mất kết nối Server</div>
                        <div className="text-xs text-slate-400">Kiểm tra Port {serverUrl.split(':').pop()} hoặc chạy 'python server.py'</div>
                     </>
                 )}
             </div>
           )
        ) : (
            playbackSrc ? (
                <video
                    ref={playbackVideoRef}
                    src={playbackSrc}
                    className="w-full h-full object-contain bg-black"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => onTimeUpdate && onTimeUpdate(0)} 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                    Chọn phiên để xem lại
                </div>
            )
        )}
      </div>

      {/* Camera 2 View */}
      <div className="relative bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
         <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-mono text-green-400 flex items-center gap-1 z-10">
          <div className={`w-2 h-2 rounded-full ${mode === AppMode.LIVE && isProcessing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          CAM 02 (Posture)
        </div>
        
         <div className="w-full h-full flex items-center justify-center bg-slate-900 relative">
             {mode === AppMode.LIVE ? (
                 isProcessing ? (
                    <img 
                       src={feed2} 
                       alt="Live Stream 2" 
                       className="w-full h-full object-contain bg-slate-900"
                       onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         if (!target.getAttribute('data-retry')) {
                            target.setAttribute('data-retry', 'true');
                            setTimeout(() => { 
                                target.src = feed2 + '?' + new Date().getTime(); 
                                target.removeAttribute('data-retry');
                            }, 2000);
                         }
                       }}
                    />
                 ) : (
                    <div className="text-slate-600 text-sm">
                        {isConnected ? 'Chờ tín hiệu...' : 'Không có kết nối'}
                    </div>
                 )
             ) : (
                 <div className="text-slate-600 text-sm">
                     Không có dữ liệu Cam 2 (Playback)
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};