const axios = require("axios");
const { superClean } = require("../config/helpers");
const logger = require("../Utils/logger");

const SUPABASE_URL = "https://zdpdvwhvukelzzbzbjvh.supabase.co/rest/v1";
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcGR2d2h2dWtlbHp6YnpianZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTQ4NjQsImV4cCI6MjA4MTc3MDg2NH0.5cOa06MPxA-MzuCL-rZf-7nW5xZiXvL36nc2DZ9e4zk";

const HEADERS = {
  apikey: API_KEY,
  authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function scrapePopularPosts() {
  const url = `${SUPABASE_URL}/posts?select=id,title,excerpt,image_url,read_time,created_at,published_at,slug,view_count,categories(name),authors!posts_author_id_fkey(name)&published=eq.true&order=view_count.desc&limit=20`;

  try {
    const response = await axios.get(url, { headers: HEADERS });
    const posts = response.data;

    return posts.map((post) => ({
      title: post.title,
      excerpt: post.excerpt,
      imageUrl: post.image_url,
      date: post.published_at,
      author: post.authors ? post.authors.name : "Unknown Author",
      category: post.categories ? post.categories.name : "Uncategorized",
      views: post.view_count,
      url: `https://analyticsindiamag.com/${post.slug}`,
      path: post.slug,
    }));
  } catch (error) {
    logger.error(`AIM Popular Posts Error: ${error.message}`);
    throw new Error("Failed to fetch popular posts from AIM.");
  }
}

async function scrapeArticleContent(slug) {
  const cleanSlug = slug.replace(/^\/+/, "").replace(/\/+$/, "");
  const url = `${SUPABASE_URL}/posts?select=title,excerpt,content,image_url,published_at,categories(name),authors!posts_author_id_fkey(name)&slug=eq.${cleanSlug}&limit=1`;

  try {
    const response = await axios.get(url, { headers: HEADERS });
    if (!response.data || response.data.length === 0) {
      throw new Error("Article not found.");
    }

    const post = response.data[0];

    let paragraphs = [];
    if (post.content) {
      const cheerio = require("cheerio");
      const $ = cheerio.load(post.content);
      $("p, h2, h3").each((i, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });
    }

    return {
      title: post.title,
      author: post.authors ? post.authors.name : "Unknown Author",
      date: post.published_at,
      category: post.categories ? post.categories.name : "Uncategorized",
      imageUrl: post.image_url,
      excerpt: post.excerpt,
      paragraphs: paragraphs,
      sourceUrl: `https://analyticsindiamag.com/${cleanSlug}`,
    };
  } catch (error) {
    logger.error(`AIM Article Content Error: ${error.message}`);
    throw new Error(`Failed to fetch AIM article: ${error.message}`);
  }
}

exports.getPopular = async (req, res) => {
  try {
    const data = await scrapePopularPosts();
    res.status(200).json({
      success: true,
      source: "analyticsindiamag.com",
      metadata: {
        resultsCount: data.length,
        sourceUrl: "https://analyticsindiamag.com/popular",
      },
      data: data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getArticle = async (req, res) => {
  const articlePath = req.query.path;
  if (!articlePath) {
    return res
      .status(400)
      .json({ success: false, message: "Missing 'path' parameter." });
  }

  try {
    const articleData = await scrapeArticleContent(articlePath);
    res.status(200).json({ success: true, data: articleData });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
