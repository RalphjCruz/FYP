import { useEffect, useMemo, useRef, useState } from 'react';
import { env } from '../../../shared/config/env';
import { analyzeCameraFrame } from '../api';
import type { CameraDetectionResult, CameraDetectionState } from '../types';

const ANALYSIS_INTERVAL_MS = 900;
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 360;

type UseFocusCameraMonitorOptions = {
  isRunning: boolean;
};

export const useFocusCameraMonitor = ({ isRunning }: UseFocusCameraMonitorOptions) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef(false);

  const [isEnabled, setIsEnabled] = useState(false);
  const [state, setState] = useState<CameraDetectionState>('inactive');
  const [lastResult, setLastResult] = useState<CameraDetectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopMonitoring = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const analyzeFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    if (isAnalyzingRef.current) {
      return;
    }

    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    canvasRef.current = canvas;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    isAnalyzingRef.current = true;
    setState('analyzing');

    try {
      context.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      const result = await analyzeCameraFrame(imageDataUrl);
      setLastResult(result);
      setState(result.state);
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera monitor failed';
      setErrorMessage(message);
      setState('error');
    } finally {
      isAnalyzingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isEnabled) {
      stopMonitoring();
      setState('inactive');
      return;
    }

    let cancelled = false;

    const startMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: FRAME_WIDTH },
            height: { ideal: FRAME_HEIGHT },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        await analyzeFrame();

        intervalRef.current = window.setInterval(() => {
          void analyzeFrame();
        }, ANALYSIS_INTERVAL_MS);
      } catch {
        setErrorMessage('Camera permission denied or not available.');
        setState('error');
      }
    };

    void startMonitoring();

    return () => {
      cancelled = true;
      stopMonitoring();
    };
  }, [isEnabled]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  useEffect(() => {
    if (!isEnabled || !mediaStreamRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.srcObject !== mediaStreamRef.current) {
      video.srcObject = mediaStreamRef.current;
    }

    void video.play().catch(() => {
      // Ignore transient play errors during quick view transitions.
    });
  });

  const monitorWarning = useMemo(() => {
    if (!isEnabled || !isRunning) {
      return null;
    }

    if (state === 'away') {
      return 'Camera monitor: you appear away from the screen.';
    }

    if (state === 'looking_down') {
      return 'Camera monitor: you appear to be looking down/off-screen.';
    }

    if (state === 'using_phone') {
      return 'Camera monitor: probable phone use detected.';
    }

    return null;
  }, [isEnabled, isRunning, state]);

  return {
    videoRef,
    isEnabled,
    setIsEnabled,
    state,
    lastResult,
    errorMessage,
    monitorWarning,
    monitorServiceUrl: env.cameraMonitorUrl,
  };
};
