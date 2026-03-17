import pkg from 'discord.js';
const { EmbedBuilder } = pkg;

// Zaman formatlama yardımcıları
export function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} saniye`);
    
    return parts.join(' ');
}

export function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours} saat ${mins} dakika`;
    }
    return `${mins} dakika`;
}

// Embed oluşturucular
export function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setColor(0x2ecc71)
        .setTimestamp();
}

export function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setColor(0xe74c3c)
        .setTimestamp();
}

export function createInfoEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setColor(0x3498db)
        .setTimestamp();
}

export function createWarningEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setColor(0xf39c12)
        .setTimestamp();
}

// Voice log embed
export function createVoiceLogEmbed(user, channelName, durationSeconds) {
    const duration = formatDuration(durationSeconds);
    
    return new EmbedBuilder()
        .setTitle('🎤 Ses Kanalı Oturumu')
        .setDescription(`👤 <@${user.id}> ses kanalından ayrıldı`)
        .addFields(
            { name: '📍 Kanal', value: `🔊 ${channelName}`, inline: true },
            { name: '⏱️ Süre', value: duration, inline: true }
        )
        .setColor(0x9b59b6)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
}

// Todo embed
export function createTodoEmbed(content, status = 'pending') {
    let color, statusText, emoji;
    
    switch (status) {
        case 'completed':
            color = 0x2ecc71;
            statusText = 'Tamamlandı';
            emoji = '✅';
            break;
        case 'failed':
            color = 0xe74c3c;
            statusText = 'Başarısız';
            emoji = '❌';
            break;
        default:
            color = 0xf39c12;
            statusText = 'Beklemede';
            emoji = '📝';
    }
    
    return new EmbedBuilder()
        .setTitle(`${emoji} Yapılacak`)
        .setDescription(content)
        .addFields({ name: 'Durum', value: statusText, inline: true })
        .setColor(color)
        .setTimestamp();
}

// Chain embed
export function createChainEmbed(chainCount, bestChain, lastUpdate, broken = false) {
    if (broken) {
        return new EmbedBuilder()
            .setTitle('💔 Zincir Kırıldı!')
            .setDescription('Zincirin sıfırlandı. Yeni bir başlangıç yap!')
            .addFields(
                { name: '🏆 En İyi Zincirinr', value: `${bestChain} gün`, inline: true }
            )
            .setColor(0xe74c3c)
            .setTimestamp();
    }
    
    let emoji = '🔗';
    if (chainCount >= 30) emoji = '🔥';
    else if (chainCount >= 14) emoji = '⚡';
    else if (chainCount >= 7) emoji = '💪';
    
    return new EmbedBuilder()
        .setTitle(`${emoji} Zincir Güncellendi!`)
        .setDescription(`Harika gidiyorsun! Zincirini sürdürmeye devam et!`)
        .addFields(
            { name: '🔗 Mevcut Zincir', value: `${chainCount} gün`, inline: true },
            { name: '🏆 En İyi Zincir', value: `${bestChain} gün`, inline: true },
            { name: '📅 Son Güncelleme', value: lastUpdate, inline: true }
        )
        .setColor(0x2ecc71)
        .setTimestamp();
}

// Stats embed
export function createStatsEmbed(user, stats) {
    const embed = new EmbedBuilder()
        .setTitle(`📊 ${user.username} İstatistikleri`)
        .setThumbnail(user.displayAvatarURL())
        .setColor(0x3498db)
        .setTimestamp();
    
    // Ses istatistikleri
    if (stats.voiceTime !== undefined) {
        embed.addFields({
            name: '🎤 Toplam Ses Süresi',
            value: formatDuration(stats.voiceTime),
            inline: true
        });
    }
    
    // Chain istatistikleri
    if (stats.chain) {
        embed.addFields(
            { name: '🔗 Mevcut Zincir', value: `${stats.chain.current} gün`, inline: true },
            { name: '🏆 En İyi Zincir', value: `${stats.chain.best} gün`, inline: true }
        );
    }
    
    // Ders çalışma istatistikleri
    if (stats.studyTime !== undefined) {
        embed.addFields({
            name: '📚 Toplam Ders Süresi',
            value: formatMinutes(stats.studyTime),
            inline: true
        });
    }
    
    if (stats.todayStudy !== undefined) {
        embed.addFields({
            name: '📖 Bugün Çalışılan',
            value: formatMinutes(stats.todayStudy),
            inline: true
        });
    }
    
    // Todo istatistikleri
    if (stats.todos) {
        const completionRate = stats.todos.total > 0 
            ? Math.round((stats.todos.completed / stats.todos.total) * 100) 
            : 0;
        
        embed.addFields(
            { 
                name: '✅ To-Do Durumu', 
                value: `${stats.todos.completed}/${stats.todos.total} tamamlandı (${completionRate}%)`, 
                inline: true 
            },
            { 
                name: '❌ Başarısız', 
                value: `${stats.todos.failed}`, 
                inline: true 
            }
        );
    }
    
    return embed;
}
