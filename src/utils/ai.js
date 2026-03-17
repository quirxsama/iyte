import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
import https from 'https';

config();

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

export async function askGemini(promptText, imageUrl = null, mimeType = null) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return "Sistemde Gemini API Key tanımlı değil. (Lütfen .env dosyasına ekleyin)";
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const modelName = 'gemini-3.1-flash-lite-preview'; // Fallback incase 3.1 preview throws 404/not available.
        let currentModel = 'gemini-3-flash-preview';

        let contents = [{
             role: 'user',
             parts: [{ text: promptText }]
        }];

        if (imageUrl && mimeType) {
            const imageBuffer = await downloadImage(imageUrl);
            contents[0].parts.push({
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType
                }
            });
        }

        try {
            const response = await ai.models.generateContent({
                model: currentModel,
                contents: contents,
            });
            return response.text;
        } catch(e) {
            console.error(`Gemini 3.1 Hatası, fallback deneniyor:`, e.message);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: contents,
            });
            return response.text;
        }

    } catch (error) {
        console.error("Gemini AI Hatası:", error);
        throw error;
    }
}

export function generatePersonaPrompt(userStats, basePrompt) {
    const daysLeft = userStats.yksDaysLeft ? `Sınava ${userStats.yksDaysLeft} gün kaldı` : "Sınav yaklaşıyor";

    let statsContext = `Öğrencinin İstatistikleri:
- Hedefi: YKS (İYTE kazanmak istiyor)
- ${daysLeft}
- Günlük Zinciri (Chain): ${userStats.chain || 0}. gününde!
- Bugüne kadar toplam çalıştığı süre: ${userStats.totalStudyTime || 0} dakika
- Bekleyen To-Do Görevleri: ${userStats.pendingTodos || 0}
- Tamamlanan To-Do Görevleri: ${userStats.completedTodos || 0}
- Tekrar Edilmesi Gereken Konular (Bugün): ${userStats.dueReviews || 0}
`;

    return `Sen asabi, biraz sinirli ama öğrencisini çok seven, başarılı olmasını isteyen ve onu motive eden, oldukça sert ama yeri gelince şefkatli bir YKS hazırlık öğretmenisin (Hoca). Her cevabında bunu hissettirmelisin. Türkçe konuşuyorsun.
LÜTFEN DİKKAT: Yanıtlarında KESİNLİKLE LaTeX formatında matematiksel ifadeler (örn. $a \\cdot b = -6$, \\( \\), \\[ \\], $$) KULLANMA. Matematiksel işlemleri Discord'un desteklediği düz metin formatında yaz (örneğin çarpma için *, üslü sayılar için x^2 veya x³, kök için √ kullan. Kesinlikle \\cdot, \\frac, \\sqrt gibi LaTeX komutları veya $ işaretleri ile sarmalanmış bloklar kullanma).
İşte öğrencinin durumu:
${statsContext}

Görev: ${basePrompt}`;
}
