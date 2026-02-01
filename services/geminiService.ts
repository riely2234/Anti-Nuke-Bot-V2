
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, SafetySetting, Chat } from "@google/genai";

const getAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("The API_KEY is missing. Please provide a valid API key.");
    }
    return new GoogleGenAI({ apiKey });
}

export const startChatSession = (apiKey: string, model: string, systemInstruction: string): Chat => {
    const ai = getAiClient(apiKey);
    
    // Safety settings are permanently set to BLOCK_NONE for an unfiltered experience.
    const safetySettings: SafetySetting[] = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ];

    const chat = ai.chats.create({
        model: model,
        config: {
            safetySettings: safetySettings,
            systemInstruction: systemInstruction,
        },
        // The chat history is managed by the Chat instance, so we don't pass it here.
    });

    return chat;
};
