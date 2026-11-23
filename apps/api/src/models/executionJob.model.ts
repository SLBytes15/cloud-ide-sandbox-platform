import { Schema, model, Document, Types } from 'mongoose';
import type { ExecutionStatus } from '@cloud-ide/shared';

export interface IExecutionJobDocument extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId | string;
  triggeredBy: Types.ObjectId | string;
  command: string;
  status: ExecutionStatus;
  exitCode?: number | null;
  output?: string;
  error?: string;
  durationMs?: number;
  createdAt: Date;
  completedAt?: Date;
}

const executionJobSchema = new Schema<IExecutionJobDocument>(
  {
    workspaceId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    triggeredBy: {
      type: Schema.Types.Mixed,
      required: true,
    },
    command: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'timeout'],
      default: 'pending',
      required: true,
    },
    exitCode: {
      type: Number,
      default: null,
    },
    output: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: '',
    },
    durationMs: {
      type: Number,
      default: null,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

executionJobSchema.index({ workspaceId: 1, createdAt: -1 });

export const ExecutionJobModel = model<IExecutionJobDocument>('ExecutionJob', executionJobSchema);
