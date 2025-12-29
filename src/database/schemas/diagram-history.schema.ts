import { Schema } from "mongoose";

const SettingSchema = new Schema(
  {
    ast: {
      type: Schema.Types.Mixed,
      required: true,
    },
    layout: {
      type: Schema.Types.Mixed,
      default: {},
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

export const DiagramHistorySchema = new Schema(
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
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    setting: {
      type: SettingSchema,
      required: true,
    },
    remark: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400,
    },
  }
);

DiagramHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

