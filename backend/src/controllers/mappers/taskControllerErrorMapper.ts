import type { Response } from 'express';
import { TaskServiceError } from '../../services/taskService.js';

const mapTaskServiceErrorStatus = (error: TaskServiceError): number => {
  switch (error.code) {
    case 'TASK_TITLE_REQUIRED':
    case 'TASK_TITLE_EMPTY':
      return 400;
    case 'TASK_NOT_FOUND':
      return 404;
    case 'TASK_ALREADY_COMPLETED':
      return 409;
    default:
      return 500;
  }
};

export const handleTaskControllerError = (
  res: Response,
  error: unknown,
  fallbackMessage: string,
  logLabel: string,
) => {
  if (error instanceof TaskServiceError) {
    return res.status(mapTaskServiceErrorStatus(error)).json({
      success: false,
      message: error.message,
    });
  }

  console.error(logLabel, error);
  return res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : fallbackMessage,
  });
};
