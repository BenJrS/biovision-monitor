# BioVision Monitor V2.0

Hệ thống giám sát thị giác máy tính tích hợp (Dual-Camera Computer Vision System) sử dụng AI để phân tích hành vi người dùng: theo dõi ánh mắt (Gaze Tracking), phát hiện độ nghiêng đầu (Head Tilt) và đánh giá tư thế ngồi (Posture Analysis). Gồm frontend Web (React + TypeScript) và backend xử lý AI (Python + Flask).

A bilingual quick summary (EN):
- Dual-camera real-time monitoring (close-up for gaze/tilt, wide for posture).
- Frontend: React + TypeScript (served by Flask backend).
- Backend: Python (Flask, MediaPipe, YOLOv5/YOLOv8).
- Streams via MJPEG and supports CSV export of analysis logs.

---

## 🚀 Tính năng chính / Features

- Camera 1 (Cận cảnh)
  - Gaze Tracking: phát hiện nhìn trái/phải/giữa và chớp mắt (MediaPipe).
  - Head Tilt: phát hiện góc nghiêng đầu và 7 keypoints mặt (YOLOv8).
- Camera 2 (Toàn cảnh)
  - Posture Analysis: đánh giá tư thế ngồi (Tốt / Xấu) (YOLOv5).
- Real-time Visualization
  - Video stream MJPEG, biểu đồ tín hiệu BIOPAC, bảng tọa độ keypoint & trạng thái.
- Ghi hình & Log
  - Lưu dữ liệu phân tích ra CSV trong `backend/exports/`.
  - Playback đang trong quá trình phát triển.
- Dễ dùng: chạy trên trình duyệt, tự động mở, tắt server từ giao diện.

---

## 🛠 Yêu cầu hệ thống / Requirements

- Node.js >= 16 (build frontend)
  - https://nodejs.org/
- Python >= 3.8 (chạy backend / AI)
  - https://python.org/
- GPU (tùy chọn) để tăng tốc inference cho YOLO / torch

---

## 📦 Cài đặt / Installation

1. Clone repository
```bash
git clone https://github.com/BenJrS/biovision-monitor.git
cd biovision-monitor
```

2. Cài frontend dependencies (tại thư mục gốc nơi có `package.json`)
```bash
npm install
```

3. (Tùy chọn) Build frontend (chỉ cần khi thay đổi giao diện)
```bash
npm run build
# Kết quả sẽ nằm ở thư mục `dist/` hoặc tuỳ cấu hình
```

4. Cài backend Python dependencies
- Nếu repository có file `backend/requirements.txt`:
```bash
pip install -r backend/requirements.txt
```
- Nếu không có, cài thủ công các gói cơ bản:
```bash
pip install flask flask-socketio flask-cors eventlet opencv-python-headless numpy mediapipe ultralytics torch torchvision
```
Lưu ý: thay `opencv-python-headless` bằng `opencv-python` nếu bạn cần GUI/Video capture trên desktop.

---

## ▶️ Chạy hệ thống / Run

1. (Nếu bạn đã build frontend) Chạy server Python từ thư mục gốc:
```bash
python backend/server.py
```
Mặc định server mở địa chỉ `http://127.0.0.1:5001` (hoặc port được cấu hình). Trình duyệt có thể tự mở. Nếu không — mở tay `http://127.0.0.1:5001`.

2. Trên giao diện Web:
- Chọn Mode: Live Monitor
- Cam 1 (Gaze & Tilt):
  - Model Tilt: nhập tên file `.pt` (ví dụ `best_tilt.pt`) hoặc đường dẫn tuyệt đối.
  - Source: index camera (0,1,...) hoặc URL camera IP.
- Cam 2 (Posture):
  - Model Posture: nhập tên file `.pt` (ví dụ `best_posture.pt`).
  - Source: index hoặc URL.
- Nhấn BẮT ĐẦU để load model & bật camera.
- Nhấn Ghi Log CSV để lưu dữ liệu vào `backend/exports/`.
- Nhấn DỪNG HỆ THỐNG để tắt camera/process.
- Nhấn nút Nguồn (đỏ) để tắt server hoàn toàn.

---

## 🧠 Model (Yêu cầu Model .pt)

- Camera 1 tilt model: YOLOv8 `.pt`
- Camera 2 posture model: YOLOv5 `.pt`
Mẹo: copy file model vào thư mục `backend/` để backend dễ tìm hoặc đặt đường dẫn đầy đủ trong UI.
