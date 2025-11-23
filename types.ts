export enum CameraMode {
  INDEX = 'INDEX',
  IP_URL = 'IP_URL'
}

export enum AppMode {
  LIVE = 'LIVE',
  PLAYBACK = 'PLAYBACK'
}

export interface Keypoint {
  id: number;
  label: string;
  x: number;
  y: number;
  confidence: number;
}

export interface EyeCoord {
  x: number;
  y: number;
}

export interface GazeData {
  label: string; // "CENTER", "LEFT", "RIGHT", "BLINKING", "unknown"
  leftEye: EyeCoord;
  rightEye: EyeCoord;
}

export interface BiopacDataPoint {
  timestamp: number;
  value: number;
}

export enum PostureStatus {
  GOOD = 'GOOD',
  BAD = 'BAD',
  UNKNOWN = 'UNKNOWN'
}

export interface ModelData {
  label: string; // The specific class predicted by the model (e.g., "Leaning Left", "Slouching")
  confidence: number;
}

export interface AppState {
  isRecording: boolean;
  isLogging: boolean;
  cam1Mode: CameraMode;
  cam1Value: string;
  cam2Mode: CameraMode;
  cam2Value: string;
  tiltModelPath: string;    
  postureModelPath: string; 
}

export interface RecordedFrameData {
  timestamp: number;
  biopacValue: number;
  tilt: ModelData & { keypoints: Keypoint[] }; 
  posture: ModelData & { status: PostureStatus }; 
  gaze: GazeData;
}

export interface Session {
  id: string;
  timestamp: number;
  name: string;
  duration: number;
  videoUrl: string;
  data: RecordedFrameData[];
}