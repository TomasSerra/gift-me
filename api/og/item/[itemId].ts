import type { VercelRequest, VercelResponse } from "@vercel/node";

// Social media crawler User-Agents
const CRAWLER_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "WhatsApp",
  "LinkedInBot",
  "Pinterest",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
];

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS.some((crawler) =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
}

function getBaseUrl(req: VercelRequest): string {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { itemId } = req.query;
  const userAgent = req.headers["user-agent"];
  const baseUrl = getBaseUrl(req);

  // For non-crawlers, serve a minimal HTML that immediately redirects
  // This avoids redirect loops while still serving the SPA
  if (!isCrawler(userAgent)) {
    res.setHeader("Content-Type", "text/html");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${baseUrl}/item/${itemId}?_og=1">
  <script>window.location.replace("${baseUrl}/item/${itemId}?_og=1");</script>
</head>
<body></body>
</html>`);
  }

  try {
    // Fetch item data from Firestore REST API
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/wishlistItems/${itemId}`;

    const itemResponse = await fetch(firestoreUrl);

    if (!itemResponse.ok) {
      res.setHeader("Content-Type", "text/html");
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GiftMe</title>
  <meta property="og:title" content="GiftMe - Wishlist Item">
  <meta property="og:description" content="Check out this item on GiftMe!">
  <meta property="og:image" content="${baseUrl}/logo.png">
</head>
<body></body>
</html>`);
    }

    const itemData = await itemResponse.json();
    const fields = itemData.fields;

    const name = escapeHtml(fields?.name?.stringValue || "Wishlist Item");
    const description = escapeHtml(
      fields?.description?.stringValue || "Check out this item on GiftMe!"
    );
    const images = fields?.images?.arrayValue?.values || [];
    const image = images[0]?.stringValue || `${baseUrl}/logo.png`;
    const price = fields?.price?.doubleValue || fields?.price?.integerValue;

    const title = price ? `${name} - $${price}` : name;
    const url = `${baseUrl}/item/${itemId}`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} | GiftMe</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="GiftMe">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body></body>
</html>`);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.setHeader("Content-Type", "text/html");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GiftMe</title>
  <meta property="og:title" content="GiftMe - Wishlist Item">
  <meta property="og:description" content="Check out this item on GiftMe!">
  <meta property="og:image" content="${baseUrl}/logo.png">
</head>
<body></body>
</html>`);
  }
}
