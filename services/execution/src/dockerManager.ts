import http from 'node:http';
import type {
  IContainerLifecycleManager,
  EphemeralContainerConfig,
  ContainerInstance,
  ContainerResourceLimits,
} from './types.js';
import {
  RUNTIME_DOCKER_IMAGES,
  DEFAULT_ISOLATION_LIMITS,
  getDockerHostConfig,
} from './dockerDefaults.js';

export class DockerEngineLifecycleManager implements IContainerLifecycleManager {
  private socketPath: string;
  private activeContainers = new Map<string, ContainerInstance>();

  constructor(socketPath: string = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock') {
    this.socketPath = socketPath;
  }

  private async request(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          socketPath: this.socketPath,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          },
        },
        (res) => {
          let chunks = '';
          res.on('data', (d) => (chunks += d));
          res.on('end', () => {
            let data: any = chunks;
            try {
              if (chunks) data = JSON.parse(chunks);
            } catch {
              // Leave as raw text if not JSON
            }
            resolve({ status: res.statusCode || 500, data });
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Docker Engine API request timed out'));
      });

      if (payload) req.write(payload);
      req.end();
    });
  }

  public async isAvailable(): Promise<boolean> {
    try {
      const res = await this.request('GET', '/_ping');
      return res.status === 200;
    } catch {
      return false;
    }
  }

  public async createContainer(config: EphemeralContainerConfig): Promise<ContainerInstance> {
    const limits: ContainerResourceLimits = {
      ...DEFAULT_ISOLATION_LIMITS,
      ...(config.limits || {}),
    };

    const image = config.dockerImage || RUNTIME_DOCKER_IMAGES[config.runtime];
    const hostConfig = getDockerHostConfig(limits);

    const createPayload = {
      Image: image,
      Cmd: config.command || ['sleep', '300'],
      User: limits.user,
      WorkingDir: '/workspace',
      HostConfig: hostConfig,
      Labels: {
        'cloud-ide.workspace': config.workspaceId,
        'cloud-ide.runtime': config.runtime,
        'cloud-ide.ephemeral': 'true',
      },
    };

    const res = await this.request('POST', '/containers/create', createPayload);
    if (res.status !== 201) {
      throw new Error(`Failed to create container via Docker Engine: ${JSON.stringify(res.data)}`);
    }

    const dockerId = res.data.Id;
    const internalId = `cnt_${Date.now()}_${dockerId.substring(0, 8)}`;

    const instance: ContainerInstance = {
      id: internalId,
      workspaceId: config.workspaceId,
      runtime: config.runtime,
      state: 'created',
      dockerContainerId: dockerId,
      limits,
      createdAt: new Date(),
    };

    this.activeContainers.set(internalId, instance);
    return instance;
  }

  public async startContainer(containerId: string): Promise<ContainerInstance> {
    const instance = this.activeContainers.get(containerId);
    if (!instance || !instance.dockerContainerId) {
      throw new Error(`Container with ID ${containerId} not found`);
    }

    const res = await this.request('POST', `/containers/${instance.dockerContainerId}/start`);
    if (res.status !== 204 && res.status !== 304) {
      throw new Error(`Failed to start container: ${JSON.stringify(res.data)}`);
    }

    instance.state = 'running';
    instance.startedAt = new Date();
    return instance;
  }

  public async stopContainer(containerId: string): Promise<ContainerInstance> {
    const instance = this.activeContainers.get(containerId);
    if (!instance || !instance.dockerContainerId) {
      throw new Error(`Container with ID ${containerId} not found`);
    }

    await this.request('POST', `/containers/${instance.dockerContainerId}/stop?t=2`);
    instance.state = 'stopped';
    instance.stoppedAt = new Date();
    return instance;
  }

  public async removeContainer(containerId: string): Promise<boolean> {
    const instance = this.activeContainers.get(containerId);
    if (!instance || !instance.dockerContainerId) {
      return false;
    }

    await this.request('DELETE', `/containers/${instance.dockerContainerId}?v=true&force=true`);
    this.activeContainers.delete(containerId);
    return true;
  }

  public async getContainer(containerId: string): Promise<ContainerInstance | null> {
    return this.activeContainers.get(containerId) || null;
  }

  public async listActiveContainers(): Promise<ContainerInstance[]> {
    return Array.from(this.activeContainers.values());
  }

  public async cleanupAll(): Promise<number> {
    let count = 0;
    for (const id of Array.from(this.activeContainers.keys())) {
      try {
        await this.removeContainer(id);
        count++;
      } catch {
        // Continue cleaning up others
      }
    }
    return count;
  }
}
