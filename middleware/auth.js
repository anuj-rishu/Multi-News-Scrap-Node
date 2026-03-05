const logger = require("../Utils/logger");

function verifyToken(req, res, next) {
  const sessionToken = req.headers["token"];

  if (!sessionToken) {
    logger.error("Missing session token in headers");
    return res.status(401).json({
      error:
        "Authentication required. Header 'token' containing sessionCookies is required.",
    });
  }

  req.sessionToken = sessionToken;

  next();
}

module.exports = { verifyToken };
