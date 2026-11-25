import { Schema, model, Document, Types } from 'mongoose';
import type { WorkspaceRuntime } from '@cloud-ide/shared';

export interface IEnvironmentTemplateDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  runtime: WorkspaceRuntime;
  dockerImage: string;
  entryCommand: string;
  defaultFiles: Array<{
    name: string;
    path: string;
    content: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const environmentTemplateSchema = new Schema<IEnvironmentTemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    runtime: {
      type: String,
      enum: ['node', 'python', 'cpp', 'go', 'rust'],
      required: true,
    },
    dockerImage: {
      type: String,
      required: true,
    },
    entryCommand: {
      type: String,
      required: true,
    },
    defaultFiles: [
      {
        name: { type: String, required: true },
        path: { type: String, required: true },
        content: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const EnvironmentTemplate = model<IEnvironmentTemplateDocument>(
  'EnvironmentTemplate',
  environmentTemplateSchema
);
