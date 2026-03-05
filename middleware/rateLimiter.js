const rateLimit = require("express-rate-limit");
const logger = require("../Utils/logger");

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  handler: (req, res, next, options) => {
    logger.error(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter };
