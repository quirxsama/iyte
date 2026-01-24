import { EmbedBuilder } from 'discord.js';
import { 
    getAllUsersStats, 
    getUserDetailedStats,
    getGuildSettings 
} from '../database/db.js';
import { formatDuration, formatMinutes } from '../utils/embed.js';

// Günlük özet embed'i oluştur (tüm kullanıcılar için)
export function createDailySummaryEmbed(guildId, client) {
    const userIds = getAllUsersStats(guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Günlük Sunucu İstatistikleri')
        .setDescription('Dünkü aktivite özeti')
        .setColor(0x3498db)
        .setTimestamp();
    
    if (userIds.length === 0) {
        embed.setDescription('Henüz kayıtlı kullanıcı verisi yok.');
        return embed;
    }
    
    // Her kullanıcı için istatistik topla
    const userStats = [];
    
    for (const userId of userIds) {
        const stats = getUserDetailedStats(guildId, userId);
        
        // Sadece aktif kullanıcıları dahil et (en az bir aktivitesi olanlar)
        if (stats.study.yesterday > 0 || stats.voice.today > 0 || stats.chain.current > 0) {
            userStats.push({
                userId,
                stats
            });
        }
    }
    
    // Ders çalışma süresine göre sırala
    userStats.sort((a, b) => b.stats.study.yesterday - a.stats.study.yesterday);
    
    // Top 10 kullanıcıyı göster
    const topUsers = userStats.slice(0, 10);
    
    if (topUsers.length === 0) {
        embed.setDescription('Dün aktif kullanıcı bulunamadı.');
        return embed;
    }
    
    let leaderboard = '';
    let index = 1;
    
    for (const { userId, stats } of topUsers) {
        const medal = index === 1 ? '🥇' : index === 2 ? '🥈' : index === 3 ? '🥉' : `${index}.`;
        
        let userLine = `${medal} <@${userId}>`;
        
        if (stats.study.yesterday > 0) {
            userLine += ` 📚 ${formatMinutes(stats.study.yesterday)}`;
        }
        if (stats.chain.current > 0) {
            userLine += ` 🔗 ${stats.chain.current} gün`;
        }
        
        leaderboard += userLine + '\n';
        index++;
    }
    
    embed.addFields({
        name: '🏆 Dünkü En Çalışkanlar',
        value: leaderboard || 'Veri yok',
        inline: false
    });
    
    // Sunucu toplamları
    const totalStudy = userStats.reduce((sum, u) => sum + u.stats.study.yesterday, 0);
    const totalVoice = userStats.reduce((sum, u) => sum + u.stats.voice.total, 0);
    const avgStudy = userStats.length > 0 ? Math.round(totalStudy / userStats.length) : 0;
    
    embed.addFields(
        { name: '📚 Toplam Çalışma', value: formatMinutes(totalStudy), inline: true },
        { name: '📈 Kullanıcı Ortalaması', value: formatMinutes(avgStudy), inline: true },
        { name: '👥 Aktif Kullanıcı', value: `${userStats.length} kişi`, inline: true }
    );
    
    return embed;
}

// Günlük istatistikleri gönder
export async function sendDailyStats(client) {
    // Tüm sunucuları kontrol et
    for (const guild of client.guilds.cache.values()) {
        const settings = getGuildSettings(guild.id);
        
        // İstatistik kanalı ayarlanmışsa gönder (countdown kanalını kullan şimdilik)
        if (settings?.countdown_channel_id) {
            try {
                const channel = await client.channels.fetch(settings.countdown_channel_id);
                if (channel) {
                    const embed = createDailySummaryEmbed(guild.id, client);
                    await channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error(`Günlük istatistik gönderilemedi (Guild: ${guild.id}):`, error.message);
            }
        }
    }
}
