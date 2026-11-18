export type WorkspaceRuntime = 'node' | 'python' | 'cpp' | 'go' | 'rust';

export interface WorkspaceSummary {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  runtime: WorkspaceRuntime;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceDTO {
  name: string;
  description?: string;
  runtime: WorkspaceRuntime;
  isPublic?: boolean;
}
