# 🚨 Thuso Command Center Dashboard

> Emergency response, missing persons moderation, real-time analytics, and community broadcast network for Southern Africa.

🌐 **Live Website**: [https://sensible12.github.io/thuso-dashboard/](https://sensible12.github.io/thuso-dashboard/)

---

## 🌟 Overview

The **Thuso Command Center Dashboard** is a real-time web portal designed for rapid crisis response, case verification, and community alerting. Built with React 19, TypeScript, and Vite, it bridges field telemetry from the Thuso mobile application with emergency response personnel. The dashboard does not include demo cases; Mock Mode is empty, and displayed reports are fetched from the configured backends.

### Key Capabilities

- 🚨 **Crisis Moderation & Dispatch**: Real-time review, verification, and resolution of reported missing person cases across Firestore, Supabase, and Appwrite.
- 📢 **Push Announcement Broadcast**: Send instant emergency push notifications with high-priority audio & vibration to all registered mobile devices via Firebase Cloud Messaging (FCM).
- 🗺️ **Southern Africa Incident Map**: Interactive regional density mapping across South Africa, Botswana, Namibia, Lesotho, and Eswatini with live pulsing GPS pins.
- 📊 **Multi-Format Data Export**: Instant export of verified reports into Microsoft Excel / CSV, structured JSON, and high-contrast printable summary tables.
- 📱 **Adaptive Portrait View**: Fully responsive interface tailored for desktop monitors as well as mobile devices in vertical orientation.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Icons**: Lucide React
- **Cloud Backend**: Supabase, Firebase Cloud Messaging, Appwrite Cloud
- **Deployment**: GitHub Pages via GitHub Actions

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/sensible12/thuso-dashboard.git

# Navigate to project directory
cd thuso-dashboard

# Install dependencies
npm install

# Start local development server
npm run dev
```

## 🌐 GitHub Pages Backend Access

The dashboard reads case records directly from Firestore, Supabase, and Appwrite. For Appwrite, add the deployed GitHub Pages hostname (for example, `sensible12.github.io`) as a **Web platform** in the Appwrite project settings; use the hostname shown in the dashboard warning if your deployment uses a different domain. The dashboard reports partial database failures above the cases list instead of silently implying that every source is connected.

## 🔐 Moderator Sign-In and Secure Deletion

The dashboard requires a Supabase Auth session. Report deletion and push announcements are handled by the `admin-delete-report` and `admin-send-announcement` Supabase Edge Functions. Both check the signed-in email against the private `DASHBOARD_MODERATOR_EMAIL` secret. Do not add public DELETE policies to Firestore, Supabase, or Appwrite.

The deletion function uses the existing Supabase Edge Function secrets `DASHBOARD_MODERATOR_EMAIL`, `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`, `APPWRITE_REPORTS_COLLECTION_ID`, `APPWRITE_PHOTOS_BUCKET_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Confirm these are present, that the moderator email matches the confirmed Auth user, and that the Appwrite API key is scoped to `documents.write` and `files.write`. The Firebase service account must have Firestore write permission.

The announcement function uses `DASHBOARD_MODERATOR_EMAIL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Optionally set `GLOBAL_FCM_TOPIC` to override the default topic `global-missing-person-alerts`. The Firebase service account must be allowed to send Firebase Cloud Messaging messages. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions.

From this dashboard repository, deploy the protected functions:

   ```bash
   npx supabase functions deploy admin-delete-report --project-ref gfblezjsmpbyucjwxmju
   npx supabase functions deploy admin-send-announcement --project-ref gfblezjsmpbyucjwxmju
   ```

Never put the Appwrite API key, Firebase private key, or Supabase service-role key in dashboard source, GitHub Pages, or a committed file. The GitHub Pages workflow deploys the static dashboard; the Edge Function is deployed separately.

---

## 📄 License
MIT License &copy; Thuso Emergency Network
