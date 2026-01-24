import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserDetailedStats } from '../database/db.js';
import { formatDuration, formatMinutes } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('istatistik')
    .setDescription('Kullanıcı istatistiklerini görüntüle')
    .addUserOption(option =>
        option
            .setName('kullanıcı')
            .setDescription('İstatistiklerini görmek istediğin kullanıcı (boş bırakırsan kendin)')
            .setRequired(false)
    );

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
    const guildId = interaction.guildId;
    const userId = targetUser.id;
    
    const stats = getUserDetailedStats(guildId, userId);
    
    const embed = new EmbedBuilder()
        .setTitle(`📊 ${targetUser.username} Detaylı İstatistikleri`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor(0x3498db)
        .setTimestamp();
    
    // === DERS ÇALIŞMA ===
    let studyValue = `📚 **Toplam:** ${formatMinutes(stats.study.total)}\n`;
    studyValue += `📖 **Bugün:** ${formatMinutes(stats.study.today)}\n`;
    studyValue += `📅 **Dün:** ${formatMinutes(stats.study.yesterday)}\n`;
    studyValue += `📈 **Haftalık Ort.:** ${formatMinutes(stats.study.weeklyAvg)}`;
    
    // Düne göre karşılaştırma
    if (stats.study.yesterday > 0) {
        const diff = stats.study.today - stats.study.yesterday;
        if (diff > 0) {
            studyValue += `\n✅ Düne göre +${formatMinutes(diff)} fazla!`;
        } else if (diff < 0) {
            studyValue += `\n⚠️ Düne göre ${formatMinutes(Math.abs(diff))} az`;
        }
    }
    
    embed.addFields({
        name: '📚 Ders Çalışma',
        value: studyValue,
        inline: true
    });
    
    // === SES KANALI ===
    let voiceValue = '';
    
    // Ders kanalları
    if (stats.voice.studyTotal > 0 || stats.voice.studyToday > 0) {
        voiceValue += `📚 **Ders Kanalı:**\n`;
        voiceValue += `  Toplam: ${formatDuration(stats.voice.studyTotal)}\n`;
        voiceValue += `  Bugün: ${formatDuration(stats.voice.studyToday)}\n\n`;
    }
    
    // Diğer kanallar
    if (stats.voice.otherTotal > 0 || stats.voice.otherToday > 0) {
        voiceValue += `🎮 **Diğer Kanallar:**\n`;
        voiceValue += `  Toplam: ${formatDuration(stats.voice.otherTotal)}\n`;
        voiceValue += `  Bugün: ${formatDuration(stats.voice.otherToday)}\n\n`;
    }
    
    // Genel toplam
    voiceValue += `📊 **Genel Toplam:** ${formatDuration(stats.voice.total)}`;
    
    if (!voiceValue || stats.voice.total === 0) {
        voiceValue = 'Henüz ses kaydı yok';
    }
    
    embed.addFields({
        name: '🎤 Ses Kanalı',
        value: voiceValue,
        inline: true
    });
    
    // === CHAIN ===
    let chainEmoji = '🔗';
    if (stats.chain.current >= 30) chainEmoji = '🔥';
    else if (stats.chain.current >= 14) chainEmoji = '⚡';
    else if (stats.chain.current >= 7) chainEmoji = '💪';
    
    let chainValue = `${chainEmoji} **Mevcut:** ${stats.chain.current} gün\n`;
    chainValue += `🏆 **En İyi:** ${stats.chain.best} gün`;
    if (stats.chain.lastUpdate) {
        chainValue += `\n📅 **Son:** ${stats.chain.lastUpdate}`;
    }
    
    embed.addFields({
        name: '🔗 Zincir (Chain)',
        value: chainValue,
        inline: true
    });
    
    // === TO-DO ===
    const completionBar = createProgressBar(stats.todos.completionRate);
    let todoValue = `✅ **Tamamlanan:** ${stats.todos.completed}\n`;
    todoValue += `❌ **Başarısız:** ${stats.todos.failed}\n`;
    todoValue += `⏳ **Bekleyen:** ${stats.todos.pending}\n`;
    todoValue += `📊 **Toplam:** ${stats.todos.total}\n`;
    todoValue += `\n${completionBar} ${stats.todos.completionRate}%`;
    
    embed.addFields({
        name: '✅ To-Do Durumu',
        value: todoValue,
        inline: true
    });
    
    // === ÖZET PUANI ===
    const score = calculateActivityScore(stats);
    const scoreEmoji = score >= 80 ? '🌟' : score >= 60 ? '⭐' : score >= 40 ? '💫' : '✨';
    
    embed.addFields({
        name: `${scoreEmoji} Aktivite Puanı`,
        value: `**${score}/100**\n${getScoreMessage(score)}`,
        inline: true
    });
    
    // Footer
    embed.setFooter({ text: '🎓 İYTE hedefine doğru!' });
    
    await interaction.reply({ embeds: [embed] });
}

// Progress bar oluştur
function createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// Aktivite puanı hesapla
function calculateActivityScore(stats) {
    let score = 0;
    
    // Ders çalışma (max 40 puan)
    if (stats.study.today >= 360) score += 40;
    else if (stats.study.today >= 240) score += 30;
    else if (stats.study.today >= 120) score += 20;
    else if (stats.study.today >= 60) score += 10;
    else if (stats.study.today > 0) score += 5;
    
    // Chain (max 30 puan)
    if (stats.chain.current >= 30) score += 30;
    else if (stats.chain.current >= 14) score += 20;
    else if (stats.chain.current >= 7) score += 10;
    else if (stats.chain.current >= 3) score += 5;
    
    // To-do tamamlama (max 20 puan)
    score += Math.round(stats.todos.completionRate * 0.2);
    
    // Düne göre gelişim (max 10 puan)
    if (stats.study.today > stats.study.yesterday && stats.study.yesterday > 0) {
        score += 10;
    }
    
    return Math.min(score, 100);
}

// Puan mesajı
function getScoreMessage(score) {
    if (score >= 90) return 'Efsanevi performans! 🏆';
    if (score >= 80) return 'Harika gidiyorsun! 🌟';
    if (score >= 60) return 'İyi iş çıkarıyorsun! 💪';
    if (score >= 40) return 'Gelişmeye devam! 📈';
    if (score >= 20) return 'Daha fazlasını yapabilirsin! 🎯';
    return 'Haydi başla! 🚀';
}
