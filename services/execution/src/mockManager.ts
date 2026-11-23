import type {
  IContainerLifecycleManager,
  EphemeralContainerConfig,
  ContainerInstance,
  ContainerResourceLimits,
} from './types.js';
import { DEFAULT_ISOLATION_LIMITS } from './dockerDefaults.js';

export class MockContainerLifecycleManager implements IContainerLifecycleManager {
  private containers = new Map<string, ContainerInstance>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  public async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  public async createContainer(config: EphemeralContainerConfig): Promise<ContainerInstance> {
    const limits: ContainerResourceLimits = {
      ...DEFAULT_ISOLATION_LIMITS,
      ...(config.limits || {}),
    };

    const id = `mock_cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const instance: ContainerInstance = {
      id,
      workspaceId: config.workspaceId,
      runtime: config.runtime,
      state: 'created',
      dockerContainerId: `sha256_${Math.random().toString(16).substring(2, 18)}`,
      limits,
      createdAt: new Date(),
    };

    this.containers.set(id, instance);
    return instance;
  }

  public async startContainer(containerId: string): Promise<ContainerInstance> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    instance.state = 'running';
    instance.startedAt = new Date();

    // Enforce automatic timeout cleanup
    if (instance.limits.timeoutSeconds > 0) {
      const timeout = setTimeout(() => {
        instance.state = 'terminated';
        instance.stoppedAt = new Date();
      }, instance.limits.timeoutSeconds * 1000);

      // Prevent timer from holding Node event loop in tests
      if (typeof timeout.unref === 'function') {
        timeout.unref();
      }
      this.timeouts.set(containerId, timeout);
    }

    return instance;
  }

  public async stopContainer(containerId: string): Promise<ContainerInstance> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    const timer = this.timeouts.get(containerId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(containerId);
    }

    instance.state = 'stopped';
    instance.stoppedAt = new Date();
    return instance;
  }

  public async removeContainer(containerId: string): Promise<boolean> {
    const timer = this.timeouts.get(containerId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(containerId);
    }

    return this.containers.delete(containerId);
  }

  public async getContainer(containerId: string): Promise<ContainerInstance | null> {
    return this.containers.get(containerId) || null;
  }

  public async listActiveContainers(): Promise<ContainerInstance[]> {
    return Array.from(this.containers.values());
  }

  public async cleanupAll(): Promise<number> {
    const count = this.containers.size;
    for (const timer of this.timeouts.values()) {
      clearTimeout(timer);
    }
    this.timeouts.clear();
    this.containers.clear();
    return count;
  }
}
