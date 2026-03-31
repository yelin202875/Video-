import { GoogleGenAI, Modality } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateRecapScript = async (
  transcript: string,
  videoBase64?: string,
  videoMimeType?: string,
  videoUrl?: string
) => {
  const model = "gemini-2.5-flash-preview";

  const systemInstruction = `You are a professional Burmese movie recap creator.
  Your task is to rewrite the provided transcript (and optionally consider the video content or URL) into an engaging, exciting, and storytelling movie recap script in Burmese (Myanmar language).

  CRITICAL GUIDELINES:
  1. If a URL is provided, you MUST access and use the content from that specific URL.
  2. For Facebook URLs (facebook.com, fb.watch): Access the video directly and extract all dialogue, narration, and story content.
  3. For YouTube URLs: Access the video and extract all relevant content.
  4. If you cannot access the content due to privacy settings or login requirements, clearly state in Burmese that you cannot access the video.
  5. Language: Burmese (Myanmar).
  6. Tone: Exciting, dramatic, and engaging (like a popular movie recap channel).
  7. Structure:
     - Hook: Start with a catchy opening.
     - Summary: Summarize the plot clearly but with suspense.
     - Conclusion: End with a thought-provoking question or a call to action.
  8. Formatting: Use clear paragraphs.
  9. Content: Focus on the most important and exciting parts of the movie.`;

  const parts: any[] = [];

  if (transcript) {
    parts.push({ text: `Here is the transcript: ${transcript}` });
  }

  if (videoUrl) {
    const isFacebook =
      videoUrl.includes("facebook.com") ||
      videoUrl.includes("fb.watch") ||
      videoUrl.includes("fb.com");

    if (isFacebook) {
      parts.push({
        text: `Please directly access and analyze this Facebook video URL: ${videoUrl}\nExtract all dialogue, narration, story content, and create a full recap from it.`,
      });
    } else {
      parts.push({
        text: `Please access and analyze the video at this URL: ${videoUrl}`,
      });
    }
  }

  if (videoBase64 && videoMimeType) {
    parts.push({
      inlineData: {
        data: videoBase64,
        mimeType: videoMimeType,
      },
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

// Male voices: Charon, Fenrir, Orus, Puck
// Female voices: Kore, Aoede, Leda, Zephyr
export const generateAudio = async (
  text: string,
  voiceName: string = "Charon"
) => {
  const model = "gemini-2.5-flash-preview-tts";

  const response = await genAI.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            text: `Read this movie recap script in an exciting and engaging tone: ${text}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;

  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = createWavHeader(len, 24000);
  const wavBuffer = new Uint8Array(wavHeader.length + len);
  wavBuffer.set(wavHeader);
  wavBuffer.set(bytes, wavHeader.length);

  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
};

function createWavHeader(dataLength: number, sampleRate: number) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  return new Uint8Array(header);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
