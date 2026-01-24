import { SlashCommandBuilder } from 'discord.js';
import { 
    getUserTotalVoiceTime, 
    getChain, 
    getUserTotalStudyTime, 
    getTodayStudyTime,
    getUserTodoStats 
} from '../database/db.js';
import { createStatsEmbed } from '../utils/embed.js';

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
    
    // Tüm istatistikleri topla (null = 0)
    const voiceTime = getUserTotalVoiceTime(guildId, userId) || 0;
    const chain = getChain(guildId, userId);
    const studyTime = getUserTotalStudyTime(guildId, userId) || 0;
    const todayStudy = getTodayStudyTime(guildId, userId) || 0;
    const todoStats = getUserTodoStats(guildId, userId);
    
    const stats = {
        voiceTime,
        chain: chain ? {
            current: chain.chain_count || 0,
            best: chain.best_chain || 0
        } : { current: 0, best: 0 },
        studyTime,
        todayStudy,
        todos: {
            total: todoStats?.total || 0,
            completed: todoStats?.completed || 0,
            failed: todoStats?.failed || 0,
            pending: todoStats?.pending || 0
        }
    };
    
    const embed = createStatsEmbed(targetUser, stats);
    await interaction.reply({ embeds: [embed] });
}
