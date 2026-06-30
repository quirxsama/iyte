import pkg from 'discord.js';
const { EmbedBuilder } = pkg;
import { getAllUsersStats, getUserDetailedStats } from '../database/db.js';

export async function sendMorningMessages(client) {
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

                let messageContent = '';
                messageContent = 'Günaydın. Kalk ve çalışmaya başla. İYTE seni bekliyor, uyumaya devam edersen başkaları kazanacak.';

                const embed = new EmbedBuilder()
                    .setTitle('🌅 Hoca\'dan Sabah Mesajı')
                    .setDescription(messageContent)
                    .setColor(0xf1c40f)
                    .setFooter({ text: '🎓 Kalk, çalış ve kazan!' })
                    .setTimestamp();

                await user.send({ embeds: [embed] });
                console.log(`🌅 Sabah günaydın mesajı gönderildi: ${user.username}`);
            } catch (error) {
                console.error(`Sabah mesajı gönderilemedi (User: ${userId}):`, error.message);
            }
        }
    }
}
