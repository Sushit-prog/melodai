/**
 * AI Service
 * Handles audio analysis via Essentia.js and text AI via Gemini API
 * @module services/aiService
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

let essentia = null;
let essentiaReady = false;
let essentiaInitPromise = null;

const genAI = env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(env.GEMINI_API_KEY)
  : null;

const SAMPLE_RATE = 44100;

const initEssentia = async () => {
  if (essentiaReady) return essentia;
  if (essentiaInitPromise) return essentiaInitPromise;

  essentiaInitPromise = (async () => {
    try {
      const esPkg = require('essentia.js');
      essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
      essentiaReady = true;
      console.log(`Essentia.js initialized (version: ${essentia.version})`);
      return essentia;
    } catch (error) {
      console.error('Failed to initialize Essentia.js:', error.message);
      throw error;
    }
  })();

  return essentiaInitPromise;
};

const fetchAudioBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const decodeAudioToMono = async (audioBuffer) => {
  const es = await initEssentia();
  const uint8Array = new Uint8Array(audioBuffer);
  const audioBufferJS = es.arrayToVector(uint8Array);
  const monoSignal = es.MonoLoader(audioBufferJS, SAMPLE_RATE);
  audioBufferJS.delete();
  return monoSignal;
};

const analyzeBPM = async (signalVector) => {
  const es = await initEssentia();
  const rhythm = es.RhythmExtractor2019(signalVector, SAMPLE_RATE);
  return {
    bpm: Math.round(rhythm.bpm),
    beats: rhythm.ticks ? es.vectorToArray(rhythm.ticks) : [],
  };
};

const analyzeKey = async (signalVector) => {
  const es = await initEssentia();
  const keyData = es.KeyExtractor(signalVector, SAMPLE_RATE);

  let normalizedKey = keyData.key;
  if (keyData.scale === 'minor') {
    normalizedKey = normalizedKey + 'm';
  }

  return {
    key: normalizedKey,
    scale: keyData.scale,
    strength: keyData.strength,
  };
};

const analyzeEnergy = async (signalVector) => {
  const es = await initEssentia();
  const dynamicComplexity = es.DynamicComplexity(signalVector);
  const energy = es.Energy(signalVector);

  return {
    dynamicComplexity: dynamicComplexity.dynamics,
    energy: energy.energy,
    energyRatio: dynamicComplexity.dynamics,
  };
};

const analyzeInstrumentation = async (signalVector) => {
  const es = await initEssentia();

  const highEnergy = es.EnergyBandPass(signalVector, 2000, 10000, SAMPLE_RATE);
  const lowEnergy = es.EnergyBandPass(signalVector, 20, 250, SAMPLE_RATE);

  const highRatio = highEnergy.energyBandPass / (lowEnergy.energyBandPass + 0.0001);
  const instrumentation = [];

  if (lowEnergy.energyBandPass > 0.01) {
    instrumentation.push('bass');
  }
  if (highRatio > 0.5) {
    instrumentation.push('bright');
  }
  if (highEnergy.energyBandPass > 0.005) {
    instrumentation.push('treble');
  }

  highEnergy.delete();
  lowEnergy.delete();

  return instrumentation;
};

const detectMood = async (bpm, key, energyLevel, detectedGenres) => {
  if (!genAI) {
    return inferMoodFromAudio(bpm, key, energyLevel);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Based on the following audio analysis data, suggest a mood/tone for the track.
Return ONLY a single mood adjective from this list: aggressive, calm, cheerful, dark, dreamy, energetic, ethereal, groovy, happy, melancholy, mysterious, nostalgic, passionate, peaceful, powerful, reflective, tense, uplifting

Audio data:
- BPM: ${bpm}
- Key: ${key}
- Energy level: ${energyLevel}
- Detected genres: ${detectedGenres.join(', ') || 'unknown'}

Respond with just the mood word, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const mood = response.text().trim().toLowerCase();

    const validMoods = [
      'aggressive', 'calm', 'cheerful', 'dark', 'dreamy', 'energetic',
      'ethereal', 'groovy', 'happy', 'melancholy', 'mysterious', 'nostalgic',
      'passionate', 'peaceful', 'powerful', 'reflective', 'tense', 'uplifting'
    ];

    if (validMoods.includes(mood)) {
      return mood;
    }

    return inferMoodFromAudio(bpm, key, energyLevel);
  } catch (error) {
    console.error('Gemini mood detection failed:', error.message);
    return inferMoodFromAudio(bpm, key, energyLevel);
  }
};

const inferMoodFromAudio = (bpm, key, energyLevel) => {
  if (bpm > 140) return 'energetic';
  if (bpm > 120) return 'groovy';
  if (bpm < 80) return 'calm';

  const minor = key.includes('m') || key === 'N/A';

  if (energyLevel > 0.7) return minor ? 'dark' : 'powerful';
  if (energyLevel > 0.4) return minor ? 'melancholy' : 'cheerful';
  return minor ? 'peaceful' : 'uplifting';
};

const suggestGenres = async (metadata) => {
  if (!genAI) {
    return inferGenresFromAudio(metadata);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Based on the following audio analysis data, suggest 2-3 music genres for this track.
Return ONLY a comma-separated list of genre names (e.g., "electronic, ambient, lo-fi").

Audio data:
- BPM: ${metadata.bpm || 'unknown'}
- Key: ${metadata.key || 'unknown'}
- Energy level: ${metadata.energy || 'unknown'}
- Instrumentation: ${metadata.instrumentation?.join(', ') || 'unknown'}
- Mood: ${metadata.mood || 'unknown'}

Respond with 2-3 genre names only, comma-separated.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const genres = response.text().trim().split(',').map(g => g.trim()).filter(Boolean);

    return genres.slice(0, 3);
  } catch (error) {
    console.error('Gemini genre suggestion failed:', error.message);
    return inferGenresFromAudio(metadata);
  }
};

const inferGenresFromAudio = (metadata) => {
  const { bpm, key, energy } = metadata;
  const genres = [];

  if (bpm > 130) {
    genres.push('electronic');
    if (energy > 0.6) genres.push('edm');
  } else if (bpm > 100) {
    genres.push('hip-hop');
    genres.push('r&b');
  } else if (bpm < 80) {
    genres.push('ambient');
    genres.push('lo-fi');
  } else {
    genres.push('indie');
    genres.push('alternative');
  }

  if (key?.includes('m') && energy < 0.5) {
    genres.push('dark');
  }

  return genres.slice(0, 3);
};

const getMixFeedback = async (audioUrl, userQuestion) => {
  if (!genAI) {
    throw ApiError.serviceUnavailable('AI service is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a professional audio engineer providing mix feedback.
The user has uploaded an audio track and is asking for feedback on the mix.

Their question: "${userQuestion}"

Provide constructive, specific feedback about the mix. Include suggestions for:
- Balance (volume levels between instruments)
- Frequency issues (muddy bass, harsh highs, etc.)
- Stereo field (mono compatibility, panning)
- Dynamics (compression, limiting, loudness)

Keep your response concise but helpful (2-4 paragraphs).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini mix feedback failed:', error.message);
    throw ApiError.internal('Failed to generate mix feedback');
  }
};

const streamLyrics = async function* (genre, mood, context, style = 'verse-chorus') {
  if (!genAI) {
    throw ApiError.serviceUnavailable('AI service is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a creative songwriter helping write lyrics.
Write original song lyrics in ${style} format.

Context:
- Genre: ${genre || 'pop'}
- Mood/Tone: ${mood || 'uplifting'}
- Theme/Story: ${context || 'life and growth'}

Write creative, original lyrics. Format verses with [Verse], choruses with [Chorus], etc.
Do not write anything in quotes - just the lyrics themselves.
Keep it concise - 2 verses and 1 chorus minimum.`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error('Gemini lyric streaming failed:', error.message);
    throw ApiError.internal('Failed to generate lyrics');
  }
};

const analyzeTrack = async (audioUrl) => {
  if (!genAI) {
    throw ApiError.serviceUnavailable('AI service requires Gemini API key');
  }

  await initEssentia();

  console.log(`Analyzing track: ${audioUrl}`);

  const audioBuffer = await fetchAudioBuffer(audioUrl);
  const signalVector = await decodeAudioToMono(audioBuffer);

  const [bpmResult, keyResult, energyResult] = await Promise.all([
    analyzeBPM(signalVector),
    analyzeKey(signalVector),
    analyzeEnergy(signalVector),
  ]);

  const instrumentation = await analyzeInstrumentation(signalVector);

  signalVector.delete();

  const bpm = bpmResult.bpm;
  const key = keyResult.key;
  const energyLevel = Math.min(energyResult.energyRatio, 1);

  const [mood, detectedGenres] = await Promise.all([
    detectMood(bpm, key, energyLevel, []),
    suggestGenres({ bpm, key, energy: energyLevel, instrumentation, mood: null }),
  ]);

  console.log(`Analysis complete - BPM: ${bpm}, Key: ${key}, Mood: ${mood}, Genres: ${detectedGenres.join(', ')}`);

  return {
    bpm,
    key,
    mood,
    detectedGenres,
    energy: Math.round(energyLevel * 100) / 100,
    instrumentation,
  };
};

module.exports = {
  initEssentia,
  analyzeTrack,
  detectMood,
  suggestGenres,
  getMixFeedback,
  streamLyrics,
};
