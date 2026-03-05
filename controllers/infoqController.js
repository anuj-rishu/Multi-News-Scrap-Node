const axios = require("axios");
const cheerio = require("cheerio");
const { superClean } = require("../config/helpers");
const logger = require("../Utils/logger");

async function scrapeInfoQNews(page = "") {
  const url = page
    ? `https://www.infoq.com/news/${page}/`
    : `https://www.infoq.com/news/`;
  const headers = { "user-agent": "Mozilla/5.0" };

  try {
    const { data } = await axios.get(url, { headers });
    const $ = cheerio.load(data);
    const newsItems = [];

    $(".cards > li[data-id]").each((index, element) => {
      const $el = $(element);
      const titleAnchor = $el.find(".card__title a");
      const title = superClean(titleAnchor.text());

      if (title) {
        newsItems.push({
          id: $el.attr("data-id"),
          title,
          link: "https://www.infoq.com" + titleAnchor.attr("href"),
          excerpt: superClean($el.find(".card__excerpt").text()),
          topic: superClean(
            $el.find(".card__topics a").first().text() ||
              $el.find(".topics a").first().text(),
          ),
          author: superClean(
            $el.find(".card__authors a").first().text() ||
              $el.find(".authors a").first().text(),
          ),
          date: superClean(
            $el.find(".card__date span").text() || $el.find(".date").text(),
          ),
          internalPath: $el.attr("data-path") || "",
        });
      }
    });
    return newsItems;
  } catch (error) {
    logger.error(
      `InfoQ List Error: ${error.response ? error.response.status : error.message}`,
    );
    throw new Error(`Failed to scrape InfoQ news: ${error.message}`);
  }
}

async function scrapeInfoQArticle(path) {
  let cleanPath = path.trim();
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  if (!cleanPath.endsWith("/")) cleanPath += "/";

  const url = `https://www.infoq.com${cleanPath}`;
  const headers = { "user-agent": "Mozilla/5.0" };

  try {
    const { data } = await axios.get(url, { headers });
    const $ = cheerio.load(data);

    const title = superClean($(".article__heading .heading").text());
    const imageUrl = $('meta[property="og:image"]').attr("content") || "";

    const contentClone = $(".article__data").clone();
    contentClone
      .find("script, style, .author-section-full, .widget, .notice")
      .remove();

    const paragraphs = [];
    $(".article__data > p, .article__data > blockquote p").each((i, el) => {
      const pText = superClean($(el).text());
      if (pText) paragraphs.push(pText);
    });

    return {
      title,
      imageUrl,
      fullDescription: superClean(contentClone.text()),
      paragraphs,
      sourceUrl: url,
    };
  } catch (error) {
    logger.error(
      `InfoQ Article Error: ${error.response ? error.response.status : error.message}`,
    );
    throw new Error(`Failed to scrape InfoQ article: ${error.message}`);
  }
}

exports.getNews = async (req, res) => {
  const page = req.query.page || "";
  try {
    const data = await scrapeInfoQNews(page);
    res.json({
      success: true,
      source: "infoq.com",
      query_page: page || "0",
      count: data.length,
      data: data,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getArticle = async (req, res) => {
  const articlePath = req.query.path;
  if (!articlePath) {
    return res.status(400).json({
      success: false,
      message:
        "Missing 'path' parameter. Example: /api/infoq/article?path=/news/2026/03/example",
    });
  }

  try {
    const details = await scrapeInfoQArticle(articlePath);
    res.json({
      success: true,
      source: "infoq.com",
      query_path: articlePath,
      data: details,
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};
