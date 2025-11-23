import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { LeftControls } from './components/LeftControls';
import { VideoDisplay } from './components/VideoDisplay';
import { BiopacChart } from './components/BiopacChart';
import { RightDataPanel } from './components/RightDataPanel';
import { 
  CameraMode, Keypoint, GazeData, PostureStatus, 
  BiopacDataPoint, AppMode, Session, RecordedFrameData, ModelData 
} from './types';
import { Settings, Link } from 'lucide-react';

// Constants
const MAX_DATA_POINTS = 100;
// Khôi phục tên Label chuẩn
const KEYPOINT_LABELS = ['Nose', 'L.Eye', 'R.Eye', 'L.Ear', 'R.Ear', 'L.Sho', 'R.Sho'];

const App: React.FC = () => {
  // Global Mode
  const [mode, setMode] = useState<AppMode>(AppMode.LIVE);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Connection Settings - Default to 5001 now
  const [serverUrl, setServerUrl] = useState(`http://localhost:5001`);
  const [tempUrl, setTempUrl] = useState(`http://localhost:5001`);

  // --- STATE FOR SETTINGS ---
  const [isRecording, setIsRecording] = useState(false); // Controls "Start/Stop" of processing
  const [isLogging, setIsLogging] = useState(false);

  // Ref to track recording state inside socket closures
  const isRecordingRef = useRef(false);

  // Cam 1 Config
  const [cam1Mode, setCam1Mode] = useState<CameraMode>(CameraMode.INDEX);
  const [cam1Value, setCam1Value] = useState<string>('0');
  const [tiltModelPath, setTiltModelPath] = useState<string>('');

  // Cam 2 Config
  const [cam2Mode, setCam2Mode] = useState<CameraMode>(CameraMode.INDEX);
  const [cam2Value, setCam2Value] = useState<string>('1');
  const [postureModelPath, setPostureModelPath] = useState<string>('');

  // --- STATE FOR DATA ---
  const [biopacData, setBiopacData] = useState<BiopacDataPoint[]>([]);

  const [tiltData, setTiltData] = useState<ModelData & { keypoints: Keypoint[] }>({
    label: '',
    confidence: 0,
    keypoints: []
  });

  const [postureData, setPostureData] = useState<ModelData & { status: PostureStatus }>({
    label: '',
    confidence: 0,
    status: PostureStatus.UNKNOWN
  });

  const [gazeData, setGazeData] = useState<GazeData>({
    label: '',
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 }
  });

  // --- PLAYBACK STATE ---
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isPlayingPlayback, setIsPlayingPlayback] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Sync Ref with State
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Initialize Socket
  useEffect(() => {
    // Sanitize URL: remove trailing slash if present to avoid socket.io path errors
    const cleanUrl = serverUrl.replace(/\/$/, "");
    console.log(`Attempting connection to ${cleanUrl}...`);

    // Config: Use polling first for maximum compatibility with Flask-SocketIO default servers.
    // 'websocket' only is often blocked or fails handshake on some python setups.
    const newSocket = io(cleanUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: true, // Force a new connection object
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('Socket Connected Successfully to', cleanUrl);
      setIsConnected(true);
    });

    newSocket.on('connect_error', (err) => {
        console.warn('Socket Connection Error:', err.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket Disconnected:', reason);
      setIsConnected(false);
      setIsRecording(false); // Stop if disconnected
    });

    newSocket.on('data_update', (data: any) => {
        // CRITICAL FIX: Stop processing data if we are not recording.
        if (!isRecordingRef.current) return;

        // Handle Realtime Data
        const now = Date.now();

        // 1. Biopac (Simulate if missing, or use data.biopac)
        const bpVal = (typeof data.biopac === 'number') ? data.biopac : 0;

        setBiopacData(prev => {
            const newData = [...prev, { timestamp: now, value: bpVal }];
            return newData.length > MAX_DATA_POINTS ? newData.slice(newData.length - MAX_DATA_POINTS) : newData;
        });

        // 2. Tilt & Keypoints
        if (data.tilt) {
            // FIX: Read 'keypoints' from python, fallback to 'kps' if old version
            const rawKps = data.tilt.keypoints || data.tilt.kps || [];

            const kps: Keypoint[] = rawKps.map((p: number[], i: number) => ({
                id: i,
                // Use Standard Labels (Nose, Eye...) or Fallback to KP0, KP1...
                label: KEYPOINT_LABELS[i] || `KP${i}`,
                x: p[0],
                y: p[1],
                confidence: 1
            }));

            // Pad if less than 7 keypoints to ensure table structure remains stable
            while(kps.length < 7) {
                const i = kps.length;
                kps.push({
                    id: i,
                    label: KEYPOINT_LABELS[i] || `KP${i}`,
                    x: 0,
                    y: 0,
                    confidence: 0
                });
            }

            setTiltData({
                label: data.tilt.label || '',
                confidence: data.tilt.conf || 0,
                keypoints: kps
            });
        }

        // 3. Gaze
        if (data.gaze) {
            const eyes = data.gaze.eyes || [];
            setGazeData({
                label: data.gaze.label || '',
                leftEye: eyes[0] ? { x: eyes[0].rel[0], y: eyes[0].rel[1] } : { x: 0, y: 0 },
                rightEye: eyes[1] ? { x: eyes[1].rel[0], y: eyes[1].rel[1] } : { x: 0, y: 0 }
            });
        }

        // 4. Posture
        if (data.posture) {
            const lbl = data.posture.label || '';
            // Logic match python: if "bad" in label -> BAD
            const isBad = lbl.toLowerCase().includes('bad');
            setPostureData({
                label: lbl,
                confidence: 0, // Python script doesn't send conf for posture
                status: lbl ? (isBad ? PostureStatus.BAD : PostureStatus.GOOD) : PostureStatus.UNKNOWN
            });
        }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [serverUrl]); // Re-connect when URL changes

  // Handle Start/Stop Logic
  const handleToggleRecording = () => {
    if (!socket || !isConnected) return;

    if (isRecording) {
        // Stop
        socket.emit('stop_processing', { force: true });
        setIsRecording(false);
        setIsLogging(false);
    } else {
        // Start
        const config = {
            // General settings
            use_tilt: true,
            use_posture: true,
            use_gaze: true,
            logging: isLogging,

            // CAM 1 (Tilt/Gaze) Configuration
            tilt_model: tiltModelPath.trim().replace(/^"|"$/g, ''), // Clean quotes
            tilt_type: cam1Mode === CameraMode.INDEX ? 'Webcam' : 'IP',
            tilt_val: cam1Value,

            // CAM 2 (Posture) Configuration
            posture_model: postureModelPath.trim().replace(/^"|"$/g, ''), // Clean quotes
            posture_type: cam2Mode === CameraMode.INDEX ? 'Webcam' : 'IP',
            posture_val: cam2Value,

            // Compatibility keys
            cam1_type: cam1Mode === CameraMode.INDEX ? 'Webcam' : 'IP',
            cam1_val: cam1Value,
            cam2_type: cam2Mode === CameraMode.INDEX ? 'Webcam' : 'IP',
            cam2_val: cam2Value,
        };
        console.log("Sending Config:", config);
        socket.emit('start_processing', config);
        setIsRecording(true);
    }
  };

  // Handle Logging Toggle
  const handleToggleLogging = () => {
      if (isRecording && socket) {
          const newLogState = !isLogging;
          setIsLogging(newLogState);
          socket.emit('update_logging', { logging: newLogState });
      } else {
          setIsLogging(!isLogging); // Just toggle UI state if not running
      }
  };

  // --- NEW: SHUTDOWN HANDLER ---
  const handleShutdown = () => {
      if (confirm("Bạn có chắc chắn muốn TẮT SERVER không?\nHành động này sẽ đóng cửa sổ dòng lệnh Python.")) {
          if (socket) {
              socket.emit('shutdown_server');
              // Close window after short delay
              setTimeout(() => {
                  window.close();
                  alert("Server đã tắt. Bạn có thể đóng tab này.");
              }, 1000);
          }
      }
  };

  // --- PLAYBACK LOGIC ---
  const handlePlaybackTimeUpdate = useCallback((currentTime: number) => {
     setPlaybackTime(currentTime);
     if (selectedSession) {
         // Mock logic for playback since we don't have real files in this demo
         // In a real app, this would fetch from a database or file
     }
  }, [selectedSession]);

  const handleSelectSession = (s: Session) => {
      setSelectedSession(s);
      setPlaybackTime(0);
      setIsPlayingPlayback(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">

      <LeftControls
        mode={mode}
        setMode={setMode}
        isRecording={isRecording}
        isLogging={isLogging}
        onToggleRecording={handleToggleRecording}
        onToggleLogging={handleToggleLogging}
        onShutdown={handleShutdown} // Pass shutdown handler

        // Cam 1
        cam1Mode={cam1Mode}
        setCam1Mode={setCam1Mode}
        cam1Value={cam1Value}
        setCam1Value={setCam1Value}
        tiltModelPath={tiltModelPath}
        setTiltModelPath={setTiltModelPath}
        
        // Cam 2
        cam2Mode={cam2Mode}
        setCam2Mode={setCam2Mode}
        cam2Value={cam2Value}
        setCam2Value={setCam2Value}
        postureModelPath={postureModelPath}
        setPostureModelPath={setPostureModelPath}

        // Playback
        sessions={sessions}
        selectedSession={selectedSession}
        onSelectSession={handleSelectSession}
        isPlayingPlayback={isPlayingPlayback}
        onTogglePlayback={() => setIsPlayingPlayback(!isPlayingPlayback)}
        playbackTime={playbackTime}
        onSeek={(t) => { setPlaybackTime(t); setIsPlayingPlayback(false); }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900 justify-between">
            <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                BioVision <span className="text-slate-500 font-normal">Monitor V2.0</span>
                {mode === AppMode.PLAYBACK && <span className="ml-2 px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-500/30 uppercase">Review Mode</span>}
            </h1>
            <div className="text-xs text-slate-500 font-mono flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    <Link className="w-3 h-3 text-slate-400" />
                    <input 
                        type="text" 
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setServerUrl(tempUrl);
                            }
                        }}
                        onBlur={() => setServerUrl(tempUrl)}
                        className="w-48 bg-slate-900 border-none focus:ring-1 focus:ring-blue-500 rounded text-slate-200 outline-none px-2 text-right"
                    />
                </div>
                <span>Status: {isConnected ? <span className="text-green-400 font-bold">CONNECTED</span> : <span className="text-red-400 font-bold">DISCONNECTED</span>}</span>
                <span>System: {mode === AppMode.LIVE ? (isRecording ? <span className="text-blue-400">PROCESSING</span> : <span className="text-slate-400">IDLE</span>) : <span className="text-purple-400">PLAYBACK</span>}</span>
            </div>
        </div>

        <div className="flex-[3] p-4 min-h-0">
           <VideoDisplay 
                mode={mode}
                isConnected={isConnected}
                isProcessing={isRecording}
                serverUrl={serverUrl}
                playbackSrc={selectedSession?.videoUrl}
                playbackTime={playbackTime}
                isPlaying={isPlayingPlayback}
                onTimeUpdate={handlePlaybackTimeUpdate}
           />
        </div>

        <div className="flex-[2] px-4 pb-4 min-h-0">
            <BiopacChart data={biopacData} mode={mode} />
        </div>
      </div>

      <RightDataPanel
        tiltData={tiltData}
        gaze={gazeData}
        posture={postureData}
      />
      
    </div>
  );
};

export default App;
