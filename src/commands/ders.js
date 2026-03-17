import pkg from 'discord.js';
const { SlashCommandBuilder } = pkg;
import { addStudySession, getTodayStudyTime, getYesterdayStudyTime, getLast7DaysStudy, removeStudySession } from '../database/db.js';
import { createSuccessEmbed, createInfoEmbed, formatMinutes } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('ders')
    .setDescription('Ders çalışma süresini kaydet')
    .addSubcommand(subcommand =>
        subcommand
            .setName('ekle')
            .setDescription('Ders çalışma süresi ekle (dakika veya saat:dakika)')
            .addStringOption(option =>
                option
                    .setName('süre')
                    .setDescription('Çalıştığın süre (örn: 90 veya 1:30)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('tarih')
                    .setDescription('Hangi gün için (örn: 15.02.2026 veya 15.02, boş=bugün)')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('kaldir')
            .setDescription('Fazla eklediğin ders çalışma süresini siler')
            .addStringOption(option =>
                option
                    .setName('süre')
                    .setDescription('Silinecek süre (örn: 90 veya 1:30)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('tarih')
                    .setDescription('Hangi gün için (örn: 15.02.2026 veya 15.02, boş=bugün)')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('bugün')
            .setDescription('Bugünkü çalışma süresini göster')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('hafta')
            .setDescription('Son 7 günlük çalışma süresini göster')
    );

// Süre parse fonksiyonu: "90" veya "1:30" formatını dakikaya çevirir
function parseDuration(input) {
    const trimmed = input.trim();
    
    // Saat:Dakika formatı (örn: 1:30, 2:45)
    if (trimmed.includes(':')) {
        const [hours, mins] = trimmed.split(':').map(Number);
        if (isNaN(hours) || isNaN(mins) || hours < 0 || mins < 0 || mins >= 60) {
            return null;
        }
        return (hours * 60) + mins;
    }
    
    // Sadece dakika (örn: 90, 120)
    const minutes = parseInt(trimmed, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
        return null;
    }
    return minutes;
}

// Tarih parse fonksiyonu: "15.02.2026" veya "15.02" formatını YYYY-MM-DD'ye çevirir
function parseDate(input) {
    const trimmed = input.trim();
    const parts = trimmed.split('.');
    
    if (parts.length === 2) {
        // GG.AA formatı - mevcut yılı kullan
        const [day, month] = parts.map(Number);
        if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
            return null;
        }
        const year = new Date().getFullYear();
        const date = new Date(year, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1) return null;
        return date.toISOString().split('T')[0];
    }
    
    if (parts.length === 3) {
        // GG.AA.YYYY formatı
        const [day, month, year] = parts.map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12 || year < 2020 || year > 2030) {
            return null;
        }
        const date = new Date(year, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1) return null;
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    switch (subcommand) {
        case 'ekle': {
            const input = interaction.options.getString('süre');
            const dateInput = interaction.options.getString('tarih');
            const minutes = parseDuration(input);
            
            if (minutes === null) {
                return interaction.reply({
                    content: '❌ Geçersiz süre formatı! Örnek: `90` (dakika) veya `1:30` (saat:dakika)',
                    ephemeral: true
                });
            }
            
            // Tarih parse
            let targetDate = null;
            if (dateInput) {
                targetDate = parseDate(dateInput);
                if (targetDate === null) {
                    return interaction.reply({
                        content: '❌ Geçersiz tarih formatı! Örnek: `15.02.2026` veya `15.02`',
                        ephemeral: true
                    });
                }
            }
            
            // Dünkü süreyi al (karşılaştırma için)
            const yesterdayTotal = getYesterdayStudyTime(guildId, userId);
            const beforeAdd = getTodayStudyTime(guildId, userId);
            
            addStudySession(guildId, userId, minutes, targetDate);
            
            const todayTotal = getTodayStudyTime(guildId, userId);
            
            const embed = createSuccessEmbed(
                'Ders Süresi Eklendi',
                `📚 **${formatMinutes(minutes)}** ders çalışma süresi eklendi!`
            ).addFields({
                name: '📊 Bugünkü Toplam',
                value: formatMinutes(todayTotal),
                inline: true
            });
            
            // Düne göre karşılaştırma
            if (yesterdayTotal > 0) {
                const diff = todayTotal - yesterdayTotal;
                if (diff > 0) {
                    embed.addFields({
                        name: '📈 Düne Göre',
                        value: `+${formatMinutes(diff)} daha fazla çalıştın! 🎉`,
                        inline: true
                    });
                } else if (diff < 0) {
                    embed.addFields({
                        name: '📉 Düne Göre',
                        value: `${formatMinutes(Math.abs(diff))} daha az. Hadi biraz daha!`,
                        inline: true
                    });
                } else {
                    embed.addFields({
                        name: '📊 Düne Göre',
                        value: 'Dünle aynı seviyedesin!',
                        inline: true
                    });
                }
            }
            
            // Motivasyon mesajı
            if (todayTotal >= 480) { // 8 saat
                embed.addFields({
                    name: '👑 Efsane!',
                    value: 'Bugün 8 saatten fazla çalıştın! Gerçek bir şampiyon!',
                    inline: false
                });
            } else if (todayTotal >= 360) { // 6 saat
                embed.addFields({
                    name: '🏆 Harika!',
                    value: 'Bugün 6 saatten fazla çalıştın! Mükemmel!',
                    inline: false
                });
            } else if (todayTotal >= 180) { // 3 saat
                embed.addFields({
                    name: '💪 İyi Gidiyorsun!',
                    value: 'Bugün 3 saatten fazla çalışma başardın!',
                    inline: false
                });
            }
            
            await interaction.reply({ embeds: [embed] });
            break;
        }
        
        case 'kaldir': {
            const input = interaction.options.getString('süre');
            const dateInput = interaction.options.getString('tarih');
            const minutes = parseDuration(input);
            
            if (minutes === null) {
                return interaction.reply({
                    content: '❌ Geçersiz süre formatı! Örnek: `90` (dakika) veya `1:30` (saat:dakika)',
                    ephemeral: true
                });
            }
            
            // Tarih parse
            let targetDate = null;
            if (dateInput) {
                targetDate = parseDate(dateInput);
                if (targetDate === null) {
                    return interaction.reply({
                        content: '❌ Geçersiz tarih formatı! Örnek: `15.02.2026` veya `15.02`',
                        ephemeral: true
                    });
                }
            }
            
            const result = removeStudySession(guildId, userId, minutes, targetDate);
            
            if (result.changes === 0) {
                return interaction.reply({
                    content: '❌ Belirtilen süre ve tarihte eklenmiş bir ders kaydı bulunamadı!',
                    ephemeral: true
                });
            }
            
            const todayTotal = getTodayStudyTime(guildId, userId);
            
            const embed = createSuccessEmbed(
                'Ders Süresi Silindi',
                `🗑️ **${formatMinutes(minutes)}** ders çalışma süresi silindi.`
            ).addFields({
                name: '📊 Bugünkü Toplam',
                value: formatMinutes(todayTotal),
                inline: true
            });
            
            await interaction.reply({ embeds: [embed] });
            break;
        }
        
        case 'bugün': {
            const todayTotal = getTodayStudyTime(guildId, userId);
            const yesterdayTotal = getYesterdayStudyTime(guildId, userId);
            
            let description = `📚 Bugün toplam **${formatMinutes(todayTotal)}** ders çalıştın.`;
            
            if (yesterdayTotal > 0) {
                const diff = todayTotal - yesterdayTotal;
                if (diff > 0) {
                    description += `\n📈 Düne göre **${formatMinutes(diff)}** daha fazla!`;
                } else if (diff < 0) {
                    description += `\n📉 Düne göre **${formatMinutes(Math.abs(diff))}** daha az.`;
                }
            }
            
            const embed = createInfoEmbed('Bugünkü Çalışma', description);
            
            await interaction.reply({ embeds: [embed] });
            break;
        }
        
        case 'hafta': {
            const last7Days = getLast7DaysStudy(guildId, userId);
            
            if (last7Days.length === 0) {
                const embed = createInfoEmbed(
                    'Haftalık Çalışma',
                    'Son 7 günde kayıtlı ders çalışma süren yok.'
                );
                await interaction.reply({ embeds: [embed] });
                return;
            }
            
            let totalMinutes = 0;
            let description = '```\n';
            
            for (const day of last7Days) {
                totalMinutes += day.total;
                const bar = '█'.repeat(Math.min(Math.floor(day.total / 30), 20));
                description += `${day.date}: ${bar} ${formatMinutes(day.total)}\n`;
            }
            description += '```';
            
            const embed = createInfoEmbed('Son 7 Günlük Çalışma', description)
                .addFields({
                    name: '📊 Toplam',
                    value: formatMinutes(totalMinutes),
                    inline: true
                }, {
                    name: '📈 Günlük Ortalama',
                    value: formatMinutes(Math.round(totalMinutes / last7Days.length)),
                    inline: true
                });
            
            await interaction.reply({ embeds: [embed] });
            break;
        }
    }
}
