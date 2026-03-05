const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_CAMERA_MONITOR_URL = 'http://localhost:8001';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE_URL,
  cameraMonitorUrl: import.meta.env.VITE_CAMERA_MONITOR_URL ?? DEFAULT_CAMERA_MONITOR_URL,
};
