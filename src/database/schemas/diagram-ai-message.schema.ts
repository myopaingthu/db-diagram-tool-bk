import { Schema } from "mongoose";

export const DiagramAiMessageSchema = new Schema(
  {
    diagramId: {
      type: Schema.Types.ObjectId,
      ref: "Diagram",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    generatedDbml: {
      type: String,
      default: null,
    },
    validDbml: {
      type: Boolean,
      default: null,
    },
    parseErrors: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DiagramAiMessageSchema.index({ diagramId: 1, userId: 1, createdAt: -1 });
DiagramAiMessageSchema.index({ requestId: 1 });
