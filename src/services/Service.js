import { GoogleGenerativeAI } from '@google/generative-ai';
import { localML } from './LocalMLService';

// ==============================
// Gemini API (direct from frontend)

// ==============================
// NOTE: Exposing API keys in the browser is insecure. Use an API proxy for production.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';
const HAS_GEMINI = Boolean(GEMINI_API_KEY);

const genAI = HAS_GEMINI ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const CONFIG = {
  retryAttempts: 2,
  retryDelay: 1000,
};

const withRetry = async (fn, context, retries = CONFIG.retryAttempts) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;
      console.warn(`Retry ${i + 1}/${retries} for ${context}:`, error?.message || error);
      await new Promise((resolve) => setTimeout(resolve, CONFIG.retryDelay * (i + 1)));
    }
  }
};

class ResponseCache {
  constructor(maxSize = 50, ttl = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }
}

const playlistCache = new ResponseCache();

// ==============================
// Offline fallback playlists
// ==============================
const LOCAL_PLAYLISTS = {
  joy: [
    { title: 'Walking On Sunshine', artist: 'Katrina & The Waves', duration: 240, bpm: 128 },
    { title: 'Good As Hell', artist: 'Lizzo', duration: 160, bpm: 98 },
    { title: 'Levitating', artist: 'Dua Lipa', duration: 203, bpm: 103 },
    { title: 'Electric Feel', artist: 'MGMT', duration: 234, bpm: 105 },
    { title: 'Shut Up and Dance', artist: 'Walk the Moon', duration: 210, bpm: 115 },
  ],
  sadness: [
    { title: 'Someone Like You', artist: 'Adele', duration: 285, bpm: 67 },
    { title: 'Fix You', artist: 'Coldplay', duration: 294, bpm: 69 },
    { title: 'Yesterday', artist: 'The Beatles', duration: 125, bpm: 74 },
    { title: 'Skinny Love', artist: 'Bon Iver', duration: 235, bpm: 86 },
    { title: 'The Night We Met', artist: 'Lord Huron', duration: 219, bpm: 73 },
  ],
  anger: [
    { title: 'Break Stuff', artist: 'Limp Bizkit', duration: 212, bpm: 74 },
    { title: 'Killing In The Name', artist: 'Rage Against The Machine', duration: 314, bpm: 86 },
    { title: 'Bulls On Parade', artist: 'Rage Against The Machine', duration: 255, bpm: 105 },
    { title: 'Bodies', artist: 'Drowning Pool', duration: 203, bpm: 94 },
    { title: 'Duality', artist: 'Slipknot', duration: 239, bpm: 112 },
  ],
  excitement: [
    { title: "Can't Stop", artist: 'Red Hot Chili Peppers', duration: 269, bpm: 116 },
    { title: 'Thunderstruck', artist: 'AC/DC', duration: 292, bpm: 120 },
    { title: 'Mr. Brightside', artist: 'The Killers', duration: 221, bpm: 148 },
    { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', duration: 269, bpm: 115 },
    { title: 'Shake It Off', artist: 'Taylor Swift', duration: 242, bpm: 160 },
  ],
  melancholy: [
    { title: 'Creep', artist: 'Radiohead', duration: 238, bpm: 92 },
    { title: 'Hurt', artist: 'Johnny Cash', duration: 219, bpm: 75 },
    { title: 'The Night We Met', artist: 'Lord Huron', duration: 219, bpm: 73 },
    { title: 'Say Something', artist: 'A Great Big World', duration: 239, bpm: 72 },
    { title: 'The Scientist', artist: 'Coldplay', duration: 311, bpm: 61 },
  ],
  peaceful: [
    { title: 'Weightless', artist: 'Marconi Union', duration: 480, bpm: 60 },
    { title: 'Music for Airports', artist: 'Brian Eno', duration: 1260, bpm: 55 },
    { title: 'River Flows In You', artist: 'Yiruma', duration: 190, bpm: 70 },
    { title: 'Clair de Lune', artist: 'Claude Debussy', duration: 300, bpm: 60 },
    { title: 'Sunrise', artist: 'Ólafur Arnalds', duration: 240, bpm: 65 },
  ],
  'joy-anger': [
    { title: 'Power', artist: 'Kanye West', duration: 291, bpm: 100 },
    { title: "Survivor", artist: "Destiny's Child", duration: 243, bpm: 81 },
    { title: 'Eye of the Tiger', artist: 'Survivor', duration: 245, bpm: 110 },
    { title: 'Stronger', artist: 'Kanye West', duration: 311, bpm: 104 },
    { title: 'Believer', artist: 'Imagine Dragons', duration: 204, bpm: 123 },
  ],
  'joy-surprise': [
    { title: 'September', artist: 'Earth, Wind & Fire', duration: 210, bpm: 126 },
    { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', duration: 269, bpm: 115 },
    { title: 'Sugar', artist: 'Maroon 5', duration: 235, bpm: 120 },
    { title: 'Happy', artist: 'Pharrell Williams', duration: 233, bpm: 160 },
    { title: 'Dancing Queen', artist: 'ABBA', duration: 230, bpm: 100 },
  ],
  'joy-excitement': [
    { title: 'Levitating', artist: 'Dua Lipa', duration: 203, bpm: 103 },
    { title: 'Shut Up and Dance', artist: 'Walk The Moon', duration: 210, bpm: 115 },
    { title: 'Shake It Off', artist: 'Taylor Swift', duration: 242, bpm: 160 },
    { title: "Don't Stop Me Now", artist: 'Queen', duration: 236, bpm: 156 },
    { title: 'Dynamite', artist: 'BTS', duration: 199, bpm: 114 },
  ],
  'sad-anger': [
    { title: 'In the End', artist: 'Linkin Park', duration: 216, bpm: 105 },
    { title: 'Numb', artist: 'Linkin Park', duration: 185, bpm: 110 },
    { title: 'Liability', artist: 'Lorde', duration: 240, bpm: 60 },
    { title: 'Hurt', artist: 'Nine Inch Nails', duration: 386, bpm: 82 },
    { title: 'Bring Me to Life', artist: 'Evanescence', duration: 242, bpm: 96 },
  ],
};

const normalizeEmotionKey = (emotion) => {
  if (!emotion) return 'joy';
  return emotion.toString().trim().toLowerCase().replace(/\s+/g, '-');
};

const FALLBACK_PLAYLISTS = LOCAL_PLAYLISTS;

const dataUrlToBlob = (dataUrl) => {
  const [metadata, base64Data] = dataUrl.split(',');
  const mimeMatch = metadata.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64Data);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mime });
};

// ==============================
// Helpers
// ==============================
const assertGemini = () => {
  if (!HAS_GEMINI || !genAI) {
    throw new Error('Gemini API key not configured (VITE_GEMINI_API_KEY missing).');
  }
};

const extractJsonArrayFromText = (text) => {
  // Prefer array JSON
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // ignore
    }
  }
  return null;
};

const extractJsonSongsFromText = (text) => {
  // Accept either [ {song...} ] or { songs: [...] }
  const arr = extractJsonArrayFromText(text);
  if (Array.isArray(arr)) return arr;

  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    const candidate = text.slice(objStart, objEnd + 1);
    try {
      const obj = JSON.parse(candidate);
      if (Array.isArray(obj?.songs)) return obj.songs;
    } catch {
      // ignore
    }
  }

  return null;
};

const ensurePlaylistLength = (songs, mood, targetLength) => {
  if (!Array.isArray(songs)) songs = [];
  const normalizedMood = normalizeEmotionKey(mood);
  const baseList = FALLBACK_PLAYLISTS[normalizedMood] || FALLBACK_PLAYLISTS.joy;
  const filled = [...songs];
  let fallbackIndex = 0;

  while (filled.length < targetLength) {
    const fallbackSong = baseList[fallbackIndex % baseList.length];
    if (!filled.some((s) => s.title === fallbackSong.title && s.artist === fallbackSong.artist)) {
      filled.push(fallbackSong);
    } else if (filled.length + 1 <= targetLength) {
      filled.push({ ...fallbackSong, title: `${fallbackSong.title} (${filled.length + 1})` });
    }
    fallbackIndex += 1;
    if (fallbackIndex > baseList.length * 2) break;
  }

  return filled.slice(0, targetLength);
};

const geminiGenerate = async ({ systemPrompt, userPrompt }) => {
  assertGemini();

  const model = genAI.getGenerativeModel({
    // NOTE: Your current SDK may not support gemini-1.5-pro.
    // Use a broadly-supported model name.
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userPrompt);
  const response = await result.response;
  return response.text();
};

// ==============================
// Exports expected by the UI
// ==============================

// Playlist from emotion (Gemini)
export const generatePlaylist = async (emotion, numSongs = 10) => {
  const normalizedEmotion = normalizeEmotionKey(emotion);
  const cacheKey = `${normalizedEmotion}:${numSongs}`;

  const cached = playlistCache.get(cacheKey);
  if (cached) return cached;

  try {
    const systemPrompt =
      'You are a music curation assistant. Output ONLY valid JSON.';

    const userPrompt =
      `Create a playlist of ${numSongs} songs that match the emotion: "${emotion}".\n\n` +
      'Return JSON in this exact shape:\n' +
      '{ "songs": [ { "title": string, "artist": string, "youtubeId": string } ] }\n' +
      'Rules:\n' +
      '- youtubeId must be an 11-character YouTube video id (no URL). If unsure, use empty string "".\n' +
      '- Provide real popular tracks when possible.\n' +
      '- Return only JSON.';

    const text = await withRetry(
      () => geminiGenerate({ systemPrompt, userPrompt }),
      `generatePlaylist(${emotion})`
    );

    const songs = extractJsonSongsFromText(text);
    if (!Array.isArray(songs) || songs.length === 0) {
      throw new Error('Gemini did not return songs array');
    }

    // Normalize output shape for the UI
    const normalizedSongs = songs
      .map((s) => ({
        title: s?.title || 'Unknown Title',
        artist: s?.artist || 'Unknown Artist',
        youtubeId: s?.youtubeId || '',
        // UI tolerates extra fields; keep minimal.
      }));

    const finalSongs = ensurePlaylistLength(normalizedSongs, emotion, numSongs);

    playlistCache.set(cacheKey, finalSongs);
    return finalSongs;
  } catch (error) {
    console.error('❌ Gemini playlist generation failed:', error?.message || error);
    console.warn('⚠️ Using fallback playlist');
    const mood = normalizeEmotionKey(emotion);
    return (FALLBACK_PLAYLISTS[mood] || FALLBACK_PLAYLISTS.joy).slice(0, numSongs);
  }
};

// Emotion from image (Local ML)
export const detectEmotionFromImage = async (imageData) => {
  try {
    const imageBlob = dataUrlToBlob(imageData);
    const predictedEmotion = await localML.detectEmotionFromImage(imageBlob);
    return predictedEmotion || 'Joy';
  } catch (error) {
    console.error('❌ Local image emotion detection failed:', error?.message || error);

    if (!HAS_GEMINI) {
      return 'Joy';
    }

    try {
      const systemPrompt =
        'You are an emotion recognition assistant. Output ONLY a single JSON object: {"predicted_emotion": string}.';

      const userPrompt =
        `Analyze the emotions in this image and choose the closest emotion label from this list: ` +
        `Joy, Sadness, Anger, Excitement, Melancholy, Peaceful, Joy-Anger, Joy-Surprise, Joy-Excitement, Sad-Anger.\n` +
        `Return predicted_emotion exactly as one of those labels.\n\n` +
        `Image data URL (base64):\n${imageData}`;

      const text = await withRetry(
        () => geminiGenerate({ systemPrompt, userPrompt }),
        'detectEmotionFromImageFallback'
      );

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in response');

      const obj = JSON.parse(text.slice(start, end + 1));
      return obj?.predicted_emotion || 'Joy';
    } catch (fallbackError) {
      console.error('❌ Gemini fallback image emotion detection failed:', fallbackError?.message || fallbackError);
      return 'Joy';
    }
  }
};

// Emotion from audio (Local ML)
export const detectEmotionFromAudio = async (audioFile) => {
  try {
    const predictedEmotion = await localML.detectEmotionFromAudio(audioFile);
    return predictedEmotion || 'Joy';
  } catch (error) {
    console.error('❌ Local audio emotion detection failed:', error?.message || error);

    if (!HAS_GEMINI) {
      return 'Joy';
    }

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const mime = audioFile.type || 'audio/webm';
      const dataUrl = `data:${mime};base64,${base64}`;

      const systemPrompt =
        'You are an emotion recognition assistant. Output ONLY a single JSON object: {"predicted_emotion": string}.';

      const userPrompt =
        `Analyze the emotion in this audio and choose the closest emotion label from this list: ` +
        `Joy, Sadness, Anger, Excitement, Melancholy, Peaceful, Joy-Anger, Joy-Surprise, Joy-Excitement, Sad-Anger.\n` +
        `Return predicted_emotion exactly as one of those labels.\n\n` +
        `Audio data URL (base64):\n${dataUrl}`;

      const text = await withRetry(
        () => geminiGenerate({ systemPrompt, userPrompt }),
        'detectEmotionFromAudioFallback'
      );

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in response');

      const obj = JSON.parse(text.slice(start, end + 1));
      return obj?.predicted_emotion || 'Joy';
    } catch (fallbackError) {
      console.error('❌ Gemini fallback audio emotion detection failed:', fallbackError?.message || fallbackError);
      return 'Joy';
    }
  }
};

// Complete analysis pipeline: detect emotion + generate playlist
export const analyzeAndGeneratePlaylist = async (audioFile, numSongs = 10) => {
  try {
    const emotion = await detectEmotionFromAudio(audioFile);
    const playlist = await generatePlaylist(emotion, numSongs);

    return {
      emotion,
      confidence: 1,
      playlist,
      all_emotions: [emotion],
    };
  } catch (error) {
    console.error('❌ analyzeAndGeneratePlaylist failed:', error?.message || error);
    throw error;
  }
};

// Health check
export const checkMLHealth = async () => {
  try {
    // We can't call a remote /health endpoint since this is direct Gemini.
    // We'll just validate API key presence.
    if (!HAS_GEMINI) {
      return { healthy: false, message: '❌ VITE_GEMINI_API_KEY missing', error: 'missing_key' };
    }
    return { healthy: true, message: '✅ Gemini configured', components: [] };
  } catch (error) {
    return { healthy: false, message: '❌ Gemini health check failed', error: error?.message || error };
  }
};

export const checkFoundryHealth = checkMLHealth;

