import { GoogleGenAI } from "@google/genai";
import { Match, PlayerLevel } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMatchAnalysis = async (match: Match): Promise<string> => {
  const p1 = `${match.teamA.player1.name} (${match.teamA.player1.level})`;
  const p2 = `${match.teamA.player2.name} (${match.teamA.player2.level})`;
  const p3 = `${match.teamB.player1.name} (${match.teamB.player1.level})`;
  const p4 = `${match.teamB.player2.name} (${match.teamB.player2.level})`;

  const prompt = `
    你是一位專業的羽球教練與球評。
    請分析這場雙打對決：
    
    A 隊: ${p1} & ${p2}
    VS
    B 隊: ${p3} & ${p4}

    程度說明:
    - ${PlayerLevel.BEGINNER}: 正在學習基本球路。
    - ${PlayerLevel.INTERMEDIATE}: 懂輪轉，回球穩定。
    - ${PlayerLevel.ADVANCED}: 殺球強，防守好，有戰術意識。
    - ${PlayerLevel.PRO}: 頂尖水準。

    請提供簡短、有趣且具策略性的分析 (最多 150 字)。
    1. 給這場對決一個有趣的「標題」。
    2. 根據程度分析哪一隊較有優勢。
    3. 給「弱勢方」一個關鍵的獲勝策略建議。
    4. 請使用表情符號 (emojis)。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "目前無法產生分析結果。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 教練正在喝水休息中，請稍後再試。";
  }
};