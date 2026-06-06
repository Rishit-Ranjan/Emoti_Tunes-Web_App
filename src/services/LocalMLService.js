import * as tf from '@tensorflow/tfjs';

const EMOTION_LABELS = [
    'Joy',
    'Sadness',
    'Anger',
    'Excitement',
    'Melancholy',
    'Peaceful',
    'Joy-Anger',
    'Joy-Surprise',
    'Joy-Excitement',
    'Sad-Anger'
];

class LocalMLService {
    constructor() {
        this.model = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [3] }));
            this.model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
            this.model.add(tf.layers.dense({ units: EMOTION_LABELS.length, activation: 'softmax' }));

            this.model.compile({
                optimizer: tf.train.adam(0.01),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            await this.seedModel();
            this.initialized = true;
            console.log('🧠 Local Custom AER model ready');
        } catch (error) {
            console.error('Local ML initialization failed:', error);
        }
    }

    async seedModel() {
        const data = [
            [0.85, 0.75, 0.92], // Joy
            [0.15, 0.25, 0.38], // Sadness
            [0.95, 0.50, 0.25], // Anger
            [0.92, 0.92, 0.78], // Excitement
            [0.35, 0.40, 0.58], // Melancholy
            [0.45, 0.22, 0.88], // Peaceful
            [0.80, 0.65, 0.30], // Joy-Anger
            [0.88, 0.85, 0.70], // Joy-Surprise
            [0.93, 0.80, 0.85], // Joy-Excitement
            [0.30, 0.50, 0.28]  // Sad-Anger
        ];
        const labels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        const xs = tf.tensor2d(data);
        const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), EMOTION_LABELS.length);

        await this.model.fit(xs, ys, { epochs: 50, verbose: 0 });
        xs.dispose();
        ys.dispose();
    }

    async extractAudioFeatures(audioBlob) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const dataLength = channelData.length;

        const rms = Math.sqrt(channelData.reduce((sum, sample) => sum + sample * sample, 0) / dataLength);
        const normalizedEnergy = Math.min(Math.max(rms * 2, 0), 1);

        const zeroCrossings = channelData.reduce((count, sample, index, array) => {
            if (index === 0) return 0;
            return count + ((sample > 0) !== (array[index - 1] > 0) ? 1 : 0);
        }, 0);
        const zeroCrossRate = zeroCrossings / dataLength;

        let spectralCentroid = 0;
        const windowSize = Math.min(2048, dataLength);
        let magnitudeSum = 0;
        for (let i = 0; i < windowSize; i++) {
            magnitudeSum += Math.abs(channelData[i]);
            spectralCentroid += i * Math.abs(channelData[i]);
        }
        spectralCentroid = magnitudeSum === 0 ? 0 : spectralCentroid / (magnitudeSum * windowSize);

        const segments = 10;
        const segmentSize = Math.max(1, Math.floor(dataLength / segments));
        const energySegments = Array.from({ length: segments }, (_, index) => {
            const start = index * segmentSize;
            const end = Math.min(dataLength, start + segmentSize);
            const segmentRms = Math.sqrt(channelData.slice(start, end).reduce((sum, sample) => sum + sample * sample, 0) / (end - start));
            return segmentRms;
        });
        const meanEnergy = energySegments.reduce((sum, value) => sum + value, 0) / segments;
        const variance = energySegments.reduce((sum, value) => sum + Math.pow(value - meanEnergy, 2), 0) / segments;
        const stability = Math.max(0, 1 - Math.min(variance * 10, 1));

        return {
            avgEnergy: normalizedEnergy,
            avgFreq: zeroCrossRate,
            stability: stability * spectralCentroid
        };
    }

    async detectEmotionFromAudio(audioBlob) {
        await this.init();
        const features = await this.extractAudioFeatures(audioBlob);
        const prediction = this.predict(features);
        return prediction || 'Joy';
    }

    async extractImageStats(imageBlob) {
        const bitmap = await createImageBitmap(imageBlob);
        const width = 128;
        const height = 128;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let satSum = 0;
        let brightSum = 0;
        const pixelCount = width * height;

        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i] / 255;
            const g = imageData[i + 1] / 255;
            const b = imageData[i + 2] / 255;
            const mx = Math.max(r, g, b);
            const mn = Math.min(r, g, b);
            const bright = (mx + mn) / 2;
            const sat = mx === 0 ? 0 : (mx - mn) / mx;

            rSum += r;
            gSum += g;
            bSum += b;
            satSum += sat;
            brightSum += bright;
        }

        const avgR = rSum / pixelCount;
        const avgG = gSum / pixelCount;
        const avgB = bSum / pixelCount;
        const brightness = brightSum / pixelCount;
        const saturation = satSum / pixelCount;
        const intensity = avgR + avgG + avgB;

        return {
            brightness,
            saturation,
            redRatio: avgR / Math.max(intensity, 0.001),
            greenRatio: avgG / Math.max(intensity, 0.001),
            blueRatio: avgB / Math.max(intensity, 0.001)
        };
    }

    async detectEmotionFromImage(imageBlob) {
        try {
            const stats = await this.extractImageStats(imageBlob);
            console.log('📊 Local Image Stats (Heuristic Mode):', stats);
            return this.predictImageEmotion(stats);
        } catch (error) {
            console.warn('Image emotion detection failed:', error);
            return 'Joy';
        }
    }

    predictImageEmotion(stats) {
        const { brightness, saturation, redRatio, } = stats;

        if (brightness > 0.75 && saturation > 0.45) return 'Joy-Excitement';
        if (brightness > 0.65 && saturation > 0.35) return 'Joy';
        if (redRatio > 0.45 && brightness > 0.4) return 'Anger';
        if (brightness < 0.35 && saturation < 0.35) return 'Sadness';
        if (brightness < 0.55 && saturation < 0.35) return 'Melancholy';
        if (brightness > 0.55 && saturation < 0.35) return 'Peaceful';
        if (brightness > 0.6 && saturation > 0.55) return 'Joy-Surprise';
        return 'Joy';
    }

    predict(features) {
        if (!this.initialized || !features) return null;

        return tf.tidy(() => {
            const input = tf.tensor2d([[
                features.avgEnergy || 0.5,
                features.avgFreq || 0.2,
                features.stability || 0.5
            ]]);
            const prediction = this.model.predict(input);
            const index = prediction.argMax(1).dataSync()[0];
            return EMOTION_LABELS[index];
        });
    }
}

export const localML = new LocalMLService();