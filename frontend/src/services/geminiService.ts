
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from "../utils/blob";

/**
 * Initializes and returns a GoogleGenAI instance.
 * Throws an error if the API key is not available.
 */
const getGenAI = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set. Please ensure it is configured.");
        throw new Error("API_KEY is not configured.");
    }
    return new GoogleGenAI({ apiKey });
}

export async function analyzePerformanceNotes(notes: string): Promise<{ title: string; summary: string; }> {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `다음은 한 음악가의 연습 노트입니다. 이 노트를 바탕으로 연습 기록을 위한 창의적인 제목과 짧고 격려가 되는 요약을 생성해주세요. 노트 내용: "${notes}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "연습 세션을 위한 창의적이고 간결한 제목."
                        },
                        summary: {
                            type: Type.STRING,
                            description: "노트에 기술된 연습 세션에 대한 짧고 격려가 되는 요약 (1-2 문장)."
                        }
                    },
                    required: ["title", "summary"]
                },
            },
        });
        
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed && typeof parsed.title === 'string' && typeof parsed.summary === 'string') {
            return parsed;
        } else {
            throw new Error("Invalid JSON structure received from API.");
        }
        
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("AI 분석을 가져오는데 실패했습니다. 다시 시도해주세요.");
    }
}


export async function analyzeAudioForPlayingTime(audioBlob: Blob): Promise<{ playingTimeInSeconds: number }> {
    try {
        const ai = getGenAI();
        const audioBase64 = await blobToBase64(audioBlob);
        
        const audioPart = {
            inlineData: {
                mimeType: audioBlob.type,
                data: audioBase64,
            },
        };

        const textPart = {
            text: `이 오디오 파일은 악기 연주 녹음입니다. 전체 녹음 시간 중에서 실제 악기 소리가 나는 '순수 연주 시간'만 분석하여 총 몇 초인지 알려주세요. 연주 사이의 침묵, 말소리, 기침 소리 등은 모두 제외해야 합니다. 결과는 'playingTimeInSeconds'라는 키를 가진 JSON 객체 형태로, 값은 숫자로만 반환해주세요.`
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [audioPart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        playingTimeInSeconds: {
                            type: Type.INTEGER,
                            description: "침묵과 비연주 소리를 제외한 실제 연주 시간(초)."
                        }
                    },
                    required: ["playingTimeInSeconds"]
                },
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed && typeof parsed.playingTimeInSeconds === 'number') {
            return parsed;
        } else {
            throw new Error("Invalid JSON structure from Gemini API for audio analysis.");
        }
        
    } catch (error) {
        console.error("Error calling Gemini API for audio analysis:", error);
        throw new Error("AI 연주 시간 분석에 실패했습니다.");
    }
}