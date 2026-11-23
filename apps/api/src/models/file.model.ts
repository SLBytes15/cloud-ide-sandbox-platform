import { Schema, model, Document, Types } from 'mongoose';
import type { FileNodeType } from '@cloud-ide/shared';

export interface IFileDocument extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId | string;
  name: string;
  path: string;
  type: FileNodeType;
  parentId?: Types.ObjectId | string | null;
  size: number;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFileDocument>(
  {
    workspaceId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['file', 'directory'],
      required: true,
      default: 'file',
    },
    parentId: {
      type: Schema.Types.Mixed,
      default: null,
      index: true,
    },
    size: {
      type: Number,
      default: 0,
      min: 0,
    },
    content: {
      type: String,
      default: '',
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

// Compound indexes for high-speed file tree querying and path lookups
fileSchema.index({ workspaceId: 1, path: 1 }, { unique: true });
fileSchema.index({ workspaceId: 1, parentId: 1 });

export const FileModel = model<IFileDocument>('File', fileSchema);
