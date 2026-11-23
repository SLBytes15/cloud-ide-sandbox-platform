import { Request, Response, NextFunction } from 'express';
import { FileModel } from '../models/file.model.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';
import type { FileNode, FileTreeItem } from '@cloud-ide/shared';

// In-memory fallback cache for files
const inMemoryFiles = new Map<string, FileNode[]>();

export function buildFileTree(files: Array<{ id: string; name: string; path: string; type: 'file' | 'directory'; parentId?: string | null }>): FileTreeItem[] {
  const itemMap = new Map<string, FileTreeItem>();
  const rootItems: FileTreeItem[] = [];

  // Create nodes
  for (const f of files) {
    itemMap.set(f.id, {
      id: f.id,
      name: f.name,
      path: f.path,
      type: f.type,
      ...(f.type === 'directory' ? { children: [] } : {}),
    });
  }

  // Nest children
  for (const f of files) {
    const current = itemMap.get(f.id)!;
    if (f.parentId && itemMap.has(f.parentId)) {
      const parent = itemMap.get(f.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(current);
    } else {
      rootItems.push(current);
    }
  }

  return rootItems;
}

export async function getWorkspaceFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!workspaceId) {
      throw new BadRequestError('Workspace ID is required');
    }

    if (!isDatabaseConnected()) {
      const files = inMemoryFiles.get(workspaceId) || [];
      const tree = buildFileTree(files);
      return sendSuccess(res, { files, tree }, 'Workspace files retrieved from fallback store');
    }

    const docs = await FileModel.find({ workspaceId }).sort({ path: 1 }).lean();
    const files: FileNode[] = docs.map((doc: any) => ({
      id: doc._id.toString(),
      workspaceId: doc.workspaceId.toString(),
      name: doc.name,
      path: doc.path,
      type: doc.type,
      parentId: doc.parentId ? doc.parentId.toString() : null,
      size: doc.size,
      content: doc.content,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    const tree = buildFileTree(files);
    return sendSuccess(res, { files, tree }, 'Workspace files retrieved successfully');
  } catch (err) {
    return next(err);
  }
}

export async function createFile(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, path, type = 'file', parentId = null, content = '' } = req.body;

    if (!workspaceId) throw new BadRequestError('Workspace ID is required');
    if (!name || typeof name !== 'string') throw new BadRequestError('File name is required');
    if (!path || typeof path !== 'string') throw new BadRequestError('File path is required');

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const cleanContent = typeof content === 'string' ? content : '';
    const size = Buffer.byteLength(cleanContent, 'utf8');

    if (!isDatabaseConnected()) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newFile: FileNode = {
        id: fileId,
        workspaceId,
        name: name.trim(),
        path: cleanPath,
        type: type === 'directory' ? 'directory' : 'file',
        parentId: parentId || null,
        size,
        content: cleanContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existing = inMemoryFiles.get(workspaceId) || [];
      existing.push(newFile);
      inMemoryFiles.set(workspaceId, existing);
      return sendSuccess(res, newFile, 'File created in fallback store', 201);
    }

    // Check duplicate path in workspace
    const existing = await FileModel.findOne({ workspaceId, path: cleanPath });
    if (existing) {
      throw new ConflictError(`File or directory at path "${cleanPath}" already exists`);
    }

    const doc = await FileModel.create({
      workspaceId,
      name: name.trim(),
      path: cleanPath,
      type: type === 'directory' ? 'directory' : 'file',
      parentId: parentId || null,
      size,
      content: cleanContent,
    });

    const fileNode: FileNode = {
      id: doc._id.toString(),
      workspaceId: doc.workspaceId.toString(),
      name: doc.name,
      path: doc.path,
      type: doc.type,
      parentId: doc.parentId ? doc.parentId.toString() : null,
      size: doc.size,
      content: doc.content,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };

    return sendSuccess(res, fileNode, 'File created successfully', 201);
  } catch (err) {
    return next(err);
  }
}

export async function getFileById(req: Request, res: Response, next: NextFunction) {
  try {
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
    if (!fileId) throw new BadRequestError('File ID is required');

    if (!isDatabaseConnected()) {
      for (const list of inMemoryFiles.values()) {
        const found = list.find((f) => f.id === fileId);
        if (found) return sendSuccess(res, found);
      }
      throw new NotFoundError(`File with ID ${fileId} not found`);
    }

    const doc = await FileModel.findById(fileId).lean();
    if (!doc) {
      throw new NotFoundError(`File with ID ${fileId} not found`);
    }

    const fileNode: FileNode = {
      id: (doc as any)._id.toString(),
      workspaceId: (doc as any).workspaceId.toString(),
      name: (doc as any).name,
      path: (doc as any).path,
      type: (doc as any).type,
      parentId: (doc as any).parentId ? (doc as any).parentId.toString() : null,
      size: (doc as any).size,
      content: (doc as any).content,
      createdAt: (doc as any).createdAt.toISOString(),
      updatedAt: (doc as any).updatedAt.toISOString(),
    };

    return sendSuccess(res, fileNode);
  } catch (err) {
    return next(err);
  }
}

export async function updateFileContent(req: Request, res: Response, next: NextFunction) {
  try {
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
    const { content } = req.body;

    if (!fileId) throw new BadRequestError('File ID is required');
    if (typeof content !== 'string') throw new BadRequestError('Content must be a string');

    const size = Buffer.byteLength(content, 'utf8');

    if (!isDatabaseConnected()) {
      for (const list of inMemoryFiles.values()) {
        const found = list.find((f) => f.id === fileId);
        if (found) {
          found.content = content;
          found.size = size;
          found.updatedAt = new Date().toISOString();
          return sendSuccess(res, found, 'File updated in fallback store');
        }
      }
      throw new NotFoundError(`File with ID ${fileId} not found`);
    }

    const updated = await FileModel.findByIdAndUpdate(
      fileId,
      { content, size },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new NotFoundError(`File with ID ${fileId} not found`);
    }

    const fileNode: FileNode = {
      id: updated._id.toString(),
      workspaceId: updated.workspaceId.toString(),
      name: updated.name,
      path: updated.path,
      type: updated.type,
      parentId: updated.parentId ? updated.parentId.toString() : null,
      size: updated.size,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return sendSuccess(res, fileNode, 'File updated successfully');
  } catch (err) {
    return next(err);
  }
}

export async function deleteFile(req: Request, res: Response, next: NextFunction) {
  try {
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
    if (!fileId) throw new BadRequestError('File ID is required');

    if (!isDatabaseConnected()) {
      for (const [wsId, list] of inMemoryFiles.entries()) {
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx !== -1) {
          list.splice(idx, 1);
          inMemoryFiles.set(wsId, list);
          return sendSuccess(res, { deleted: true, fileId });
        }
      }
      throw new NotFoundError(`File with ID ${fileId} not found`);
    }

    const target = await FileModel.findById(fileId);
    if (!target) {
      throw new NotFoundError(`File with ID ${fileId} not found`);
    }

    // If directory, delete all descendants whose path starts with directory path
    if (target.type === 'directory') {
      await FileModel.deleteMany({
        workspaceId: target.workspaceId,
        path: new RegExp(`^${target.path}/`),
      });
    }

    await FileModel.findByIdAndDelete(fileId);
    return sendSuccess(res, { deleted: true, id: fileId }, 'File deleted successfully');
  } catch (err) {
    return next(err);
  }
}
