import { Schema, model, Document, Types } from 'mongoose';
import type { WorkspaceRuntime } from '@cloud-ide/shared';

export interface IWorkspaceDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  ownerId: Types.ObjectId | string;
  runtime: WorkspaceRuntime;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspaceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ownerId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    runtime: {
      type: String,
      enum: ['node', 'python', 'cpp', 'go', 'rust'],
      default: 'node',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

workspaceSchema.index({ ownerId: 1, createdAt: -1 });

export const Workspace = model<IWorkspaceDocument>('Workspace', workspaceSchema);
