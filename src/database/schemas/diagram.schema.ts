import { Schema } from "mongoose";

const SettingSchema = new Schema(
  {
    modelJson: {
      type: String,
      required: true,
    },
    ast: {
      type: Schema.Types.Mixed,
      default: null,
    },
    layout: {
      type: Schema.Types.Mixed,
      default: {
        nodes: [],
        edges: [],
      },
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
      enum: ["editing", "idle", "saving", "parsing", "error"],
      default: "idle",
    },
    validationErrors: [
      {
        line: Number,
        column: Number,
        message: String,
        type: {
          type: String,
          enum: ["syntax", "semantic", "validation"],
        },
        code: String,
        table: String,
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

