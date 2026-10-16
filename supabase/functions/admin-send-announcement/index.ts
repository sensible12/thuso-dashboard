import { createClient } from "npm:@supabase/supabase-js@2";

type AnnouncementPayload = {
  topic?: unknown;
  reportId?: unknown;
  photoUrl?: unknown;
  notification?: {
    title?: unknown;
    body?: unknown;
  };
  data?: {
    category?: unknown;
    sender_name?: unknown;
  };
};

const defaultTopic = "global-missing-person-alerts";
const fcmScope = "https://www.googleapis.com/auth/firebase.messaging";
const tokenUrl = "https://oauth2.googleapis.com/token";
const allowedOrigins = new Set([
  "https://sensible12.github.io",
  "http://localhost:5173",
]);
const categories = new Set([
  "safety_alert",
  "community_update",
  "person_found",
  "general",
]);

class InvalidAnnouncementError extends Error {}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  const headers = corsHeaders(origin);

  if (!allowedOrigins.has(origin)) {
    return json({ error: "Origin is not allowed." }, 403, headers);
  }
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, headers);
  }

  try {
    const user = await getModerator(request);
    if (user instanceof Response) return user;

    const payload = await request.json() as AnnouncementPayload;
    const title = requireText(payload.notification?.title, "title", 120);
    const body = requireText(payload.notification?.body, "message", 2000);
    const topic = payload.topic === undefined || payload.topic === null
      ? getOptionalEnv("GLOBAL_FCM_TOPIC") ?? defaultTopic
      : requireText(payload.topic, "topic", 900);
    if (!/^[a-zA-Z0-9\-_.~%]+$/.test(topic)) {
      throw new InvalidAnnouncementError("The notification topic contains unsupported characters.");
    }

    const requestedCategory = payload.data?.category;
    if (requestedCategory !== undefined &&
      (typeof requestedCategory !== "string" || !categories.has(requestedCategory))) {
      throw new InvalidAnnouncementError("The announcement category is not supported.");
    }
    const category = requestedCategory ?? "general";
    const senderName = typeof payload.data?.sender_name === "string"
      ? payload.data.sender_name.trim().slice(0, 100)
      : "Thuso Command Center";
    const reportId = typeof payload.reportId === "string"
      ? payload.reportId.slice(0, 128)
      : "";
    const photoUrl = validatePhotoUrl(payload.photoUrl);
    const sentAt = new Date().toISOString();
    const data = stringifyData({
      type: "announcement",
      category,
      title,
      body,
      message: body,
      reportId,
      photoUrl,
      sent_at: sentAt,
      sender_name: senderName,
    });
    if (new TextEncoder().encode(JSON.stringify(data)).length > 3500) {
      throw new InvalidAnnouncementError("The announcement is too long to send as a push notification.");
    }

    const accessToken = await getFirebaseAccessToken();
    const projectId = getRequiredEnv("FIREBASE_PROJECT_ID");
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            topic,
            notification: { title, body },
            data,
            android: {
              priority: "HIGH",
              ttl: "30s",
            },
            apns: {
              headers: { "apns-priority": "10" },
              payload: {
                aps: {
                  alert: { title, body },
                  sound: "default",
                  "interruption-level": "critical",
                  "mutable-content": 1,
                  "content-available": 1,
                },
              },
              fcm_options: photoUrl ? { image: photoUrl } : undefined,
            },
          },
        }),
      },
    );
    const result = await fcmResponse.json().catch(() => null);
    if (!fcmResponse.ok) {
      console.error("FCM announcement failed:", fcmResponse.status, result);
      return json({
        error: "Firebase Cloud Messaging could not send the announcement.",
        details: result,
      }, 502, headers);
    }

    return json({
      success: true,
      messageId: result?.name ?? crypto.randomUUID(),
      topic,
    }, 200, headers);
  } catch (error) {
    console.error("Moderator announcement failed:", error);
    if (error instanceof InvalidAnnouncementError) {
      return json({ error: error.message }, 400, headers);
    }
    return json({ error: errorMessage(error) }, 500, headers);
  }
});

async function getModerator(request: Request): Promise<{ id: string } | Response> {
  const token = request.headers.get("Authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return json({ error: "Moderator sign-in is required." }, 401, corsHeaders(request.headers.get("Origin") ?? ""));
  }

  const authClient = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) {
    return json({ error: "Your moderator session is invalid or expired. Sign in again." }, 401, corsHeaders(request.headers.get("Origin") ?? ""));
  }

  const moderatorEmail = getRequiredEnv("DASHBOARD_MODERATOR_EMAIL").trim().toLowerCase();
  if (!user.email_confirmed_at || user.email?.toLowerCase() !== moderatorEmail) {
    return json({ error: "This account is not authorized to send announcements." }, 403, corsHeaders(request.headers.get("Origin") ?? ""));
  }
  return { id: user.id };
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidAnnouncementError(`Announcement ${label} is required.`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new InvalidAnnouncementError(`Announcement ${label} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

function validatePhotoUrl(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new InvalidAnnouncementError("Photo URL must be a string.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidAnnouncementError("Photo URL must be a valid URL.");
  }
  if (url.protocol !== "https:") throw new InvalidAnnouncementError("Photo URL must use HTTPS.");
  return url.toString();
}

async function getFirebaseAccessToken() {
  const clientEmail = getRequiredEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getRequiredEnv("FIREBASE_PRIVATE_KEY").replaceAll("\\n", "\n");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await createJwt({
    iss: clientEmail,
    scope: fcmScope,
    aud: tokenUrl,
    iat: now,
    exp: now + 3600,
  }, privateKey);
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== "string") {
    throw new Error(`Firebase authentication failed: ${JSON.stringify(result)}`);
  }
  return result.access_token as string;
}

async function createJwt(payload: Record<string, unknown>, privateKeyPem: string) {
  const encodedHeader = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(signature)}`;
}

function stringifyData(data: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== ""),
  );
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64Url(input: string | ArrayBuffer) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
  return value;
}

function getOptionalEnv(name: string) {
  return Deno.env.get(name);
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
