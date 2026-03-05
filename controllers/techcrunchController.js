const axios = require("axios");
const cheerio = require("cheerio");
const { getHeaders } = require("../config/helpers");
const logger = require("../Utils/logger");

async function scrapeTechCrunchLatest(page) {
  const url =
    page > 1
      ? `https://techcrunch.com/latest/page/${page}/`
      : "https://techcrunch.com/latest/";

  try {
    const response = await axios.get(url, {
      headers: getHeaders("https://techcrunch.com/"),
    });
    const $ = cheerio.load(response.data);
    const articles = [];

    $("li.wp-block-post").each((index, element) => {
      const el = $(element);
      const titleElement = el.find("a.loop-card__title-link");
      const title = titleElement.text().trim();
      const link = titleElement.attr("href");
      const author =
        el.find("a.loop-card__author").text().trim() || "TechCrunch Staff";
      const date =
        el.find("time.loop-card__time").text().trim() || "Unknown Date";
      const category =
        el.find(".loop-card__cat").first().text().trim() || "News";
      const imageUrl = el.find("img.wp-post-image").attr("src") || null;

      if (title && link) {
        const articlePath = link.replace("https://techcrunch.com/", "");
        articles.push({
          title,
          author,
          date,
          category,
          imageUrl,
          url: link,
          path: articlePath,
        });
      }
    });

    const hasNextPage = $("a.wp-block-query-pagination-next").length > 0;
    return { articles, hasNextPage, sourceUrl: url };
  } catch (error) {
    logger.error(
      `TechCrunch Latest Error: ${error.response ? error.response.status : error.message}`,
    );
    throw new Error(`Failed to scrape TechCrunch for page ${page}`);
  }
}

async function scrapeTechCrunchArticle(articleUrl) {
  try {
    const response = await axios.get(articleUrl, {
      headers: getHeaders("https://techcrunch.com/"),
    });
    const $ = cheerio.load(response.data);

    const title =
      $("h1.wp-block-post-title").first().text().trim() || "No Title Found";
    const author =
      $(".post-authors-list__author").first().text().trim() ||
      "TechCrunch Staff";
    const date =
      $(".wp-block-post-date time").first().text().trim() || "Unknown Date";
    const category =
      $(".wp-block-tenup-post-primary-term").first().text().trim() || "News";
    const imageUrl = $(".wp-block-post-featured-image img").attr("src") || null;

    const contentContainer = $(".entry-content");
    contentContainer.find(".ad-unit, .wp-block-tc-ads-ad-slot").remove();

    const contentTextArray = [];
    contentContainer.children("p, h2, h3, ul, ol").each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2) {
        contentTextArray.push(text);
      }
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
      `TechCrunch Article Error: ${error.response ? error.response.status : error.message}`,
    );
    throw new Error("Failed to scrape the TechCrunch article content.");
  }
}

exports.getLatest = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  try {
    const data = await scrapeTechCrunchLatest(page);
    res.status(200).json({
      success: true,
      source: "techcrunch.com",
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
  const articleUrl = `https://techcrunch.com/${cleanPath}`;

  try {
    const articleData = await scrapeTechCrunchArticle(articleUrl);
    res.status(200).json({ success: true, data: articleData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
