import { localML } from './LocalMLService';

// ML Model API Configuration
const ML_API_BASE = import.meta.env.VITE_ML_API_URL?.trim() || '';
const USE_REMOTE_API = Boolean(ML_API_BASE);

const api = {
    recognizeEmotion: async (audioFile) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        return fetch(`${ML_API_BASE}/api/recognize-emotion`, {
            method: 'POST',
            body: formData
        });
    },
    
    recognizeEmotionImage: async (imageBlob) => {
        const formData = new FormData();
        formData.append('file', imageBlob, 'capture.jpg');
        return fetch(`${ML_API_BASE}/api/recognize-emotion-image`, {
            method: 'POST',
            body: formData
        });
    },
    
    generatePlaylist: async (emotion, mood, numSongs = 10) => {
        return fetch(`${ML_API_BASE}/api/generate-playlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emotion, mood, num_songs: numSongs })
        });
    },
    
    analyzeAndGenerate: async (audioFile, numSongs = 10) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('num_songs', numSongs);
        return fetch(`${ML_API_BASE}/api/analyze-and-generate`, {
            method: 'POST',
            body: formData
        });
    },
    
    health: async () => {
        return fetch(`${ML_API_BASE}/api/health`);
    }
};

// Configuration
const CONFIG = {
    retryAttempts: 2,
    retryDelay: 1000,
};

// Response cache
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

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
}

const playlistCache = new ResponseCache();

// Retry wrapper
const withRetry = async (fn, context, retries = CONFIG.retryAttempts) => {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries) throw error;
            console.warn(`Retry ${i + 1}/${retries} for ${context}:`, error.message);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (i + 1)));
        }
    }
};

// Local playlist map for offline / backend-free mode
const LOCAL_PLAYLISTS = {
    joy: [
        { title: "Walking On Sunshine", artist: "Katrina & The Waves", duration: 240, bpm: 128 },
        { title: "Good As Hell", artist: "Lizzo", duration: 160, bpm: 98 },
        { title: "Levitating", artist: "Dua Lipa", duration: 203, bpm: 103 },
        { title: "Electric Feel", artist: "MGMT", duration: 234, bpm: 105 },
        { title: "Shut Up and Dance", artist: "Walk the Moon", duration: 210, bpm: 115 },
    ],
    sadness: [
        { title: "Someone Like You", artist: "Adele", duration: 285, bpm: 67 },
        { title: "Fix You", artist: "Coldplay", duration: 294, bpm: 69 },
        { title: "Yesterday", artist: "The Beatles", duration: 125, bpm: 74 },
        { title: "Skinny Love", artist: "Bon Iver", duration: 235, bpm: 86 },
        { title: "The Night We Met", artist: "Lord Huron", duration: 219, bpm: 73 },
    ],
    anger: [
        { title: "Break Stuff", artist: "Limp Bizkit", duration: 212, bpm: 74 },
        { title: "Killing In The Name", artist: "Rage Against The Machine", duration: 314, bpm: 86 },
        { title: "Bulls On Parade", artist: "Rage Against The Machine", duration: 255, bpm: 105 },
        { title: "Bodies", artist: "Drowning Pool", duration: 203, bpm: 94 },
        { title: "Duality", artist: "Slipknot", duration: 239, bpm: 112 },
    ],
    excitement: [
        { title: "Can't Stop", artist: "Red Hot Chili Peppers", duration: 269, bpm: 116 },
        { title: "Thunderstruck", artist: "AC/DC", duration: 292, bpm: 120 },
        { title: "Mr. Brightside", artist: "The Killers", duration: 221, bpm: 148 },
        { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: 269, bpm: 115 },
        { title: "Shake It Off", artist: "Taylor Swift", duration: 242, bpm: 160 },
    ],
    melancholy: [
        { title: "Creep", artist: "Radiohead", duration: 238, bpm: 92 },
        { title: "Hurt", artist: "Johnny Cash", duration: 219, bpm: 75 },
        { title: "The Night We Met", artist: "Lord Huron", duration: 219, bpm: 73 },
        { title: "Say Something", artist: "A Great Big World", duration: 239, bpm: 72 },
        { title: "The Scientist", artist: "Coldplay", duration: 311, bpm: 61 },
    ],
    peaceful: [
        { title: "Weightless", artist: "Marconi Union", duration: 480, bpm: 60 },
        { title: "Music for Airports", artist: "Brian Eno", duration: 1260, bpm: 55 },
        { title: "River Flows In You", artist: "Yiruma", duration: 190, bpm: 70 },
        { title: "Clair de Lune", artist: "Claude Debussy", duration: 300, bpm: 60 },
        { title: "Sunrise", artist: "Ólafur Arnalds", duration: 240, bpm: 65 },
    ],
    'joy-anger': [
        { title: "Power", artist: "Kanye West", duration: 291, bpm: 100 },
        { title: "Survivor", artist: "Destiny's Child", duration: 243, bpm: 81 },
        { title: "Eye of the Tiger", artist: "Survivor", duration: 245, bpm: 110 },
        { title: "Stronger", artist: "Kanye West", duration: 311, bpm: 104 },
        { title: "Believer", artist: "Imagine Dragons", duration: 204, bpm: 123 },
    ],
    'joy-surprise': [
        { title: "September", artist: "Earth, Wind & Fire", duration: 210, bpm: 126 },
        { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: 269, bpm: 115 },
        { title: "Sugar", artist: "Maroon 5", duration: 235, bpm: 120 },
        { title: "Happy", artist: "Pharrell Williams", duration: 233, bpm: 160 },
        { title: "Dancing Queen", artist: "ABBA", duration: 230, bpm: 100 },
    ],
    'joy-excitement': [
        { title: "Levitating", artist: "Dua Lipa", duration: 203, bpm: 103 },
        { title: "Shut Up and Dance", artist: "Walk The Moon", duration: 210, bpm: 115 },
        { title: "Shake It Off", artist: "Taylor Swift", duration: 242, bpm: 160 },
        { title: "Don't Stop Me Now", artist: "Queen", duration: 236, bpm: 156 },
        { title: "Dynamite", artist: "BTS", duration: 199, bpm: 114 },
    ],
    'sad-anger': [
        { title: "In the End", artist: "Linkin Park", duration: 216, bpm: 105 },
        { title: "Numb", artist: "Linkin Park", duration: 185, bpm: 110 },
        { title: "Liability", artist: "Lorde", duration: 240, bpm: 60 },
        { title: "Hurt", artist: "Nine Inch Nails", duration: 386, bpm: 82 },
        { title: "Bring Me to Life", artist: "Evanescence", duration: 242, bpm: 96 },
    ]
};

const normalizeEmotionKey = (emotion) => {
    if (!emotion) return 'joy';
    return emotion.toString().trim().toLowerCase().replace(/\s+/g, '-');
};

const getLocalPlaylist = (emotion, numSongs) => {
    const key = normalizeEmotionKey(emotion);
    const playlist = LOCAL_PLAYLISTS[key] || LOCAL_PLAYLISTS.joy;
    return playlist.slice(0, numSongs);
};

const FALLBACK_PLAYLISTS = LOCAL_PLAYLISTS;

// Generate playlist from emotion
export const generatePlaylist = async (emotion, numSongs = 10) => {
    const normalizedEmotion = normalizeEmotionKey(emotion);

    if (!USE_REMOTE_API) {
        console.log(`🎵 Using local playlist generator for emotion: ${emotion}`);
        const songs = getLocalPlaylist(normalizedEmotion, numSongs);
        playlistCache.set(normalizedEmotion, songs);
        return songs;
    }

    try {
        console.log(`🎵 Generating playlist for emotion: ${emotion}`);
        
        const response = await withRetry(async () => {
            return await api.generatePlaylist(emotion, 'mixed', numSongs);
        }, `playlist generation for ${emotion}`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const songs = data.songs || [];
        
        if (songs.length > 0) {
            console.log(`✅ Generated playlist with ${songs.length} songs`);
            playlistCache.set(emotion, songs);
            return songs;
        } else {
            throw new Error('No songs in response');
        }
    } catch (error) {
        console.error(`❌ Playlist generation failed:`, error.message);
        console.warn('⚠️ Using fallback playlist');
        const mood = normalizeEmotionKey(emotion);
        return FALLBACK_PLAYLISTS[mood] || FALLBACK_PLAYLISTS.joy;
    }
};

// Emotion detection from camera capture (image data URL)
export const detectEmotionFromImage = async (imageData) => {
    console.log('📸 Image Emotion Recognition (IER) via Local ML Model');
    
    try {
        const res = await fetch(imageData);
        const blob = await res.blob();
        const detectedEmotion = await localML.detectEmotionFromImage(blob);
        console.log(`✅ Local image model detected emotion: ${detectedEmotion}`);
        return detectedEmotion;
    } catch (localError) {
        console.warn('Local image emotion detection failed:', localError.message || localError);
    }

    if (!USE_REMOTE_API) {
        console.warn('⚠️ No image API configured; defaulting to Joy');
        return 'Joy';
    }

    try {
        const res = await fetch(imageData);
        const blob = await res.blob();
        const response = await withRetry(async () => {
            return await api.recognizeEmotionImage(blob);
        }, 'image emotion detection');

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const emotion = data.predicted_emotion || 'joy';
        
        console.log(`✅ Detected emotion from image: ${emotion}`);
        return emotion;
    } catch (error) {
        console.error(`❌ Image emotion detection failed:`, error.message || error);
        console.warn('⚠️ Defaulting to Joy');
        return 'Joy';
    }
};

// Emotion detection from audio file
export const detectEmotionFromAudio = async (audioFile) => {
    console.log('🎤 Audio Emotion Recognition (AER) via Local ML Model');

    try {
        const detectedEmotion = await localML.detectEmotionFromAudio(audioFile);
        console.log(`✅ Local model detected emotion: ${detectedEmotion}`);
        return detectedEmotion;
    } catch (localError) {
        console.warn('Local AER failed:', localError.message || localError);
    }

    if (!USE_REMOTE_API) {
        console.warn('⚠️ No remote audio API configured; defaulting to Joy');
        return 'Joy';
    }

    try {
        const response = await withRetry(async () => {
            return await api.recognizeEmotion(audioFile);
        }, 'emotion detection');

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const emotion = data.predicted_emotion || 'joy';
        
        console.log(`✅ Remote API detected emotion: ${emotion} (confidence: ${(data.confidence * 100).toFixed(1)}%)`);
        return emotion;
    } catch (error) {
        console.error('❌ Emotion detection failed:', error.message || error);
        console.warn('⚠️ Defaulting to Joy');
        return 'Joy';
    }
};

// Complete analysis pipeline: detect emotion + generate playlist
export const analyzeAndGeneratePlaylist = async (audioFile, numSongs = 10) => {
    console.log("🎵 Starting complete analysis pipeline...");
    
    try {
        const response = await withRetry(async () => {
            return await api.analyzeAndGenerate(audioFile, numSongs);
        }, 'analysis and playlist generation');

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const emotionAnalysis = data.emotion_analysis;
        const playlistData = data.playlist;
        
        console.log(`✅ Analysis complete:`);
        console.log(`   - Emotion: ${emotionAnalysis.predicted_emotion}`);
        console.log(`   - Confidence: ${(emotionAnalysis.confidence * 100).toFixed(1)}%`);
        console.log(`   - Playlist songs: ${playlistData.song_count}`);
        
        return {
            emotion: emotionAnalysis.predicted_emotion,
            confidence: emotionAnalysis.confidence,
            playlist: playlistData.songs,
            all_emotions: emotionAnalysis.all_emotions
        };
    } catch (error) {
        console.error(`❌ Pipeline failed:`, error.message);
        throw error;
    }
};

// Health check - verify ML API is running
export const checkMLHealth = async () => {
    try {
        const response = await api.health();
        
        if (response.ok) {
            const data = await response.json();
            return {
                healthy: true,
                message: '✅ ML API is running',
                components: data.components
            };
        } else {
            return {
                healthy: false,
                message: '❌ ML API returned error: ' + response.status,
                error: response.status
            };
        }
    } catch (error) {
        return {
            healthy: false,
            message: `❌ Cannot connect to ML API at ${ML_API_BASE}`,
            error: error.message
        };
    }
};

// Legacy function for backward compatibility
export const checkFoundryHealth = checkMLHealth;
