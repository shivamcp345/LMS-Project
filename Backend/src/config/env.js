const dotenv = require("dotenv");
dotenv.config();

const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  clientUrl: process.env.CLIENT_URI || process.env.CLIENT_URL || "http://localhost:5173",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.8-flash",
};

module.exports = env;
