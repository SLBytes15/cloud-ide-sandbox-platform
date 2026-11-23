import type { WorkspaceRuntime } from '@cloud-ide/shared';
import type { ContainerResourceLimits } from './types.js';

export const RUNTIME_DOCKER_IMAGES: Record<WorkspaceRuntime, string> = {
  node: 'node:20-alpine',
  python: 'python:3.11-alpine',
  cpp: 'gcc:13-alpine',
  go: 'golang:1.22-alpine',
  rust: 'rust:1.77-alpine',
};

// Strict isolation parameters enforcing ADR-009
export const DEFAULT_ISOLATION_LIMITS: ContainerResourceLimits = {
  memoryBytes: 512 * 1024 * 1024, // 512 MB
  memorySwapBytes: 512 * 1024 * 1024, // Swap equal to memory (disables swap allocation)
  nanoCpus: 1_000_000_000, // 1.0 vCPU
  pidsLimit: 64, // Hard limit to prevent fork bombs
  readOnlyRootfs: true, // Immutable base image prevents corruption
  networkMode: 'none', // Network isolation for untrusted batch code
  user: '1000:1000', // Strictly non-root unprivileged execution
  timeoutSeconds: 15, // Wall-clock timeout for batch runs
};

export function getDockerHostConfig(limits: ContainerResourceLimits) {
  return {
    Memory: limits.memoryBytes,
    MemorySwap: limits.memorySwapBytes,
    NanoCpus: limits.nanoCpus,
    PidsLimit: limits.pidsLimit,
    ReadonlyRootfs: limits.readOnlyRootfs,
    NetworkMode: limits.networkMode,
    CapDrop: ['ALL'],
    Tmpfs: {
      '/tmp': 'rw,noexec,nosuid,size=64m',
      '/workspace': 'rw,size=128m',
    },
    AutoRemove: false,
  };
}
