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

// Apply the mock for child_process
vi.mock('child_process', () => {
  return {
    ...childProcessMock,
    default: childProcessMock,
  };
});

// Apply the mock for node:child_process as well
vi.mock('node:child_process', () => {
  return {
    ...childProcessMock,
    default: childProcessMock,
  };
});

// Mock fs and node:fs with default functionality
const fsMock = {
  readFileSync: vi.fn().mockReturnValue(''),
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
};

vi.mock('fs', () => {
  return {
    ...fsMock,
    default: fsMock,
  };
});

vi.mock('node:fs', () => {
  return {
    ...fsMock,
    default: fsMock,
  };
});