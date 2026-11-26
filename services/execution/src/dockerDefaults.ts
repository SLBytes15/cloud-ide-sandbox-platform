import type { WorkspaceRuntime } from '@cloud-ide/shared';
import type { ContainerResourceLimits } from './types.js';

export const RUNTIME_DOCKER_IMAGES: Record<WorkspaceRuntime, string> = {
  node: 'node:20-alpine',
  python: 'python:3.11-alpine',
  cpp: 'gcc:13-alpine',
  go: 'golang:1.22-alpine',
  rust: 'rust:1.77-alpine',
};

// Requested Docker settings from ADR-009; these values alone do not verify runtime enforcement.
export const DEFAULT_ISOLATION_LIMITS: ContainerResourceLimits = {
  memoryBytes: 512 * 1024 * 1024, // 512 MB
  memorySwapBytes: 512 * 1024 * 1024, // Requested swap cap equal to the memory cap
  nanoCpus: 1_000_000_000, // 1.0 vCPU
  pidsLimit: 64, // Requested process limit
  readOnlyRootfs: true, // Request a read-only root filesystem
  networkMode: 'none', // Request no Docker network
  user: '1000:1000', // Request a non-root UID/GID
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
