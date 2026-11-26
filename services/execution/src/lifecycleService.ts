import type { IContainerLifecycleManager } from './types.js';
import { DockerEngineLifecycleManager } from './dockerManager.js';
import { RuntimeUnavailableError } from './runtime.js';

export class LifecycleService {
  private static instance: IContainerLifecycleManager | null = null;

  public static async getManager(): Promise<IContainerLifecycleManager> {
    if (this.instance) {
      return this.instance;
    }

    const dockerManager = new DockerEngineLifecycleManager();
    const isDockerRunning = await dockerManager.isAvailable();

    if (!isDockerRunning) {
      throw new RuntimeUnavailableError('Docker Engine is unavailable; no execution manager was started');
    }

    this.instance = dockerManager;

    // Attach process cleanup hooks for graceful shutdown
    const cleanup = async () => {
      if (this.instance) {
        await this.instance.cleanupAll();
      }
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    return this.instance;
  }
}
