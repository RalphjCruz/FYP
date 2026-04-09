import type { Response } from 'express';
import { TaskServiceError } from '../../../../src/services/taskService.js';
import { handleTaskControllerError } from '../../../../src/controllers/mappers/taskControllerErrorMapper.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

describe('TC-TCEM-001 handleTaskControllerError', () => {
  it('returns 400 for TASK_TITLE_REQUIRED', () => {
    const res = createMockResponse();
    const error = new TaskServiceError('TASK_TITLE_REQUIRED', 'Task title is required');

    handleTaskControllerError(res, error, 'Fallback message', 'Task create error:');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Task title is required',
    });
  });
});

describe('TC-TCEM-002 handleTaskControllerError', () => {
  it('returns 400 for TASK_TITLE_EMPTY', () => {
    const res = createMockResponse();
    const error = new TaskServiceError('TASK_TITLE_EMPTY', 'Task title cannot be empty');

    handleTaskControllerError(res, error, 'Fallback message', 'Task update error:');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Task title cannot be empty',
    });
  });
});

describe('TC-TCEM-003 handleTaskControllerError', () => {
  it('returns 404 for TASK_NOT_FOUND', () => {
    const res = createMockResponse();
    const error = new TaskServiceError('TASK_NOT_FOUND', 'Task not found');

    handleTaskControllerError(res, error, 'Fallback message', 'Task fetch error:');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Task not found',
    });
  });
});

describe('TC-TCEM-004 handleTaskControllerError', () => {
  it('returns 409 for TASK_ALREADY_COMPLETED', () => {
    const res = createMockResponse();
    const error = new TaskServiceError('TASK_ALREADY_COMPLETED', 'Task already completed');

    handleTaskControllerError(res, error, 'Fallback message', 'Task complete error:');

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Task already completed',
    });
  });
});

describe('TC-TCEM-005 handleTaskControllerError', () => {
  it('returns 500 for unrecognized TaskServiceError code', () => {
    const res = createMockResponse();
    const error = new TaskServiceError('TASK_TITLE_REQUIRED', 'Unexpected task error');
    (error as any).code = 'TASK_UNKNOWN_CODE';

    handleTaskControllerError(res, error, 'Fallback message', 'Task unknown error:');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unexpected task error',
    });
  });
});

describe('TC-TCEM-006 handleTaskControllerError', () => {
  it('logs non-TaskServiceError values and uses Error.message or fallback message', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const resForError = createMockResponse();
    handleTaskControllerError(resForError, new Error('Database timeout'), 'Fallback message', 'Task list error:');
    expect(resForError.status).toHaveBeenCalledWith(500);
    expect(resForError.json).toHaveBeenCalledWith({
      success: false,
      message: 'Database timeout',
    });

    const resForUnknown = createMockResponse();
    handleTaskControllerError(resForUnknown, { reason: 'unknown' }, 'Fallback message', 'Task list error:');
    expect(resForUnknown.status).toHaveBeenCalledWith(500);
    expect(resForUnknown.json).toHaveBeenCalledWith({
      success: false,
      message: 'Fallback message',
    });

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('Task list error:', expect.anything());
  });
});
