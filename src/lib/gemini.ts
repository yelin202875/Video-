import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// The API key is injected by the platform into process.env.GEMINI_API_KEY
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateRecapScript = async (transcript: string, videoBase64?: string, videoMimeType?: string, videoUrl?: string) => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a professional Burmese movie recap creator. 
  Your task is to rewrite the provided transcript (and optionally consider the video content or URL) into an engaging, exciting, and storytelling movie recap script in Burmese (Myanmar language).
  
  CRITICAL GUIDELINES:
  1. If a URL is provided, you MUST use the content from that specific URL. 
  2. If you cannot access the content of the URL (e.g., due to privacy settings or login requirements), do NOT hallucinate or make up a story. Instead, clearly state in Burmese that you cannot access the video content.
  3. Language: Burmese (Myanmar).
  4. Tone: Exciting, dramatic, and engaging (like a popular movie recap channel).
  5. Structure: 
     - Hook: Start with a catchy opening.
     - Summary: Summarize the plot clearly but with suspense.
     - Conclusion: End with a thought-provoking question or a call to action.
  6. Formatting: Use clear paragraphs.
  7. Content: Focus on the most important and exciting parts of the movie.`;

  const parts: any[] = [];
  
  if (transcript) {
    parts.push({ text: `Here is the transcript: ${transcript}` });
  }
  
  if (videoUrl) {
    parts.push({ text: `Please analyze the video at this URL: ${videoUrl}` });
  }
  
  if (videoBase64 && videoMimeType) {
    parts.push({
      inlineData: {
        data: videoBase64,
        mimeType: videoMimeType
      }
    });
  }

  const response = await genAI.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
      temperature: 0.7,
      tools: videoUrl ? [{ urlContext: {} }] : undefined,
    },
  });

  return response.text;
};

export const generateAudio = async (text: string) => {
  // Using gemini-2.5-flash-preview-tts for audio generation
  const model = "gemini-2.5-flash-preview-tts";
  
  const response = await genAI.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Read this movie recap script in an exciting and engaging tone: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is generally good for storytelling
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;

  // The TTS model returns raw PCM data (16-bit, 24kHz). 
  // We need to wrap it in a WAV header so the browser can play it.
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PCM to WAV conversion
  const wavHeader = createWavHeader(len, 24000);
  const wavBuffer = new Uint8Array(wavHeader.length + len);
  wavBuffer.set(wavHeader);
  wavBuffer.set(bytes, wavHeader.length);

  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

function createWavHeader(dataLength: number, sampleRate: number) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + dataLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, 1, true);
  // channel count (mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataLength, true);

  return new Uint8Array(header);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
