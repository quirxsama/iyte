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
                reportContent = 'Geçtiğimiz hafta pek parlak değildi evlat. Kendini toparlamazsan İYTE sadece bir hayal olur. Şimdi git haftalık eksiklerini kapat!';

                const embed = new EmbedBuilder()
                    .setTitle('📊 Haftalık Hoca Karnesi')
                    .setDescription(reportContent)
                    .setColor(0xe67e22)
                    .addFields(
                        { name: 'Çalışma İstatistikleri', value: `Toplam Ders Süresi: ${stats.study?.total || 0} dk\nGüncel Zincir: ${stats.chain?.current || 0}`, inline: false },
                        { name: 'Görev İstatistikleri', value: `Tamamlanan Görev: ${stats.todos?.completed || 0}\nBekleyen Görev: ${stats.todos?.pending || 0}`, inline: false }
                    )
                    .setFooter({ text: '📉 Her hafta daha iyi olmak zorundasın.' })
                    .setTimestamp();

                await user.send({ embeds: [embed] });
                console.log(`📊 Haftalık karne gönderildi: ${user.username}`);
            } catch (error) {
                console.error(`Haftalık karne gönderilemedi (User: ${userId}):`, error.message);
            }
        }
    }
}
