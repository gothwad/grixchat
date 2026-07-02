import express from "express";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";
import os from "os";
import { GoogleAuth } from "google-auth-library";
import { GoogleGenAI } from "@google/genai";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));



// Configure Multer for temporary storage in the OS temp directory
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "GrixChat Server is running" });
});

// LiveKit Token generation endpoint
app.post("/api/livekit-token", async (req, res) => {
  try {
    const { roomName, participantIdentity } = req.body;
    if (!roomName || !participantIdentity) {
      return res.status(400).json({ error: "Missing roomName or participantIdentity parameters" });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.warn("FCM Server: LIVEKIT_API_KEY or LIVEKIT_API_SECRET is missing. Proceeding with standard sandbox mock tokens.");
      return res.json({
        success: false,
        error: "LiveKit server credentials are not configured. Please define LIVEKIT_API_KEY and LIVEKIT_API_SECRET in settings.",
        token: "mock-livekit-token-sandbox"
      });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return res.json({ success: true, token });
  } catch (error: any) {
    console.error("LiveKit token generation exception:", error);
    return res.status(500).json({ error: error.message || "Failed to generate LiveKit token" });
  }
});

// Sitemap route for SEO
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://grixchat.gothwad.workers.dev/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>https://grixchat.gothwad.workers.dev/tools</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://grixchat.gothwad.workers.dev/chats</loc><priority>0.9</priority><changefreq>always</changefreq></url>
  <url><loc>https://grixchat.gothwad.workers.dev/reels</loc><priority>0.8</priority><changefreq>always</changefreq></url>
</urlset>`);
});

// Digital Asset Links for Android PWA/TWA verification
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const assetlinksPath = fs.existsSync(path.resolve(process.cwd(), "dist/.well-known/assetlinks.json"))
    ? path.resolve(process.cwd(), "dist/.well-known/assetlinks.json")
    : path.resolve(process.cwd(), "public/.well-known/assetlinks.json");

  if (fs.existsSync(assetlinksPath)) {
    res.sendFile(assetlinksPath);
  } else {
    // Graceful fallback with standard placeholders matching the public file
    res.json([
      {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
          "namespace": "android_app",
          "package_name": "com.gothwad.grixchat",
          "sha256_cert_fingerprints": [
            "F1:A1:DA:3C:A9:74:9C:13:B9:92:EF:CD:AA:E1:92:BB:D4:57:3E:04:9E:FC:D7:E5:A9:DF:11:80:FF:E3:A3:AA"
          ]
        }
      }
    ]);
  }
});

// Helper to remove invalid/expired FCM tokens from the user profile database
async function removeInvalidFcmToken(badTokenStr: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.warn("FCM Server Cleanup: Unable to initialize Supabase client for FCM token cleanup (missing credentials).");
    return;
  }
  
  try {
    const supabaseServer = createClient(supabaseUrl, supabaseKey);
    
    // Find all users who have this token in their fcm_tokens array and remove it
    const { data: users, error: fetchErr } = await supabaseServer
      .from("users")
      .select("id, fcm_tokens");
      
    if (fetchErr || !users) {
      console.warn("FCM Server Cleanup: Failed to fetch users for token pruning:", fetchErr);
      return;
    }

    for (const u of users) {
      if (Array.isArray(u.fcm_tokens) && u.fcm_tokens.includes(badTokenStr)) {
        const filtered = u.fcm_tokens.filter((t: string) => t !== badTokenStr);
        console.log(`FCM Server Cleanup: Removing stale/invalid FCM token from user ${u.id}`);
        const { error: updateErr } = await supabaseServer
          .from("users")
          .update({ fcm_tokens: filtered })
          .eq("id", u.id);
          
        if (updateErr) {
          console.warn(`FCM Server Cleanup: Failed to update user ${u.id} FCM tokens:`, updateErr);
        }
      }
    }
  } catch (err: any) {
    console.warn("FCM Server Cleanup: Exception in removeInvalidFcmToken:", err.message);
  }
}

// Send Notification Proxy using Firebase Cloud Messaging HTTP v1 API
app.post("/api/send-notification", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: "Missing request body" });
    }
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: "Missing recipient registration tokens" });
    }

    // Ensure all tokens are valid non-empty strings
    const validTokens = tokens.filter(t => typeof t === 'string' && t.trim().length > 0);
    if (validTokens.length === 0) {
      return res.status(400).json({ error: "No valid recipient registration tokens provided" });
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.warn("FCM Server: FIREBASE_SERVICE_ACCOUNT variable not set. Simulating push notification dispatch in terminal logs.");
      console.log(`[PUSH NOTIFICATION SIMULATION]`);
      console.log(`Title: ${title}`);
      console.log(`Body: ${body}`);
      console.log(`Tokens:`, validTokens);
      return res.json({ 
        success: true, 
        simulated: true, 
        message: "Push simulate successful. Configure FIREBASE_SERVICE_ACCOUNT in env to enable active Google FCM sending." 
      });
    }

    let credentials: any;
    try {
      credentials = JSON.parse(serviceAccountJson);
      if (typeof credentials === 'string') {
        credentials = JSON.parse(credentials);
      }
    } catch (parseErr: any) {
      console.error("FCM Server: Failed to parse FIREBASE_SERVICE_ACCOUNT env value:", parseErr);
      return res.status(500).json({ error: `FIREBASE_SERVICE_ACCOUNT JSON parse failure: ${parseErr.message}` });
    }

    const projectId = credentials?.project_id;
    if (!projectId) {
      throw new Error("project_id missing from FIREBASE_SERVICE_ACCOUNT credentials");
    }

    // Automatically heal literal '\n' sequences in the private key if stored as an escaped string
    if (credentials.private_key && typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    // Authenticate with Google APIs scope for Firebase Cloud Messaging
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const accessTokenObj = await client.getAccessToken();
    const accessToken = accessTokenObj.token;
    if (!accessToken) {
      throw new Error("Failed to retrieve Google Access Token for FCM scope");
    }

    console.log(`FCM Server: Dispatching push alerts to ${validTokens.length} registration tokens.`);
    const results = await Promise.all(
      validTokens.map(async (token) => {
        try {
          const payload = {
            message: {
              token,
              notification: { title, body },
              data: {
                click_action: data?.click_action || '/chats',
                conversationId: data?.conversationId || '',
                senderId: data?.senderId || '',
                ...(data || {})
              }
            }
          };

          const response = await axios.post(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            payload,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          return { token, success: true, messageId: response.data?.name };
        } catch (err: any) {
          const safeTokenStr = (typeof token === 'string') ? token.substring(0, 10) : String(token);
          console.error(`FCM Server: Failed to send to token: ${safeTokenStr}... Error:`, err.response?.data || err.message);
          
          const isInvalidToken = 
            err.response?.status === 400 || 
            err.response?.status === 404 ||
            (err.response?.data?.error?.status === 'INVALID_ARGUMENT') ||
            (err.response?.data?.error?.status === 'NOT_FOUND') ||
            (err.response?.data?.error?.status === 'UNREGISTERED') ||
            (err.response?.data?.error?.message && (
              err.response.data.error.message.includes('not a valid FCM registration token') ||
              err.response.data.error.message.includes('Requested entity was not found')
            ));

          if (isInvalidToken) {
            removeInvalidFcmToken(token).catch(e => {
              console.error("FCM Token Cleanup trigger failed:", e);
            });
          }

          return { token, success: false, error: err.response?.data || err.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: true,
      total: validTokens.length,
      sentCount: successCount,
      results
    });
  } catch (error: any) {
    console.error("FCM Send Notification failed:", error);
    res.status(500).json({ error: error.message || "Failed to process push dispatch" });
  }
});



// File Upload Proxy (Catbox for images/videos, Gofile.io for others)
app.post("/api/upload-file", (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ status: 'error', message: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ status: 'error', message: `Unknown upload error: ${err.message}` });
    }
    next();
  });
}, async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  }

  const isMedia = req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/');

  try {
    if (isMedia) {
      // Upload to Catbox.moe
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      console.log('Uploading media to Catbox.moe...');
      const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        timeout: 60000,
      });

      if (response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.json({ 
          status: 'ok', 
          downloadUrl: response.data.trim(),
          provider: 'catbox'
        });
      }
      throw new Error(`Catbox error: ${response.data}`);
    } else {
      // Upload to Gofile.io
      // 1. Get best server
      console.log('Getting Gofile server...');
      const serverRes = await axios.get('https://api.gofile.io/getServer');
      const server = serverRes.data.data.server;

      // 2. Upload
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      console.log(`Uploading file to Gofile server: ${server}...`);
      const response = await axios.post(`https://${server}.gofile.io/contents/uploadfile`, form, {
        headers: form.getHeaders(),
        timeout: 120000, // Gofile can be slow for large files
      });

      if (response.data && response.data.status === 'ok') {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.json({ 
          status: 'ok', 
          downloadUrl: response.data.data.downloadPage, // Note: Direct link might require premium for Gofile, so we give download page
          fileId: response.data.data.fileId,
          provider: 'gofile'
        });
      }
      throw new Error(`Gofile error: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error('Upload failed:', error.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ status: 'error', message: `Upload failed: ${error.message}` });
  }
});



// Vite / Static handling
if (process.env.NODE_ENV !== "production") {
  // Dynamic import for development
  import("vite").then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
    });
  });
} else {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath, { dotfiles: "allow" }));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Start server
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
