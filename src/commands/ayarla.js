import pkg from 'discord.js';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = pkg;
import { 
    updateGuildChannel, 
    getGuildSettings, 
    addTodoChannel, 
    removeTodoChannel, 
    getTodoChannels,
    addStudyVoiceChannel,
    removeStudyVoiceChannel,
    getStudyVoiceChannels
} from '../database/db.js';
import { createSuccessEmbed, createInfoEmbed, createErrorEmbed } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('ayarla')
    .setDescription('Bot kanal ayarlarını yapılandır')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('yks')
            .setDescription('YKS geri sayım kanalını ayarla')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('Geri sayımın gönderileceği kanal')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ses-log')
            .setDescription('Ses log kanalını ayarla')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('Ses loglarının gönderileceği kanal')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('todo-ekle')
            .setDescription('To-do kanalı ekle (birden fazla kanal eklenebilir)')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('To-do mesajlarının alınacağı kanal')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('todo-kaldir')
            .setDescription('To-do kanalını kaldır')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('Kaldırılacak to-do kanalı')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ders-ses-ekle')
            .setDescription('Ders ses kanalı ekle (istatistiklerde ayrı sayılır)')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('Ders çalışma ses kanalı')
                    .addChannelTypes(ChannelType.GuildVoice)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ders-ses-kaldir')
            .setDescription('Ders ses kanalını kaldır')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('Kaldırılacak ders ses kanalı')
                    .addChannelTypes(ChannelType.GuildVoice)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('chain')
            .setDescription('Chain kanalını ayarla')
            .addChannelOption(option =>
                option
                    .setName('kanal')
                    .setDescription('Chain komutlarının kullanılacağı kanal')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('göster')
            .setDescription('Mevcut ayarları göster')
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'göster') {
        const settings = getGuildSettings(interaction.guildId);
        const todoChannels = getTodoChannels(interaction.guildId);
        const studyVoiceChannels = getStudyVoiceChannels(interaction.guildId);
        
        const getChannelMention = (id) => id ? `<#${id}>` : '❌ Ayarlanmamış';
        
        // To-do kanallarını listele
        let todoValue = '❌ Ayarlanmamış';
        if (todoChannels.length > 0) {
            todoValue = todoChannels.map(id => `<#${id}>`).join('\n');
        }
        
        // Ders ses kanallarını listele
        let studyVoiceValue = '❌ Ayarlanmamış';
        if (studyVoiceChannels.length > 0) {
            studyVoiceValue = studyVoiceChannels.map(id => `<#${id}>`).join('\n');
        }
        
        const embed = createInfoEmbed('Mevcut Ayarlar', '')
            .addFields(
                { name: '📅 YKS Geri Sayım', value: getChannelMention(settings?.countdown_channel_id), inline: true },
                { name: '🎤 Ses Log', value: getChannelMention(settings?.voice_log_channel_id), inline: true },
                { name: '🔗 Chain', value: getChannelMention(settings?.chain_channel_id), inline: true },
                { name: '✅ To-Do Kanalları', value: todoValue, inline: false },
                { name: '📚 Ders Ses Kanalları', value: studyVoiceValue, inline: false }
            );
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // To-do kanal ekleme
    if (subcommand === 'todo-ekle') {
        const channel = interaction.options.getChannel('kanal');
        addTodoChannel(interaction.guildId, channel.id);
        
        const embed = createSuccessEmbed(
            'To-Do Kanalı Eklendi',
            `${channel} to-do kanalı olarak eklendi.`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // To-do kanal kaldırma
    if (subcommand === 'todo-kaldir') {
        const channel = interaction.options.getChannel('kanal');
        const result = removeTodoChannel(interaction.guildId, channel.id);
        
        if (result.changes === 0) {
            const embed = createErrorEmbed(
                'Kanal Bulunamadı',
                `${channel} to-do kanalı olarak kayıtlı değil.`
            );
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const embed = createSuccessEmbed(
            'To-Do Kanalı Kaldırıldı',
            `${channel} to-do kanalları listesinden kaldırıldı.`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // Ders ses kanalı ekleme
    if (subcommand === 'ders-ses-ekle') {
        const channel = interaction.options.getChannel('kanal');
        addStudyVoiceChannel(interaction.guildId, channel.id);
        
        const embed = createSuccessEmbed(
            'Ders Ses Kanalı Eklendi',
            `🎤 ${channel} ders ses kanalı olarak eklendi.\n\nBu kanalda geçirilen süre istatistiklerde "Ders Kanalı" olarak ayrı gösterilecek.`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // Ders ses kanalı kaldırma
    if (subcommand === 'ders-ses-kaldir') {
        const channel = interaction.options.getChannel('kanal');
        const result = removeStudyVoiceChannel(interaction.guildId, channel.id);
        
        if (result.changes === 0) {
            const embed = createErrorEmbed(
                'Kanal Bulunamadı',
                `${channel} ders ses kanalı olarak kayıtlı değil.`
            );
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const embed = createSuccessEmbed(
            'Ders Ses Kanalı Kaldırıldı',
            `${channel} ders ses kanalları listesinden kaldırıldı.`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // Diğer kanal ayarları
    const channel = interaction.options.getChannel('kanal');
    const channelTypeMap = {
        'yks': 'countdown_channel_id',
        'ses-log': 'voice_log_channel_id',
        'chain': 'chain_channel_id'
    };
    
    const channelNameMap = {
        'yks': 'YKS Geri Sayım',
        'ses-log': 'Ses Log',
        'chain': 'Chain'
    };
    
    const dbColumn = channelTypeMap[subcommand];
    updateGuildChannel(interaction.guildId, dbColumn, channel.id);
    
    const embed = createSuccessEmbed(
        'Kanal Ayarlandı',
        `${channelNameMap[subcommand]} kanalı ${channel} olarak ayarlandı.`
    );
    
    await interaction.reply({ embeds: [embed] });
}
