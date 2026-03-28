# 📍 BuddyRadar

**Real-time friend location tracking — see where your crew is, live on the map.**

BuddyRadar lets you and your friends share your live GPS locations on an interactive dark-themed map. It works instantly in demo mode (multiple browser tabs) and supports cross-device tracking via Firebase Realtime Database.

---

## Features

- 🗺️ **Live Map** — Interactive dark map powered by [Leaflet.js](https://leafletjs.com/) and CartoDB tiles
- 👥 **Friends Panel** — See all online friends with their avatars and last-seen time
- 📏 **Distance Calculator** — Tap any friend's marker to see the distance between you (km & miles)
- 🎨 **Custom Avatars** — Choose from 12 emoji avatars, each with a unique color
- 🔄 **Demo Mode** — Open multiple browser tabs to simulate multiple users (no setup required)
- 🔥 **Firebase Mode** — Paste your Firebase config to sync locations across different devices and real friends
- 🎯 **Center on Me** — One-tap button to re-center the map on your location
- ✨ **Animated UI** — Particle background, aurora blobs, and smooth transitions

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (any recent version — uses built-in modules only, no `npm install` needed)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/charanteja-7/BuddyRadar.git
cd BuddyRadar

# Start the server
node server.js
```

The server will print something like:

```
🚀 BuddyLocation server running!

  Local:   http://localhost:3000
  Network: http://192.168.x.x:3000   ← open this on your phone
```

Open `http://localhost:3000` in your browser.

---

## Usage

### Demo Mode (same browser)

1. Open `http://localhost:3000` in **two or more tabs**
2. Enter a name and pick an avatar in each tab
3. Click **Join the Map** — each tab simulates a different user
4. Click a friend's marker on the map to see the distance between you

### Firebase Mode (cross-device / real friends)

1. Create a free [Firebase](https://firebase.google.com/) project and enable **Realtime Database**
2. Copy your Firebase config JSON from the Firebase console
3. In the app, click ⚙️ **Settings** → paste the config → click **Connect Firebase**
4. Share the network URL (shown in the terminal) with your friends on the same Wi-Fi, or deploy the app and share the public URL

---

## Project Structure

```
BuddyRadar/
├── index.html   # App UI (join screen, map screen, settings modal)
├── app.js       # Core application logic (ES Module)
├── style.css    # Styles and animations
└── server.js    # Minimal static file server (Node.js built-ins only)
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Vanilla JS (ES Modules) | Application logic |
| [Leaflet.js](https://leafletjs.com/) v1.9.4 | Interactive map |
| [CartoDB Dark Matter](https://carto.com/basemaps/) | Map tiles |
| [Firebase Realtime Database](https://firebase.google.com/products/realtime-database) | Cross-device sync (optional) |
| [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) | Demo mode (same browser) |
| Node.js `http` / `fs` | Static file server |
| [Space Grotesk & Space Mono](https://fonts.google.com/) | Typography |

---

## License

This project is open source. Feel free to use, modify, and distribute it.
