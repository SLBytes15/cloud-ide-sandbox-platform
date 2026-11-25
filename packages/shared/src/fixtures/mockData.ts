import type { UserSummary } from '../types/user.js';
import type { WorkspaceSummary, CreateWorkspaceDTO } from '../types/workspace.js';
import type { FileNode, FileTreeItem } from '../types/file.js';
import type { ExecutionJob, ExecutionRequest } from '../types/execution.js';
import type { ApiResponse, HealthCheckResponse } from '../types/api.js';
import type {
  BaseSocketMessage,
  TerminalInputPayload,
  TerminalOutputPayload,
  TerminalResizePayload,
  ExecutionStartPayload,
  ExecutionChunkPayload,
  ExecutionDonePayload,
} from '../events/websocket.js';

export const mockUser: UserSummary = {
  id: 'usr_01h9x34zk9q01',
  username: 'zaalima_dev',
  email: 'developer@zaalima.internal',
  avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
  createdAt: '2026-11-20T10:00:00.000Z',
};

export const mockWorkspaceSummaries: WorkspaceSummary[] = [
  {
    id: 'ws_01h9x40aa1234',
    name: 'Node Microservice Workspace',
    description: 'Sample Express & TypeScript environment',
    ownerId: 'usr_01h9x34zk9q01',
    runtime: 'node',
    isPublic: false,
    createdAt: '2026-11-21T08:30:00.000Z',
    updatedAt: '2026-11-23T14:15:00.000Z',
  },
  {
    id: 'ws_01h9x40bb5678',
    name: 'Python Data Workspace',
    description: 'Python script execution environment',
    ownerId: 'usr_01h9x34zk9q01',
    runtime: 'python',
    isPublic: false,
    createdAt: '2026-11-22T09:00:00.000Z',
    updatedAt: '2026-11-23T12:00:00.000Z',
  },
];

export const mockCreateWorkspacePayload: CreateWorkspaceDTO = {
  name: 'New Node Environment',
  description: 'Clean Node.js v20 ephemeral workspace',
  runtime: 'node',
  isPublic: false,
};

export const mockFileNodes: FileNode[] = [
  {
    id: 'file_001_root',
    workspaceId: 'ws_01h9x40aa1234',
    name: 'src',
    path: '/src',
    type: 'directory',
    parentId: null,
    size: 0,
    createdAt: '2026-11-21T08:30:00.000Z',
    updatedAt: '2026-11-21T08:30:00.000Z',
  },
  {
    id: 'file_002_index',
    workspaceId: 'ws_01h9x40aa1234',
    name: 'index.js',
    path: '/src/index.js',
    type: 'file',
    parentId: 'file_001_root',
    size: 64,
    content: "console.log('Hello from Zaalima Cloud IDE!');\n",
    createdAt: '2026-11-21T08:31:00.000Z',
    updatedAt: '2026-11-21T08:31:00.000Z',
  },
  {
    id: 'file_003_readme',
    workspaceId: 'ws_01h9x40aa1234',
    name: 'README.md',
    path: '/README.md',
    type: 'file',
    parentId: null,
    size: 42,
    content: '# Sample Project\nRun `node src/index.js`\n',
    createdAt: '2026-11-21T08:32:00.000Z',
    updatedAt: '2026-11-21T08:32:00.000Z',
  },
];

export const mockFileTree: FileTreeItem[] = [
  {
    id: 'file_001_root',
    name: 'src',
    path: '/src',
    type: 'directory',
    children: [
      {
        id: 'file_002_index',
        name: 'index.js',
        path: '/src/index.js',
        type: 'file',
      },
    ],
  },
  {
    id: 'file_003_readme',
    name: 'README.md',
    path: '/README.md',
    type: 'file',
  },
];

export const mockExecutionRequest: ExecutionRequest = {
  workspaceId: 'ws_01h9x40aa1234',
  entryFile: '/src/index.js',
  command: 'node src/index.js',
};

export const mockExecutionJob: ExecutionJob = {
  id: 'job_01h9x88zz9900',
  workspaceId: 'ws_01h9x40aa1234',
  command: 'node src/index.js',
  status: 'completed',
  exitCode: 0,
  output: 'Hello from Zaalima Cloud IDE!\n',
  durationMs: 312,
  createdAt: '2026-11-23T15:00:00.000Z',
  completedAt: '2026-11-23T15:00:00.312Z',
};

export const mockHealthResponse: HealthCheckResponse = {
  status: 'healthy',
  uptime: 120.5,
  timestamp: '2026-11-23T15:00:00.000Z',
  service: 'cloud-ide-api',
  version: '0.1.0',
  environment: 'development',
  database: {
    status: 'connected',
    name: 'cloud_ide',
  },
};

export const mockApiResponseSuccess: ApiResponse<WorkspaceSummary> = {
  success: true,
  message: 'Workspace created successfully',
  data: mockWorkspaceSummaries[0],
  timestamp: '2026-11-23T15:00:00.000Z',
};

export const mockApiResponseError: ApiResponse<null> = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid workspace parameters',
    details: [{ field: 'name', message: 'Workspace name must not be empty' }],
  },
  timestamp: '2026-11-23T15:00:00.000Z',
};

export const mockTerminalInputMessage: BaseSocketMessage<TerminalInputPayload> = {
  event: 'terminal:input',
  payload: {
    workspaceId: 'ws_01h9x40aa1234',
    data: 'ls -la\r',
  },
  timestamp: '2026-11-23T15:00:01.000Z',
};

export const mockTerminalOutputMessage: BaseSocketMessage<TerminalOutputPayload> = {
  event: 'terminal:output',
  payload: {
    workspaceId: 'ws_01h9x40aa1234',
    data: 'total 8\r\ndrwxr-xr-x 2 user user 4096 Nov 23 15:00 src\r\n',
  },
  timestamp: '2026-11-23T15:00:01.050Z',
};

export const mockTerminalResizeMessage: BaseSocketMessage<TerminalResizePayload> = {
  event: 'terminal:resize',
  payload: {
    workspaceId: 'ws_01h9x40aa1234',
    cols: 120,
    rows: 32,
  },
  timestamp: '2026-11-23T15:00:00.500Z',
};

export const mockExecutionStartMessage: BaseSocketMessage<ExecutionStartPayload> = {
  event: 'execution:start',
  payload: {
    jobId: 'job_01h9x88zz9900',
    workspaceId: 'ws_01h9x40aa1234',
    command: 'node src/index.js',
  },
  timestamp: '2026-11-23T15:00:02.000Z',
};

export const mockExecutionChunkMessage: BaseSocketMessage<ExecutionChunkPayload> = {
  event: 'execution:chunk',
  payload: {
    jobId: 'job_01h9x88zz9900',
    stream: 'stdout',
    data: 'Hello from Zaalima Cloud IDE!\n',
  },
  timestamp: '2026-11-23T15:00:02.150Z',
};

export const mockExecutionDoneMessage: BaseSocketMessage<ExecutionDonePayload> = {
  event: 'execution:done',
  payload: {
    jobId: 'job_01h9x88zz9900',
    exitCode: 0,
    durationMs: 312,
  },
  timestamp: '2026-11-23T15:00:02.312Z',
};
