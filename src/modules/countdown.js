import { EmbedBuilder } from 'discord.js';
import { getRandomQuote } from './motivationalQuotes.js';
import { getAllGuildsWithCountdown } from '../database/db.js';

// YKS Tarihi: 20 Haziran 2026
const YKS_DATE = new Date('2026-06-20T10:00:00+03:00');

// MSÜ Tarihi: 1 Mart 2026, 10:15
const MSU_DATE = new Date('2026-03-01T10:15:00+03:00');

export function getDaysUntilYKS() {
    const now = new Date();
    const diffTime = YKS_DATE - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

export function getDaysUntilMSU() {
    const now = new Date();
    const diffTime = MSU_DATE - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

export function createCountdownEmbed() {
    const daysLeft = getDaysUntilYKS();
    const quote = getRandomQuote();
    
    let title, color;
    
    if (daysLeft > 100) {
        title = `⏰ YKS Yaklaşıyor TikTak (${daysLeft} gün kaldı!)`;
        color = 0x3498db; // Mavi
    } else if (daysLeft > 30) {
        title = `⏰ YKS Yaklaşıyor TikTak (${daysLeft} gün kaldı!)`;
        color = 0xf39c12; // Turuncu
    } else if (daysLeft > 7) {
        title = `🔥 YKS Yaklaşıyor TikTak (${daysLeft} gün kaldı!)`;
        color = 0xe74c3c; // Kırmızı
    } else if (daysLeft > 0) {
        title = `⚡ YKS Yaklaşıyor TikTak (${daysLeft} gün kaldı!)`;
        color = 0x9b59b6; // Mor
    } else if (daysLeft === 0) {
        title = `🎯 BUGÜN YKS GÜNÜ! TikTak Bitti!`;
        color = 0x2ecc71; // Yeşil
    } else {
        title = `✅ YKS Tamamlandı!`;
        color = 0x95a5a6; // Gri
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(quote)
        .setColor(color)
        .setFooter({ text: '🎓 İYTE hedefine doğru!' })
        .setTimestamp();
    
    if (daysLeft > 0) {
        const weeks = Math.floor(daysLeft / 7);
        const months = Math.floor(daysLeft / 30);
        const hours = daysLeft * 24;
        
        embed.addFields(
            { name: '📆 Hafta', value: `${weeks} hafta`, inline: true },
            { name: '📅 Ay', value: `${months} ay`, inline: true },
            { name: '⏱️ Saat', value: `${hours.toLocaleString()} saat`, inline: true },
            { name: '🎯 YKS Tarihi', value: '20 Haziran 2026', inline: false }
        );
    }
    
    return embed;
}

export function createMSUCountdownEmbed() {
    const daysLeft = getDaysUntilMSU();
    
    let title, color, description;
    
    if (daysLeft > 30) {
        title = `🎖️ MSÜ Yaklaşıyor (${daysLeft} gün kaldı!)`;
        color = 0x2c3e50; // Koyu mavi
        description = '🪖 Askerî Yükseköğretim hedefine doğru hazırlan!';
    } else if (daysLeft > 7) {
        title = `🔥 MSÜ Yaklaşıyor (${daysLeft} gün kaldı!)`;
        color = 0xe67e22; // Turuncu
        description = '⚔️ Son sprint! Her gün önemli!';
    } else if (daysLeft > 0) {
        title = `⚡ MSÜ Çok Yakın! (${daysLeft} gün kaldı!)`;
        color = 0xe74c3c; // Kırmızı
        description = '🎯 Son günleri en verimli şekilde değerlendir!';
    } else if (daysLeft === 0) {
        title = `🎖️ BUGÜN MSÜ GÜNÜ!`;
        color = 0x2ecc71; // Yeşil
        description = '💪 Başarılar! Sen yapabilirsin!';
    } else {
        title = `✅ MSÜ Bitti!`;
        color = 0x95a5a6; // Gri
        description = '🎖️ MSÜ sınavı tamamlandı.';
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: '🎖️ MSÜ 2026' })
        .setTimestamp();
    
    if (daysLeft > 0) {
        const weeks = Math.floor(daysLeft / 7);
        const hours = daysLeft * 24;
        
        embed.addFields(
            { name: '📆 Hafta', value: `${weeks} hafta`, inline: true },
            { name: '⏱️ Saat', value: `${hours.toLocaleString()} saat`, inline: true },
            { name: '🎖️ MSÜ Tarihi', value: '1 Mart 2026, 10:15', inline: false }
        );
    }
    
    return embed;
}

export async function sendDailyCountdown(client) {
    const guilds = getAllGuildsWithCountdown();
    const msuDaysLeft = getDaysUntilMSU();
    
    for (const guildSettings of guilds) {
        try {
            const channel = await client.channels.fetch(guildSettings.countdown_channel_id);
            if (channel) {
                // YKS geri sayımı
                const yksEmbed = createCountdownEmbed();
                await channel.send({ embeds: [yksEmbed] });
                
                // MSÜ geri sayımı (eğer henüz bitmemişse)
                if (msuDaysLeft >= 0) {
                    const msuEmbed = createMSUCountdownEmbed();
                    await channel.send({ embeds: [msuEmbed] });
                }
            }
        } catch (error) {
            console.error(`Geri sayım gönderilemedi (Guild: ${guildSettings.guild_id}):`, error.message);
        }
    }
}
