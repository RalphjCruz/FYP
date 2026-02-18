import { getSlimeStats } from '../controllers/slimeController.js';
import { getTasksByUser } from '../controllers/taskController.js';
import pool from '../config/database.js';

jest.mock('../config/database.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: jest.Mock;
  json: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    body: null,
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockImplementation((code: number) => {
    response.statusCode = code;
    return response;
  });

  response.json.mockImplementation((payload: unknown) => {
    response.body = payload;
    return response;
  });

  return response;
};

const mockPool = pool as unknown as {
  query: jest.Mock;
};

describe('authorization guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks user A from reading user B tasks', async () => {
    const req = {
      user: { id: 1, email: 'a@test.com', username: 'userA' },
      params: { userId: '2' },
    };
    const res = createMockResponse();

    await getTasksByUser(req as any, res as any);

    expect(res.statusCode).toBe(403);
    expect((res.body as any).message).toBe('Forbidden: user mismatch');
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('blocks user A from reading user B slime', async () => {
    const req = {
      user: { id: 1, email: 'a@test.com', username: 'userA' },
      params: { userId: '2' },
    };
    const res = createMockResponse();

    await getSlimeStats(req as any, res as any);

    expect(res.statusCode).toBe(403);
    expect((res.body as any).message).toBe('Forbidden: user mismatch');
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
