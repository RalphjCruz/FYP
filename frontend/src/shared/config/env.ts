const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_CAMERA_MONITOR_URL = 'http://localhost:8001';

const isLocalDevHost = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const parseBooleanEnv = (value: unknown, fallback: boolean) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return fallback;
};

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE_URL,
  cameraMonitorUrl: import.meta.env.VITE_CAMERA_MONITOR_URL ?? DEFAULT_CAMERA_MONITOR_URL,
  enableDevPanel: parseBooleanEnv(import.meta.env.VITE_ENABLE_DEV_PANEL, isLocalDevHost()),
};
