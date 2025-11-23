import os
import csv
import datetime
import threading
import time
import cv2
import eventlet
import numpy as np

from config import EXPORT_BASE_DIR, WEBCAM_WIDTH, WEBCAM_HEIGHT, GAZE_DEVICE
from video_sources import WebcamSource, IPCameraSource
from detectors import TiltDetector, PostureDetector
from gaze_wrapper import GazeEstimator


class ProcessingEngine(threading.Thread):
    def __init__(self, config, result_callback):
        super().__init__()
        self.config = config
        self.result_callback = result_callback
        self.stop_event = threading.Event()
        self.logging_enabled = config.get('logging', False)

        # Detector Objects
        self.tilt_src = None
        self.posture_src = None
        self.tilt_det = None
        self.posture_det = None
        self.gaze_est = None

        # Chống giật (State Persistence)
        self.last_tilt_data = {}
        self.last_gaze_data = {}
        self.last_posture_data = {}

        self.csv_file = None
        self.csv_writer = None
        self.frame_idx = 0
        self.current_frame_1 = None
        self.current_frame_2 = None
        self.lock = threading.Lock()

    def stop(self):
        """Hàm dừng thread an toàn"""
        self.stop_event.set()

    def _resolve_model_path(self, path):
        """Tìm file model ở nhiều vị trí khác nhau"""
        if not path: return None

        # 1. Đường dẫn tuyệt đối hoặc đường dẫn do người dùng nhập
        if os.path.exists(path):
            return path

        # 2. Tìm trong thư mục hiện tại (Current Working Directory)
        cwd_path = os.path.join(os.getcwd(), path)
        if os.path.exists(cwd_path):
            return cwd_path

        # 3. Tìm trong thư mục chứa file code này
        script_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(script_dir, path)
        if os.path.exists(script_path):
            return script_path

        return None

    def _create_src(self, type_key, val_key):
        c_type = self.config.get(type_key, "Webcam")
        c_val = self.config.get(val_key, "0")
        try:
            if c_type == "Webcam":
                try:
                    idx = int(c_val)
                except:
                    idx = 0
                return WebcamSource(idx, WEBCAM_WIDTH, WEBCAM_HEIGHT)
            else:
                return IPCameraSource(c_val)
        except Exception as e:
            print(f"Error creating camera {type_key}: {e}")
            return None

    def update_logging(self, enabled):
        self.logging_enabled = enabled
        if enabled and not self.csv_file:
            self._init_csv()
        elif not enabled and self.csv_file:
            self._close_csv()

    def _init_csv(self):
        now = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        d = os.path.join(EXPORT_BASE_DIR, f"session_{now}")
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, "log_pro.csv")
        self.csv_file = open(path, "w", newline="", encoding="utf-8")
        self.csv_writer = csv.writer(self.csv_file)
        header = ["Timestamp", "Frame", "Tilt_Label", "Tilt_Conf"]
        kp_names = ["Nose", "L_Eye", "R_Eye", "L_Ear", "R_Ear", "L_Sho", "R_Sho"]
        for name in kp_names: header.extend([f"{name}_x", f"{name}_y"])
        header.extend(["Gaze_Label", "Pupil_L_x", "Pupil_L_y", "Pupil_R_x", "Pupil_R_y"])
        header.extend(["Posture_Label", "Box_x", "Box_y", "Box_w", "Box_h"])
        self.csv_writer.writerow(header)

    def _close_csv(self):
        if self.csv_file:
            self.csv_file.close()
            self.csv_file = None
            self.csv_writer = None

    def run(self):
        print("Engine Running...")
        try:
            # --- LOAD MODELS ---
            # Debug: In ra các file .pt hiện có để kiểm tra
            print(f"DEBUG: Current Directory: {os.getcwd()}")
            files = [f for f in os.listdir('.') if f.endswith('.pt')]
            print(f"DEBUG: .pt files found in root: {files}")

            raw_tilt_path = self.config.get('tilt_model', '').strip().strip('"')
            raw_posture_path = self.config.get('posture_model', '').strip().strip('"')

            # Resolve Tilt Path
            tilt_path = self._resolve_model_path(raw_tilt_path)
            if tilt_path:
                print(f"Loading Tilt Model from: {tilt_path}")
                try:
                    self.tilt_det = TiltDetector(tilt_path)
                except Exception as e:
                    print(f"Error Loading Tilt Model: {e}")
            else:
                print(f"ERROR: Tilt Model file not found: '{raw_tilt_path}'")

            self.tilt_src = self._create_src('tilt_type', 'tilt_val')

            # Resolve Posture Path
            posture_path = self._resolve_model_path(raw_posture_path)
            if posture_path:
                print(f"Loading Posture Model from: {posture_path}")
                try:
                    self.posture_det = PostureDetector(posture_path)
                except Exception as e:
                    print(f"Error Loading Posture Model: {e}")
            else:
                print(f"ERROR: Posture Model file not found: '{raw_posture_path}'")

            self.posture_src = self._create_src('posture_type', 'posture_val')

            if self.config.get('use_gaze', True):
                self.gaze_est = GazeEstimator(device=GAZE_DEVICE)

            if self.logging_enabled: self._init_csv()

            # --- MAIN LOOP ---
            while not self.stop_event.is_set():
                start_time = time.time()

                # CAM 1
                if self.tilt_src:
                    ret, frame = self.tilt_src.read()
                    if ret:
                        disp = frame.copy()
                        if self.frame_idx % 2 == 0 and self.tilt_det:
                            res = self.tilt_det.infer(frame)
                            if res and res.get('label'): self.last_tilt_data = res

                        if self.gaze_est and (self.frame_idx % 3 == 0):
                            res = self.gaze_est.infer(frame)
                            self.last_gaze_data = {"label": res.get('label'), "eyes": res.get('eyes_data', [])}
                            if res.get('annotated') is not None: disp = res['annotated']

                        t_d = self.last_tilt_data
                        if t_d.get('label'):
                            cv2.putText(disp, f"T: {t_d['label']}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                                        (0, 255, 0), 2)
                            if t_d.get('keypoints'):
                                for x, y in t_d['keypoints']: cv2.circle(disp, (int(x), int(y)), 4, (0, 255, 255), -1)

                        g_d = self.last_gaze_data
                        if g_d.get('label'):
                            col = (0, 255, 0) if "CENTER" in str(g_d['label']) else (0, 0, 255)
                            cv2.putText(disp, f"G: {g_d['label']}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, col, 2)

                        with self.lock:
                            r, b = cv2.imencode('.jpg', disp)
                            if r: self.current_frame_1 = b.tobytes()

                # CAM 2
                if self.posture_src:
                    ret, frame = self.posture_src.read()
                    if ret:
                        disp = frame.copy()
                        if self.frame_idx % 3 == 0 and self.posture_det:
                            res = self.posture_det.infer(frame)
                            if res and res.get('label'): self.last_posture_data = res

                        p_d = self.last_posture_data
                        if p_d.get('label'):
                            if p_d.get('bbox'):
                                x, y, w, h = p_d['bbox']
                                lbl = str(p_d['label']).lower()
                                c = (50, 50, 255) if "bad" in lbl or "wrong" in lbl else (50, 255, 50)
                                cv2.rectangle(disp, (int(x - w / 2), int(y - h / 2)), (int(x + w / 2), int(y + h / 2)),
                                              c, 2)
                                cv2.putText(disp, f"P: {p_d['label']}", (int(x - w / 2), int(y - h / 2) - 10),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, c, 2)

                        with self.lock:
                            r, b = cv2.imencode('.jpg', disp)
                            if r: self.current_frame_2 = b.tobytes()

                # SEND DATA
                payload = {
                    "tilt": self.last_tilt_data,
                    "gaze": self.last_gaze_data,
                    "posture": self.last_posture_data,
                    "biopac": 0
                }
                self.result_callback(payload)

                if self.logging_enabled and self.csv_writer:
                    self._write_log(self.last_tilt_data, self.last_gaze_data, self.last_posture_data)

                self.frame_idx += 1
                eventlet.sleep(0.01)

        except Exception as e:
            print(f"Engine Crash: {e}")
        finally:
            # FORCE CLEANUP
            if self.tilt_src: self.tilt_src.release()
            if self.posture_src: self.posture_src.release()
            self._close_csv()
            print("Engine Stopped & Resources Released")

    def _write_log(self, t_d, g_d, p_d):
        try:
            ts = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
            t_lbl = t_d.get('label', "") if t_d else ""
            t_conf = t_d.get('confidence', 0) if t_d else 0
            row = [ts, self.frame_idx, t_lbl, t_conf]
            self.csv_writer.writerow(row)
        except:
            pass

    def get_frame(self, cam_id):
        with self.lock:
            if cam_id == 1: return self.current_frame_1
            if cam_id == 2: return self.current_frame_2
        return None