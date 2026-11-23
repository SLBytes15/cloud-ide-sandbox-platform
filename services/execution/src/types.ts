import type { WorkspaceRuntime } from '@cloud-ide/shared';

export type ContainerState = 'created' | 'running' | 'stopped' | 'terminated' | 'error';

export interface ContainerResourceLimits {
  memoryBytes: number; // e.g. 512MB = 536870912
  memorySwapBytes: number; // e.g. 512MB (no swap)
  nanoCpus: number; // e.g. 1.0 vCPU = 1_000_000_000
  pidsLimit: number; // e.g. 64
  readOnlyRootfs: boolean;
  networkMode: 'none' | 'bridge';
  user: string; // e.g. '1000:1000'
  timeoutSeconds: number; // e.g. 15 for batch, 1800 for terminal
}

export interface EphemeralContainerConfig {
  workspaceId: string;
  runtime: WorkspaceRuntime;
  dockerImage?: string;
  command?: string[];
  limits?: Partial<ContainerResourceLimits>;
  customEnv?: Record<string, string>;
}

export interface ContainerInstance {
  id: string;
  workspaceId: string;
  runtime: WorkspaceRuntime;
  state: ContainerState;
  dockerContainerId?: string;
  limits: ContainerResourceLimits;
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
}

export interface IContainerLifecycleManager {
  isAvailable(): Promise<boolean>;
  createContainer(config: EphemeralContainerConfig): Promise<ContainerInstance>;
  startContainer(containerId: string): Promise<ContainerInstance>;
  stopContainer(containerId: string): Promise<ContainerInstance>;
  removeContainer(containerId: string): Promise<boolean>;
  getContainer(containerId: string): Promise<ContainerInstance | null>;
  listActiveContainers(): Promise<ContainerInstance[]>;
  cleanupAll(): Promise<number>;
}
