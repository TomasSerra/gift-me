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
  const { username } = req.query;
  const userAgent = req.headers["user-agent"];
  const baseUrl = getBaseUrl(req);

  // For non-crawlers, serve a minimal HTML that immediately redirects
  if (!isCrawler(userAgent)) {
    res.setHeader("Content-Type", "text/html");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${baseUrl}/u/${username}?_og=1">
  <script>window.location.replace("${baseUrl}/u/${username}?_og=1");</script>
</head>
<body></body>
</html>`);
  }

  try {
    // Fetch user data from Firestore REST API (query by username)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const queryResponse = await fetch(firestoreUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "username" },
              op: "EQUAL",
              value: { stringValue: username },
            },
          },
          limit: 1,
        },
      }),
    });

    if (!queryResponse.ok) {
      res.setHeader("Content-Type", "text/html");
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GiftMe</title>
  <meta property="og:title" content="GiftMe - Wishlist">
  <meta property="og:description" content="Check out this wishlist on GiftMe!">
  <meta property="og:image" content="${baseUrl}/logo.png">
</head>
<body></body>
</html>`);
    }

    const queryData = await queryResponse.json();
    const userDoc = queryData[0]?.document;

    if (!userDoc) {
      res.setHeader("Content-Type", "text/html");
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GiftMe</title>
  <meta property="og:title" content="GiftMe - Wishlist">
  <meta property="og:description" content="Check out this wishlist on GiftMe!">
  <meta property="og:image" content="${baseUrl}/logo.png">
</head>
<body></body>
</html>`);
    }

    const fields = userDoc.fields;
    const firstName = fields?.firstName?.stringValue || "";
    const lastName = fields?.lastName?.stringValue || "";
    const displayName = escapeHtml(
      firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : fields?.username?.stringValue || String(username)
    );
    const photoURL = fields?.photoURL?.stringValue || `${baseUrl}/logo.png`;

    const title = `${displayName}'s Wishlist`;
    const description = `Check out ${displayName}'s wishlist on GiftMe!`;
    const url = `${baseUrl}/u/${username}`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} | GiftMe</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${photoURL}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="GiftMe">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${photoURL}">
</head>
<body></body>
</html>`);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.setHeader("Content-Type", "text/html");
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GiftMe</title>
  <meta property="og:title" content="GiftMe - Wishlist">
  <meta property="og:description" content="Check out this wishlist on GiftMe!">
  <meta property="og:image" content="${baseUrl}/logo.png">
</head>
<body></body>
</html>`);
  }
}
