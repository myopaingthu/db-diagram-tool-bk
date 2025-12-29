import { Schema } from "mongoose";

const SettingSchema = new Schema(
  {
    modelJson: {
      type: String,
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

export const DiagramSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
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
    dbmlText: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["editing", "idle", "saving"],
      default: "idle",
    },
    validationErrors: [
      {
        table: String,
        column: String,
        message: String,
        code: String,
      },
    ],
    setting: {
      type: SettingSchema,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

DiagramSchema.index({ userId: 1, deletedAt: 1 });

