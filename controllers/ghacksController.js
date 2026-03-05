const axios = require("axios");
const cheerio = require("cheerio");
const { getHeaders } = require("../config/helpers");
const logger = require("../Utils/logger");

async function scrapeGhacksNews(page = 1) {
  const url =
    page > 1
      ? `https://www.ghacks.net/latest-posts/page/${page}/`
      : "https://www.ghacks.net/";

  try {
    const response = await axios.get(url, { headers: getHeaders(url) });
    const $ = cheerio.load(response.data);
    const articlesMap = new Map();

    $("article").each((index, element) => {
      const el = $(element);
      const titleElement = el.find("h3 a");
      const title = titleElement.text().trim();
      const link = titleElement.attr("href");
      const date = el.find("time").text().trim() || "Unknown";
      const excerpt =
        el.find("p").not(".home-intro-post-meta").first().text().trim() ||
        "No summary available.";
      const imageUrl = el.find("img.wp-post-image").attr("src") || null;

      if (title && link && !articlesMap.has(link)) {
        const articlePath = link.replace("https://www.ghacks.net/", "");
        articlesMap.set(link, {
          title,
          date,
          excerpt,
          imageUrl,
          url: link,
          path: articlePath,
        });
      }
    });

    const hasNextPage = $(".next.page-numbers").length > 0;

    return {
      articles: Array.from(articlesMap.values()),
      hasNextPage,
      sourceUrl: url,
    };
  } catch (error) {
    logger.error(
      `Ghacks List Page ${page} Error: ${error.response ? error.response.status : error.message}`,
    );
    throw new Error(`Failed to scrape Ghacks page ${page}`);
  }
}

async function scrapeGhacksArticle(articleUrl) {
  try {
    const response = await axios.get(articleUrl, {
      headers: getHeaders("https://www.ghacks.net/"),
    });
    const $ = cheerio.load(response.data);

    const title = $("h1").first().text().trim() || "No Title Found";
    const author =
      $(".post-subtitle-meta_left_author").text().trim() || "Unknown Author";
    const date = $("time").first().text().trim() || "Unknown Date";
    const category =
      $(".post-subtitle-meta_right_categories").text().trim() ||
      "Uncategorized";
    const imageUrl =
      $(".featured-image img").attr("src") ||
      $("article img").first().attr("src") ||
      null;

    let contentContainer = $(".user-content");
    if (contentContainer.length === 0) contentContainer = $(".entry-content");
    contentContainer.find(".google-preferred-source-badge").remove();

    const contentTextArray = [];
    contentContainer.children("p, h2, h3, ul, ol").each((i, el) => {
      const text = $(el).text().trim();
      if (text) contentTextArray.push(text);
    });

    return {
      title,
      author,
      date,
      category,
      imageUrl,
      paragraphs: contentTextArray,
      sourceUrl: articleUrl,
    };
  } catch (error) {
    logger.error(
      `Ghacks Article Error: ${error.response ? error.response.status : error.message}`,
    );
    throw new Error("Failed to scrape the Ghacks article content.");
  }
}

exports.getNews = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  try {
    const data = await scrapeGhacksNews(page);
    res.status(200).json({
      success: true,
      source: "ghacks.net",
      metadata: {
        currentPage: page,
        resultsCount: data.articles.length,
        hasNextPage: data.hasNextPage,
        sourceUrl: data.sourceUrl,
      },
      data: data.articles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getArticle = async (req, res) => {
  const articlePath = req.query.path;
  if (!articlePath)
    return res
      .status(400)
      .json({ success: false, message: "Missing 'path' parameter." });

  const cleanPath = articlePath.replace(/^\/+/, "");
  const articleUrl = `https://www.ghacks.net/${cleanPath}`;

  try {
    const articleData = await scrapeGhacksArticle(articleUrl);
    res.status(200).json({ success: true, data: articleData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
