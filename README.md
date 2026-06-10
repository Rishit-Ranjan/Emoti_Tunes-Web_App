## EmotiTunes

An intelligent music playlist generator that generates personalized playlists based on your current mood/emotions. Using the power of your camera and Gemini, EmotiTunes curates a unique listening experience by matching songs to your detected emotions.

## 🚀 What it does
1. Detects emotions from:
2. camera face capture
3. microphone voice recording
4. Generates mood-matching playlists via Google Gemini AI
5. Supports quick mood selection and search
6. Saves playlists locally in the user library
7. Provides offline fallback playlists when AI is unavailable
8. Uses YouTube and Spotify links for listening

## ✨ Key features
1. Emotion-driven playlist creation
2. Camera-based mood detection
3. Audio emotion recognition
4. Saved playlists and library view
5. Search moods, artists, and tracks
6. Robust fallback mode without Gemini access

## ⚙️ Setup

**Prerequisites:**  Node.js

1. Clone the repo:
```bash
git clone https://github.com/Rishit-Ranjan/Emoti_Tunes.git
```

2. Install dependencies:
```bash
npm install
```

3. Create .env.local in the project root with:
```bash
VITE_GEMINI_API_KEY= Your_Gemini_API_Key
```

4. Run locally:
```bash
npm run dev
```

## 📝Notes
1. A working internet connection is required for AI playlist generation and song playback.
2. If Gemini is unavailable or the API key is missing/ quota reached, EmotiTunes uses curated fallback playlists to keep the experience alive.
3. Browser permissions are required for camera and microphone access.

## 💡Tip
Use the camera or microphone options for the most immersive mood discovery experience, then explore the generated playlist and save favorites to your library.

**Home page**<br/><br/>
<img width="1887" height="907" alt="image" src="https://github.com/user-attachments/assets/f29cf383-d66f-4c4b-bc54-fe261239b932" />
<br/><br/>

<img width="1887" height="907" alt="image" src="https://github.com/user-attachments/assets/d7ec645c-3ec0-4f64-9fc0-b7512a705441" />
<br/><br/>

**Happy Mood**<br/><br/>
<img width="1887" height="905" alt="image" src="https://github.com/user-attachments/assets/1a49ed8d-11ba-4f93-aa92-8fe2a853b617" />
<br/><br/>

**Library**<br/><br/>
<img width="1885" height="906" alt="image" src="https://github.com/user-attachments/assets/ac307489-3bdc-4f71-9086-f9f8cb38eeaa" />

