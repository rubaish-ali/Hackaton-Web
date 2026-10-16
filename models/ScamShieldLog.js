
import mongoose from "mongoose";

const scamShieldLogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      maxlength: 12000,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    analysis: {
      riskLevel: {
        type: String,
        enum: ["Low", "Medium", "High"],
      },
      summary: String,
      warningSigns: [String],
      verificationSteps: [String],
      disclaimer: String,
    },
    errorCategory: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ScamShieldLog ||
  mongoose.model("ScamShieldLog", scamShieldLogSchema);
