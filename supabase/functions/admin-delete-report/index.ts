import { createClient } from "npm:@supabase/supabase-js@2";

type Report = {
  id?: unknown;
  country?: unknown;
  photo_file_id?: unknown;
  photo_url?: unknown;
  photo_original_url?: unknown;
  storage_provider?: unknown;
};

const firebaseProjectId = "thuso-organization";
const firestoreReportsCollection = "missing_reports";
const tokenUrl = "https://oauth2.googleapis.com/token";
const allowedOrigins = new Set([
  "https://sensible12.github.io",
  "http://localhost:5173",
]);

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
    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: "Moderator sign-in is required." }, 401, headers);

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "Your moderator session is invalid or expired. Sign in again." }, 401, headers);
    }
    const moderatorEmail = getRequiredEnv("DASHBOARD_MODERATOR_EMAIL").trim().toLowerCase();
    if (!user.email_confirmed_at || user.email?.toLowerCase() !== moderatorEmail) {
      return json({ error: "This account is not authorized to access the dashboard." }, 403, headers);
    }

    const payload = await request.json();
    if (payload?.action === "authorize") {
      return json({ authorized: true }, 200, headers);
    }
    if (payload?.action !== "delete") {
      return json({ error: "Unsupported moderator action." }, 400, headers);
    }
    const report = payload?.report as Report | undefined;
    if (!report || typeof report.id !== "string" || !report.id.trim()) {
      return json({ error: "A valid report ID is required." }, 400, headers);
    }
    if (typeof report.country !== "string") {
      return json({ error: "A valid report country is required." }, 400, headers);
    }

    await deleteReport(report.id, report.country);

    const photoFileId = getAppwritePhotoFileId(report);
    if (photoFileId) {
      try {
        await deleteAppwritePhoto(photoFileId);
      } catch (error) {
        return json({
          success: false,
          reportDeleted: true,
          photoDeleted: false,
          error: `Report was deleted, but its photo could not be deleted: ${errorMessage(error)}`,
        }, 200, headers);
      }
    }

    return json({ success: true, reportDeleted: true, photoDeleted: true }, 200, headers);
  } catch (error) {
    console.error("Moderator report deletion failed:", error);
    return json({ success: false, error: errorMessage(error) }, 200, headers);
  }
});

async function deleteReport(id: string, country: string) {
  switch (country) {
    case "South Africa":
      await deleteFirestoreReport(id);
      return;
    case "Botswana":
    case "Namibia":
      await deleteSupabaseReport(id);
      return;
    case "Lesotho":
    case "Eswatini":
      await deleteAppwriteReport(id);
      return;
    default:
      throw new Error(`Unsupported report country: ${country}`);
  }
}

async function deleteSupabaseReport(id: string) {
  const client = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await client
    .from("missing_reports")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Supabase report deletion failed: ${error.message}`);
}

async function deleteAppwriteReport(id: string) {
  const url = `${getRequiredEnv("APPWRITE_ENDPOINT")}/databases/${getRequiredEnv("APPWRITE_DATABASE_ID")}/collections/${getRequiredEnv("APPWRITE_REPORTS_COLLECTION_ID")}/documents/${encodeURIComponent(id)}`;
  await appwriteDelete(url, "Appwrite report");
}

async function deleteAppwritePhoto(fileId: string) {
  const url = `${getRequiredEnv("APPWRITE_ENDPOINT")}/storage/buckets/${getRequiredEnv("APPWRITE_PHOTOS_BUCKET_ID")}/files/${encodeURIComponent(fileId)}`;
  await appwriteDelete(url, "Appwrite photo");
}

async function appwriteDelete(url: string, label: string) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "X-Appwrite-Key": getRequiredEnv("APPWRITE_API_KEY"),
      "X-Appwrite-Project": getRequiredEnv("APPWRITE_PROJECT_ID"),
    },
  });
  if (response.ok || response.status === 204 || response.status === 404) return;
  throw new Error(`${label} deletion failed (${response.status}): ${await response.text()}`);
}

async function deleteFirestoreReport(id: string) {
  const serviceAccount = {
    project_id: firebaseProjectId,
    client_email: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
    private_key: getRequiredEnv("FIREBASE_PRIVATE_KEY").replaceAll("\\n", "\n"),
  };
  const accessToken = await getFirebaseAccessToken(serviceAccount);
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/${firestoreReportsCollection}/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.ok || response.status === 404) return;
  throw new Error(`Firestore report deletion failed (${response.status}): ${await response.text()}`);
}

async function getFirebaseAccessToken(serviceAccount: {
  client_email?: string;
  private_key?: string;
}) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase service account JSON must include client_email and private_key.");
  }
  const now = Math.floor(Date.now() / 1000);
  const assertion = await createJwt({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: tokenUrl,
    iat: now,
    exp: now + 3600,
  }, serviceAccount.private_key);
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

function getAppwritePhotoFileId(report: Report): string | null {
  const provider = typeof report.storage_provider === "string"
    ? report.storage_provider.toLowerCase()
    : "";
  if (provider && provider !== "appwrite") return null;

  if (typeof report.photo_file_id === "string" && isAppwriteId(report.photo_file_id)) {
    return report.photo_file_id;
  }

  for (const value of [report.photo_original_url, report.photo_url]) {
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      const expectedOrigin = new URL(getRequiredEnv("APPWRITE_ENDPOINT")).origin;
      const parts = url.pathname.split("/");
      const bucketIndex = parts.indexOf("buckets");
      if (
        url.origin === expectedOrigin &&
        bucketIndex >= 0 &&
        parts[bucketIndex + 1] === getRequiredEnv("APPWRITE_PHOTOS_BUCKET_ID") &&
        parts[bucketIndex + 2] === "files" &&
        isAppwriteId(parts[bucketIndex + 3])
      ) {
        return parts[bucketIndex + 3];
      }
    } catch {
      continue;
    }
  }
  return null;
}

function isAppwriteId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,36}$/.test(value);
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
