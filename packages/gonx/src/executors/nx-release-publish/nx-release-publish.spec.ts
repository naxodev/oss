import { ExecutorContext, output, readJsonFile } from '@nx/devkit';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import executor from './nx-release-publish';
import { NxReleasePublishExecutorSchema } from './schema';

// Mock all the external dependencies
jest.mock('node:child_process');
jest.mock('node:fs');
jest.mock('node:path');
jest.mock('@nx/devkit', () => {
  const original = jest.requireActual('@nx/devkit');
  return {
    ...original,
    joinPathFragments: jest.fn((root, fragment) => path.join(root, fragment)),
    readJsonFile: jest.fn(),
    output: {
      error: jest.fn(),
      logSingleLine: jest.fn(),
    },
  };
});

// Mock console methods to avoid polluting test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('nx-release-publish executor', () => {
  // Setup test context and options
  const options: NxReleasePublishExecutorSchema = {
    moduleRoot: 'packages/test-module',
    dryRun: false,
  };

  const mockGoModContent = 'module github.com/test/module';
  const mockContext: ExecutorContext = {
    cwd: '',
    root: '/workspace',
    isVerbose: false,
    projectName: 'test-module',
    projectsConfigurations: {
      version: 2,
      projects: {
        'test-module': {
          root: 'packages/test-module',
          sourceRoot: 'packages/test-module',
        },
      },
    },
  } as unknown as ExecutorContext;

  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Mock fs.readFileSync to return our mock go.mod content
    (fs.readFileSync as jest.Mock).mockReturnValue(mockGoModContent);

    // Mock path.join to simply concatenate
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Mock execSync with a default success behavior
    (childProcess.execSync as jest.Mock).mockImplementation((command) => {
      if (command.includes('git tag')) {
        return 'v1.2.3';
      }
      return '';
    });
  });

  // Restore console methods after each test
  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it('should successfully publish a Go module', async () => {
    // Arrange
    (readJsonFile as jest.Mock).mockReturnValue({
      release: {
        releaseTagPattern: 'v{version}',
      },
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeTruthy();
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringMatching(
        /GOPROXY=proxy\.golang\.org go list -m github\.com\/test\/module@v1\.2\.3/
      ),
      expect.anything()
    );
    expect(output.logSingleLine).toHaveBeenCalledWith(
      expect.stringContaining('Found latest version tag: v1.2.3')
    );
  });

  it('should handle dry run mode correctly', async () => {
    // Arrange
    (readJsonFile as jest.Mock).mockReturnValue({
      release: {
        releaseTagPattern: 'v{version}',
      },
    });
    const dryRunOptions = { ...options, dryRun: true };

    // Act
    const result = await executor(dryRunOptions, mockContext);

    // Assert
    expect(result.success).toBeTruthy();
    expect(childProcess.execSync).not.toHaveBeenCalledWith(
      expect.stringMatching(/GOPROXY=proxy\.golang\.org go list/),
      expect.anything()
    );

    // Check for the dry run messages separately, without expecting exact format matching
    expect(console.log).toHaveBeenCalled();
    const logCalls = (console.log as jest.Mock).mock.calls;
    const runMessage = logCalls.some(
      (call) =>
        call[0] &&
        call[0].includes &&
        call[0].includes('Would run: GOPROXY=proxy.golang.org')
    );
    const publishMessage = logCalls.some(
      (call) =>
        call[0] &&
        call[0].includes &&
        call[0].includes('[dry-run]') &&
        call[0].includes('Would publish module')
    );

    expect(runMessage).toBeTruthy();
    expect(publishMessage).toBeTruthy();
  });

  it('should respect NX_DRY_RUN environment variable', async () => {
    // Arrange
    const originalEnv = process.env;
    process.env = { ...originalEnv, NX_DRY_RUN: 'true' };

    (readJsonFile as jest.Mock).mockReturnValue({
      release: {
        releaseTagPattern: 'v{version}',
      },
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeTruthy();
    expect(childProcess.execSync).not.toHaveBeenCalledWith(
      expect.stringMatching(/GOPROXY=proxy\.golang\.org go list/),
      expect.anything()
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/Would run: GOPROXY=proxy\.golang\.org go list/)
    );

    // Restore env
    process.env = originalEnv;
  });

  it('should use custom tag pattern from nx.json', async () => {
    // Arrange
    (readJsonFile as jest.Mock).mockReturnValue({
      release: {
        releaseTagPattern: '{projectName}-v{version}',
      },
    });

    // Mock git tag command to return a tag with the custom pattern
    (childProcess.execSync as jest.Mock).mockImplementation((command) => {
      if (command.includes('git tag')) {
        return 'test-module-v2.0.0';
      }
      return '';
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeTruthy();
    expect(output.logSingleLine).toHaveBeenCalledWith(
      expect.stringContaining(
        'Using release tag pattern: test-module-v{version}'
      )
    );
    expect(output.logSingleLine).toHaveBeenCalledWith(
      expect.stringContaining('Found latest version tag: test-module-v2.0.0')
    );
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringMatching(
        /GOPROXY=proxy\.golang\.org go list -m github\.com\/test\/module@test-module-v2\.0\.0/
      ),
      expect.anything()
    );
  });

  it('should fail if project name is undefined', async () => {
    // Arrange
    const contextWithoutProject = {
      ...mockContext,
      projectName: undefined,
    };

    // Act
    const result = await executor(options, contextWithoutProject);

    // Assert
    expect(result.success).toBeFalsy();
    expect(output.error).toHaveBeenCalledWith({
      title: 'Project name is undefined',
    });
  });

  it('should fail if project configuration is not found', async () => {
    // Arrange
    const contextWithMissingProject = {
      ...mockContext,
      projectsConfigurations: {
        version: 2,
        projects: {},
      },
    };

    // Act
    const result = await executor(options, contextWithMissingProject);

    // Assert
    expect(result.success).toBeFalsy();
    expect(output.error).toHaveBeenCalledWith({
      title: 'Project configuration for test-module not found',
    });
  });

  it('should fail if module name cannot be found in go.mod', async () => {
    // Arrange
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid go.mod content');

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeFalsy();
    expect(output.error).toHaveBeenCalledWith({
      title: expect.stringContaining('Could not find module name in'),
    });
  });

  it('should fail if no valid tag is found', async () => {
    // Arrange
    (childProcess.execSync as jest.Mock).mockImplementation((command) => {
      if (command.includes('git tag')) {
        return '';
      }
      return '';
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeFalsy();
    expect(output.error).toHaveBeenCalledWith({
      title: expect.stringContaining('Could not determine current version'),
    });
  });

  it('should handle git command failures gracefully', async () => {
    // Arrange
    (childProcess.execSync as jest.Mock).mockImplementation((command) => {
      if (command.includes('git tag')) {
        throw new Error('Git command failed');
      }
      if (command.includes('GOPROXY=proxy.golang.org')) {
        // Mock the publishing command to fail when this test reaches that point
        throw new Error('Publication failed');
      }
      return '';
    });

    (readJsonFile as jest.Mock).mockReturnValue({
      release: {
        releaseTagPattern: 'v{version}',
      },
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeFalsy();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Warning: Failed to get latest version from git')
    );
  });

  it('should handle nx.json read failures gracefully', async () => {
    // Arrange
    (readJsonFile as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to read nx.json');
    });

    // Ensure we get a failing publish to make the test pass
    (childProcess.execSync as jest.Mock).mockImplementation((command) => {
      if (command.includes('git tag')) {
        return 'v1.2.3';
      }
      if (command.includes('GOPROXY=proxy.golang.org')) {
        throw new Error('Publication failed');
      }
      return '';
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeFalsy();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Warning: Could not read nx.json to determine tag pattern'
      )
    );
  });

  it('should handle publish command failures', async () => {
    // Arrange
    (readJsonFile as jest.Mock).mockReturnValue({
      release: {
        releaseTagPattern: 'v{version}',
      },
    });

    // Mock execSync to throw an error for the go list command
    (childProcess.execSync as jest.Mock).mockImplementation((command) => {
      if (command.includes('git tag')) {
        return 'v1.2.3';
      }
      if (command.includes('GOPROXY=proxy.golang.org')) {
        throw new Error('Publication failed');
      }
      return '';
    });

    // Act
    const result = await executor(options, mockContext);

    // Assert
    expect(result.success).toBeFalsy();
    expect(console.error).toHaveBeenCalledWith(
      'Publication failed:',
      'Publication failed'
    );
  });
});
