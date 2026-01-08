import rateLimit from "express-rate-limit";

export const globalFaucetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  message: {
    error: "Too many requests from this network. Please wait 24 hours.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
