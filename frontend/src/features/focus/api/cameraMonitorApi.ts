import { env } from '../../../shared/config/env';
import type { CameraDetectionResult } from '../types';

type CameraAnalyzePayload = {
  success: boolean;
  data?: CameraDetectionResult;
  message?: string;
};

export const analyzeCameraFrame = async (imageDataUrl: string): Promise<CameraDetectionResult> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(`${env.cameraMonitorUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        imageDataUrl,
      }),
    });

    const payload = (await response.json()) as CameraAnalyzePayload;

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || 'Camera monitor request failed');
    }

    return payload.data;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
