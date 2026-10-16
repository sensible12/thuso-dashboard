# 🚨 Thuso Command Center Dashboard

> Emergency response, missing persons moderation, real-time analytics, and community broadcast network for Southern Africa.

🌐 **Live Website**: [https://sensible12.github.io/thuso-dashboard/](https://sensible12.github.io/thuso-dashboard/)

---

## 🌟 Overview

The **Thuso Command Center Dashboard** is a real-time web portal designed for rapid crisis response, case verification, and community alerting. Built with React 19, TypeScript, and Vite, it bridges field telemetry from the Thuso mobile application with emergency response personnel.

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

---

## 📄 License
MIT License &copy; Thuso Emergency Network
