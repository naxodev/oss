import { vi } from 'vitest';

// Global setup for all tests

// Mock the entire child_process module to provide both named exports and a default export
const childProcessMock = {
  execSync: vi.fn().mockReturnValue(Buffer.from('')),
  spawn: vi.fn(() => ({
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    kill: vi.fn(),
  })),
  // Add any other methods you need
};

// Apply the mock
vi.mock('child_process', () => {
  return {
    ...childProcessMock,
    default: childProcessMock,
  };
});