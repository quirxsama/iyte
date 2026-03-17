import pkg from 'discord.js';
const { EmbedBuilder } = pkg;
import { getAllUsersStats, getUserDetailedStats } from '../database/db.js';

export async function sendWeeklyReports(client) {
    let yksDaysLeft = 0;
    try {
        const { getDaysUntilYKS } = await import('./countdown.js');
        yksDaysLeft = getDaysUntilYKS();
    } catch(e) {}

    for (const guild of client.guilds.cache.values()) {
        const userIds = getAllUsersStats(guild.id);

        for (const userId of userIds) {
            try {
                const user = await client.users.fetch(userId);
                if (!user) continue;

                const stats = getUserDetailedStats(guild.id, userId);

                let reportContent = '';
                try {
                    const { askGemini, generatePersonaPrompt } = await import('../utils/ai.js');
                    const prompt = generatePersonaPrompt({
                        chain: stats.chain?.current,
                        yksDaysLeft: yksDaysLeft,
                        totalStudyTime: stats.study?.total,
                        pendingTodos: stats.todos?.pending,
                        completedTodos: stats.todos?.completed
                    }, `Bugün Pazar günü. Bu öğrenciye haftalık bir "Karne" (haftalık değerlendirme raporu) ver. Geçen hafta gösterdiği performansa dair, özellikle tamamlanmayan görevler, toplam çalışma süresi, chain sayısını yorumla. Çok sert, yüzüne vuran ama sonunda toparlaması için sertçe motive eden bir dille konuş.`);

                    const aiReport = await askGemini(prompt);
                    if (aiReport && !aiReport.includes("Sistemde Gemini API Key tanımlı değil")) {
                        reportContent = aiReport;
                    } else {
                        throw new Error('Gemini fallback');
                    }
                } catch(e) {
                    reportContent = 'Geçtiğimiz hafta pek parlak değildi evlat. Kendini toparlamazsan İYTE sadece bir hayal olur. Şimdi git haftalık eksiklerini kapat!';
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 Haftalık Hoca Karnesi')
                    .setDescription(reportContent)
                    .setColor(0xe67e22)
                    .addFields(
                        { name: 'Çalışma İstatistikleri', value: `Toplam Ders Süresi: ${stats.study?.total || 0} dk\nGüncel Zincir: ${stats.chain?.current || 0}`, inline: false },
                        { name: 'Görev İstatistikleri', value: `Tamamlanan Görev: ${stats.todos?.completed || 0}\nBekleyen Görev: ${stats.todos?.pending || 0}`, inline: false }
                    )
                    .setFooter({ text: '📉 Her hafta daha iyi olmak zorundasın. | Yapay Zeka Destekli' })
                    .setTimestamp();

                await user.send({ embeds: [embed] });
                console.log(`📊 Haftalık karne gönderildi: ${user.username}`);
            } catch (error) {
                console.error(`Haftalık karne gönderilemedi (User: ${userId}):`, error.message);
            }
        }
    }
}
