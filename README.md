# Transit-First Maps

A web app that searches for places and ranks them by **how long they take to reach by public transit right now**, not by geographic distance.

This app owns discovery, transit-time ranking, comparison, and route preview. Google Maps and Apple Maps own turn-by-turn navigation.

## Setup

1. Create a [Google Cloud](https://console.cloud.google.com/) project and enable billing.
2. Enable these APIs:
   - **Places API**
   - **Directions API**
   - **Geocoding API**
3. Create an API key. Restrict it to those three APIs.
4. Copy the env file and add your key:

```bash
cp .env.example .env.local
```

```bash
GOOGLE_MAPS_API_KEY=your_key_here
```

5. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Allow location (or type an origin), search for something like `Restaurants`, and results are sorted by leave-now transit time.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Google Places, Directions, and Geocoding (server-side only)
- Leaflet + OpenStreetMap for the map (no map API key)
