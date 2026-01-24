import { SlashCommandBuilder } from 'discord.js';
import { addStudySession, getTodayStudyTime, getLast7DaysStudy } from '../database/db.js';
import { createSuccessEmbed, createInfoEmbed, formatMinutes } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('ders')
    .setDescription('Ders çalışma süresini kaydet')
    .addSubcommand(subcommand =>
        subcommand
            .setName('ekle')
            .setDescription('Ders çalışma süresi ekle')
            .addIntegerOption(option =>
                option
                    .setName('dakika')
                    .setDescription('Çalıştığın süre (dakika)')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(1440)
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

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    switch (subcommand) {
        case 'ekle': {
            const minutes = interaction.options.getInteger('dakika');
            addStudySession(guildId, userId, minutes);
            
            const todayTotal = getTodayStudyTime(guildId, userId);
            
            const embed = createSuccessEmbed(
                'Ders Süresi Eklendi',
                `📚 **${formatMinutes(minutes)}** ders çalışma süresi eklendi!`
            ).addFields({
                name: '📊 Bugünkü Toplam',
                value: formatMinutes(todayTotal),
                inline: true
            });
            
            // Motivasyon mesajı
            if (todayTotal >= 360) { // 6 saat
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
        
        case 'bugün': {
            const todayTotal = getTodayStudyTime(guildId, userId);
            
            const embed = createInfoEmbed(
                'Bugünkü Çalışma',
                `📚 Bugün toplam **${formatMinutes(todayTotal)}** ders çalıştın.`
            );
            
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
