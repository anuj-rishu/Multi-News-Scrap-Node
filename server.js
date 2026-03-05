const express = require("express");
const cors = require("cors");
const ghacksRoutes = require("./routes/ghacksRoutes");
const techcrunchRoutes = require("./routes/techcrunchRoutes");
const infoqRoutes = require("./routes/infoqRoutes");
const aimRoutes = require("./routes/analyticsIndiaRoutes");
const { verifyToken } = require("./middleware/auth");
const { apiLimiter } = require("./middleware/rateLimiter");
const logger = require("./Utils/logger");

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "token", "Authorization"],
  }),
);
app.use(express.json());

app.use("/api", apiLimiter, verifyToken);

app.use("/api/ghacks", ghacksRoutes);
app.use("/api/tc", techcrunchRoutes);
app.use("/api/infoq", infoqRoutes);
app.use("/api/aim", aimRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Multi-Site News Scraper API",
    endpoints: {
      ghacks: ["/api/ghacks/news", "/api/ghacks/article?path=..."],
      techcrunch: ["/api/tc/news", "/api/tc/article?path=..."],
      infoq: ["/api/infoq/news", "/api/infoq/article?path=..."],
      analyticsIndia: ["/api/aim/popular", "/api/aim/article?path=..."],
    },
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Multi-Site News API is running on http://localhost:${PORT}`);
});
