import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const getApiKey = () => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log(`🔑 Key check: ${rawKey ? "Found (Starts with " + rawKey.substring(0, 4) + ")" : "Missing"}`);
    return rawKey && typeof rawKey === 'string' && rawKey.trim().length >= 5 ? rawKey.trim() : "";
};

const createModel = (modelName) => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        return ai.getGenerativeModel({ model: modelName });
    } catch (error) {
        console.error(`Failed to initialize Gemini model ${modelName}:`, error.message);
        return null;
    }
};

const getModel = () => createModel("gemini-2.5-flash");

const CONFIG = {
    temperature: 0.7,
    maxOutputTokens: 1000,
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

const emotionCache = new ResponseCache();

// Clean JSON string
const cleanJsonString = (responseText) => {
    let jsonText = responseText.trim();

    // Remove markdown code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
    }

    // Fix trailing commas
    jsonText = jsonText.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');

    return jsonText;
};

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

// Fallback playlists with verified YouTube IDs
const FALLBACK_PLAYLISTS = {
    'Joy': [
        { title: "Happy", artist: "Pharrell Williams", youtubeId: "y6Sxv-sUYtM" },
        { title: "Walking on Sunshine", artist: "Katrina and the Waves", youtubeId: "iPUmE-tne5U" },
        { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", youtubeId: "ru0K8uYEZWw" },
        { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", youtubeId: "OPf0YbXqDm0" },
        { title: "Good Vibrations", artist: "The Beach Boys", youtubeId: "Eab_beh07HU" },
        { title: "September", artist: "Earth, Wind & Fire", youtubeId: "Gs069dndIYk" },
        { title: "Best Day of My Life", artist: "American Authors", youtubeId: "Y66j_BUCBMY" },
        { title: "I Gotta Feeling", artist: "The Black Eyed Peas", youtubeId: "uSD4vsh1zDA" },
        { title: "Shut Up and Dance", artist: "Walk The Moon", youtubeId: "6JCLY0Rlx6Q" },
        { title: "Roar", artist: "Katy Perry", youtubeId: "CevxZvSJLk8" }
    ],
    'Sadness': [
        { title: "Someone Like You", artist: "Adele", youtubeId: "hLQl3WQQoQ0" },
        { title: "Fix You", artist: "Coldplay", youtubeId: "k4V3Mo61fJM" },
        { title: "The Sound of Silence", artist: "Simon & Garfunkel", youtubeId: "4zLfCnGVeL4" },
        { title: "Yesterday", artist: "The Beatles", youtubeId: "jo505ZyaCbA" },
        { title: "Hurt", artist: "Johnny Cash", youtubeId: "8AHCfZTRGiI" },
        { title: "All I Want", artist: "Kodaline", youtubeId: "mtf7hC17IBM" },
        { title: "Skinny Love", artist: "Bon Iver", youtubeId: "ssdgFoHLwnk" },
        { title: "Stay With Me", artist: "Sam Smith", youtubeId: "pB-5XG-DbAA" },
        { title: "Let Her Go", artist: "Passenger", youtubeId: "RBumgq5yVrA" },
        { title: "Tears in Heaven", artist: "Eric Clapton", youtubeId: "JxPj3GAYYZ0" }
    ],
    'Anger': [
        { title: "Break Stuff", artist: "Limp Bizkit", youtubeId: "ZpUYjpKg9KY" },
        { title: "In the End", artist: "Linkin Park", youtubeId: "eVTXPUF4Oz4" },
        { title: "Smells Like Teen Spirit", artist: "Nirvana", youtubeId: "hTWKbfoikeg" },
        { title: "Du Hast", artist: "Rammstein", youtubeId: "W3q8Od5qJio" },
        { title: "Down with the Sickness", artist: "Disturbed", youtubeId: "09LTT0rkYls" },
        { title: "Headstrong", artist: "Trapt", youtubeId: "HTvu1Yr3Ohk" }
    ],
    'Excitement': [
        { title: "Eye of the Tiger", artist: "Survivor", youtubeId: "btPJPFnesVw" },
        { title: "Don't Stop Me Now", artist: "Queen", youtubeId: "HgzGwKwLmgM" },
        { title: "Lose Yourself", artist: "Eminem", youtubeId: "_Yhyp-_hX2s" },
        { title: "Levels", artist: "Avicii", youtubeId: "_ovdm2yX4MA" },
        { title: "Wake Me Up", artist: "Avicii", youtubeId: "IcrbM1l_BoI" }
    ],
    'Melancholy': [
        { title: "Video Games", artist: "Lana Del Rey", youtubeId: "cE6wxDqdOV0" },
        { title: "The Night We Met", artist: "Lord Huron", youtubeId: "KtlgYxa6BMU" },
        { title: "Summertime Sadness", artist: "Lana Del Rey", youtubeId: "TdrL3QxjyVw" }
    ],
    'Peaceful': [
        { title: "Weightless", artist: "Marconi Union", youtubeId: "UfcAVejslrU" },
        { title: "River Flows in You", artist: "Yiruma", youtubeId: "7maJOI3QMu0" },
        { title: "Banana Pancakes", artist: "Jack Johnson", youtubeId: "OkyrIRyrW60" }
    ],
    'default': [
        { title: "Bohemian Rhapsody", artist: "Queen", youtubeId: "fJ9rUzIMcZQ" },
        { title: "Hotel California", artist: "Eagles", youtubeId: "09839DpTctU" },
        { title: "Billie Jean", artist: "Michael Jackson", youtubeId: "Zi_XLOBDo_Y" }
    ]
};

// Keep this list limited to currently supported text-generation-capable models.
// Deprecated names like gemini-pro / gemini-1.0-pro / gemini-1.5-flash can return 404.
const MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
];

export const generatePlaylist = async (emotion) => {
    for (const modelName of MODELS_TO_TRY) {
        const model = createModel(modelName);
        if (!model) continue;

        try {
            console.log(`📡 Vibe Sync: Attempting ${modelName}...`);
            const prompt = `Generate a fresh, unique, and diverse playlist of 10 songs that perfectly capture the feeling of '${emotion}'. 

Return ONLY a valid JSON object with this exact structure:
{
    "songs": [
        {"title": "Song Title", "artist": "Artist Name", "youtubeId": "XXXXXXXXXXX"}
    ]
}

Ensure youtubeId is accurate. No conversational text.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();
            
            const jsonText = cleanJsonString(text);
            const parsed = JSON.parse(jsonText);
            
            if (parsed && (parsed.songs || Array.isArray(parsed))) {
                console.log(`✅ Intelligence Link Established: ${modelName}`);
                return parsed.songs || parsed;
            }
        } catch (error) {
            console.error(`❌ Model ${modelName} Connection Failed:`, error.message);
            // If it's a 429, we might want to wait, but for 404 we skip immediately
        }
    }

    console.warn("⚠️ System Fallback: All AI models offline. Activating Curated Vibe protocols.");
    return getFallback(emotion);
};

const getFallback = (emotion) => {
    let fallbackKey = emotion;
    if (!FALLBACK_PLAYLISTS[fallbackKey]) {
        if (emotion.includes('Joy')) fallbackKey = 'Joy';
        else if (emotion.includes('Sad')) fallbackKey = 'Sadness';
        else if (emotion.includes('Anger')) fallbackKey = 'Anger';
        else fallbackKey = 'default';
    }
    return FALLBACK_PLAYLISTS[fallbackKey];
};

// Emotion detection using Gemini 1.5 Flash Vision
export const detectEmotionFromImage = async (base64ImageData) => {
    console.log("📸 Vision-based Emotion Recognition via Gemini 1.5 Flash");
    const model = getModel();
    if (!model) return "Joy";

    try {
        const prompt = "Identify the primary facial emotion of the person in this image. Respond ONLY with one of these words: Joy, Sadness, Anger, Excitement, Melancholy, Peaceful, Joy-Anger, Joy-Surprise, Joy-Excitement, Sad-Anger.";

        // Strip data URL prefix if present
        const cleanBase64 = base64ImageData.includes(',') ? base64ImageData.split(',')[1] : base64ImageData;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: cleanBase64,
                    mimeType: "image/jpeg"
                }
            },
            prompt
        ]);

        const response = await result.response;
        let text = (await response.text()).trim().toLowerCase().replace(/[^a-z-]/g, '');
        const moods = ['joy-anger', 'joy-surprise', 'joy-excitement', 'sad-anger', 'joy', 'sadness', 'anger', 'excitement', 'melancholy', 'peaceful'];

        const matchedMood = moods.find(m => text.includes(m));
        if (matchedMood) {
            return matchedMood.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        }

        return 'Joy';
    } catch (error) {
        console.warn("⚠️ Vision analysis failed. Falling back to Joy:", error.message);
        return 'Joy';
    }
};

export const detectEmotionFromAudio = async (base64AudioData, mimeType, aerFeatures) => {
    console.log("🎤 Audio Emotion Recognition (AER) via native audio + wave features:", aerFeatures);
    const model = getModel();
    if (!model) return "Joy";
    if (!aerFeatures || !base64AudioData) return 'Joy';

    try {
        const prompt = `Perform Audio Emotion Recognition (AER) utilizing both the raw audio file and the following extracted features:
- Average Energy (Volume): ${aerFeatures.avgEnergy.toFixed(2)}
- Average Peak Frequency (Pitch): ${aerFeatures.avgFreq.toFixed(2)} Hz
- Vocal Stability (Variance): ${aerFeatures.stability.toFixed(2)}

Listen to the attached audio recording to capture the user's exact tonality and emotion.
Identify the user's emotion. Respond ONLY with one of these exact words: Joy, Sadness, Anger, Excitement, Melancholy, Peaceful, Joy-Anger, Joy-Surprise, Joy-Excitement, Sad-Anger.`;

        const cleanBase64 = base64AudioData.includes(',') ? base64AudioData.split(',')[1] : base64AudioData;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || "audio/webm"
                }
            },
            prompt
        ]);
        const response = await result.response;
        let text = (await response.text()).trim().toLowerCase().replace(/[^a-z-]/g, '');

        const moods = ['joy-anger', 'joy-surprise', 'joy-excitement', 'sad-anger', 'joy', 'sadness', 'anger', 'excitement', 'melancholy', 'peaceful'];
        const matchedMood = moods.find(m => text.includes(m));

        if (matchedMood) {
            return matchedMood.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        }

        return 'Joy';
    } catch (error) {
        console.warn("⚠️ AER analysis failed, falling back to Joy:", error.message);
        return 'Joy';
    }
};

// Health check
export const checkFoundryHealth = async () => {
    const model = getModel();
    if (!model) return { healthy: false, message: "❌ Gemini API Key missing or invalid" };
    try {
        const result = await model.generateContent("hi");
        const response = await result.response;
        return {
            healthy: !!(await response.text()),
            message: '✅ Gemini API is working'
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            message: '❌ Could not connect to Gemini service'
        };
    }
};
