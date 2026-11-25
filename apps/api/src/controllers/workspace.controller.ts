import { Request, Response, NextFunction } from 'express';
import { Workspace } from '../models/workspace.model.js';
import { FileModel } from '../models/file.model.js';
import { deleteFallbackFilesByWorkspace } from './file.controller.js';
import { validateCreateWorkspaceDTO } from '../utils/workspaceValidation.js';
import { ValidationError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';
import type { WorkspaceSummary, WorkspaceRuntime } from '@cloud-ide/shared';

// In-memory fallback cache when running in degraded database mode (e.g. initial dev without local Mongo)
const inMemoryWorkspaces = new Map<string, WorkspaceSummary>();

function getDefaultTemplateFiles(workspaceId: string, runtime: WorkspaceRuntime) {
  switch (runtime) {
    case 'python':
      return [
        {
          workspaceId,
          name: 'main.py',
          path: '/main.py',
          type: 'file' as const,
          content: 'def main():\n    print("Hello from Python Cloud IDE!")\n\nif __name__ == "__main__":\n    main()\n',
          size: 88,
        },
        {
          workspaceId,
          name: 'README.md',
          path: '/README.md',
          type: 'file' as const,
          content: '# Python Workspace\nRun with `python main.py`\n',
          size: 44,
        },
      ];
    case 'cpp':
      return [
        {
          workspaceId,
          name: 'main.cpp',
          path: '/main.cpp',
          type: 'file' as const,
          content: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++ Cloud IDE!" << std::endl;\n    return 0;\n}\n',
          size: 108,
        },
      ];
    case 'node':
    default:
      return [
        {
          workspaceId,
          name: 'index.js',
          path: '/index.js',
          type: 'file' as const,
          content: 'console.log("Hello from Node.js Cloud IDE!");\n',
          size: 47,
        },
        {
          workspaceId,
          name: 'package.json',
          path: '/package.json',
          type: 'file' as const,
          content: '{\n  "name": "cloud-workspace",\n  "version": "1.0.0",\n  "main": "index.js"\n}\n',
          size: 74,
        },
      ];
  }
}

export async function listWorkspaces(_req: Request, res: Response, next: NextFunction) {
  try {
    if (!isDatabaseConnected()) {
      const list = Array.from(inMemoryWorkspaces.values());
      return sendSuccess(res, list, 'Workspaces retrieved from fallback store');
    }

    const docs = await Workspace.find().sort({ createdAt: -1 }).lean();
    const summaries: WorkspaceSummary[] = docs.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      ownerId: doc.ownerId.toString(),
      runtime: doc.runtime,
      isPublic: doc.isPublic,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    return sendSuccess(res, summaries, 'Workspaces retrieved successfully');
  } catch (err) {
    return next(err);
  }
}

export async function createWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = validateCreateWorkspaceDTO(req.body);
    if (!validation.valid) {
      throw new ValidationError('Invalid workspace payload', validation.errors);
    }

    const { name, description, runtime, isPublic } = validation.value;
    const ownerId = (req as any).user?.id || 'usr_default_developer';

    if (!isDatabaseConnected()) {
      const generatedId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fallbackDoc: WorkspaceSummary = {
        id: generatedId,
        name,
        description,
        ownerId,
        runtime,
        isPublic: isPublic ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryWorkspaces.set(generatedId, fallbackDoc);
      return sendSuccess(res, fallbackDoc, 'Workspace created in fallback store', 201);
    }

    const workspace = await Workspace.create({
      name,
      description,
      ownerId,
      runtime,
      isPublic: isPublic ?? false,
    });

    // Seed default template files for runtime
    const defaultFiles = getDefaultTemplateFiles(workspace._id.toString(), runtime);
    await FileModel.insertMany(defaultFiles);

    const summary: WorkspaceSummary = {
      id: workspace._id.toString(),
      name: workspace.name,
      description: workspace.description,
      ownerId: workspace.ownerId.toString(),
      runtime: workspace.runtime,
      isPublic: workspace.isPublic,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };

    return sendSuccess(res, summary, 'Workspace created successfully', 201);
  } catch (err) {
    return next(err);
  }
}

export async function getWorkspaceById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw new BadRequestError('Workspace ID is required');
    }

    if (!isDatabaseConnected()) {
      const found = inMemoryWorkspaces.get(id);
      if (!found) {
        throw new NotFoundError(`Workspace with ID ${id} not found`);
      }
      return sendSuccess(res, found);
    }

    const doc = await Workspace.findById(id).lean();
    if (!doc) {
      throw new NotFoundError(`Workspace with ID ${id} not found`);
    }

    const summary: WorkspaceSummary = {
      id: (doc as any)._id.toString(),
      name: (doc as any).name,
      description: (doc as any).description,
      ownerId: (doc as any).ownerId.toString(),
      runtime: (doc as any).runtime,
      isPublic: (doc as any).isPublic,
      createdAt: (doc as any).createdAt.toISOString(),
      updatedAt: (doc as any).updatedAt.toISOString(),
    };

    return sendSuccess(res, summary);
  } catch (err) {
    return next(err);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw new BadRequestError('Workspace ID is required');
    }

    if (!isDatabaseConnected()) {
      const existed = inMemoryWorkspaces.delete(id);
      if (!existed) {
        throw new NotFoundError(`Workspace with ID ${id} not found`);
      }
      deleteFallbackFilesByWorkspace(id);
      return sendSuccess(res, { deleted: true, id }, 'Workspace and associated files deleted from fallback store');
    }

    const deleted = await Workspace.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundError(`Workspace with ID ${id} not found`);
    }

    // Cascade delete associated workspace files
    await FileModel.deleteMany({ workspaceId: id });

    return sendSuccess(res, { deleted: true, id }, 'Workspace and associated files deleted successfully');
  } catch (err) {
    return next(err);
  }
}
