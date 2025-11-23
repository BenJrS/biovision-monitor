import os
import sys
import webbrowser
import eventlet

# Monkey patch FIRST
eventlet.monkey_patch()

from flask import Flask, Response, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS

from processing_engine import ProcessingEngine

# Xác định thư mục chứa file tĩnh (Frontend Build)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

STATIC_FOLDER = os.path.join(BACKEND_DIR, 'dist')
if not os.path.exists(STATIC_FOLDER):
    STATIC_FOLDER = os.path.join(PROJECT_ROOT, 'dist')

print(f"Serving static files from: {STATIC_FOLDER}")

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
engine = None


# --- ROUTES ---
@app.route('/')
def serve_index():
    if os.path.exists(os.path.join(STATIC_FOLDER, 'index.html')):
        return send_from_directory(STATIC_FOLDER, 'index.html')
    return "<h1>Please run 'npm run build'</h1>"


@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(STATIC_FOLDER, path)):
        return send_from_directory(STATIC_FOLDER, path)
    return serve_index()


# --- VIDEO STREAMING ---
def gen_frames(cam_id):
    global engine
    while True:
        if engine and engine.is_alive():
            frame = engine.get_frame(cam_id)
            if frame:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            else:
                eventlet.sleep(0.01)
        else:
            eventlet.sleep(0.5)


@app.route('/video_feed_1')
def video_feed_1():
    return Response(gen_frames(1), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/video_feed_2')
def video_feed_2():
    return Response(gen_frames(2), mimetype='multipart/x-mixed-replace; boundary=frame')


# --- SOCKET EVENTS ---
def broadcast_data(data):
    socketio.emit('data_update', data)


@socketio.on('start_processing')
def handle_start(config):
    global engine
    if engine and engine.is_alive():
        engine.stop()
        engine.join()

    engine = ProcessingEngine(config, broadcast_data)
    engine.start()
    emit('status', {'msg': 'Started', 'running': True})


@socketio.on('stop_processing')
def handle_stop(data=None):
    global engine
    if engine:
        engine.stop()
    emit('status', {'msg': 'Stopped', 'running': False})


@socketio.on('shutdown_server')
def handle_server_shutdown():
    print("SHUTDOWN COMMAND RECEIVED")
    global engine
    if engine: engine.stop()
    emit('status', {'msg': 'Server Shutting Down'})

    def force_exit():
        eventlet.sleep(1)
        os._exit(0)

    eventlet.spawn(force_exit)


@socketio.on('update_logging')
def handle_logging(data):
    global engine
    if engine: engine.update_logging(data.get('logging', False))


if __name__ == '__main__':
    PORT = 5001
    URL = f"http://127.0.0.1:{PORT}"

    print(f"--- BioVision Server ---")
    print(f"Serving at: {URL}")


    def open_browser():
        eventlet.sleep(1.5)
        webbrowser.open(URL)


    eventlet.spawn(open_browser)

    try:
        socketio.run(app, host='0.0.0.0', port=PORT, debug=False)
    except OSError:
        print(f"Error: Port {PORT} is busy.")