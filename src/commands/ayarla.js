import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { updateGuildChannel, getGuildSettings, addTodoChannel, removeTodoChannel, getTodoChannels } from '../database/db.js';
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
        
        const getChannelMention = (id) => id ? `<#${id}>` : '❌ Ayarlanmamış';
        
        // To-do kanallarını listele
        let todoValue = '❌ Ayarlanmamış';
        if (todoChannels.length > 0) {
            todoValue = todoChannels.map(id => `<#${id}>`).join('\n');
        }
        
        const embed = createInfoEmbed('Mevcut Ayarlar', '')
            .addFields(
                { name: '📅 YKS Geri Sayım', value: getChannelMention(settings?.countdown_channel_id), inline: true },
                { name: '🎤 Ses Log', value: getChannelMention(settings?.voice_log_channel_id), inline: true },
                { name: '🔗 Chain', value: getChannelMention(settings?.chain_channel_id), inline: true },
                { name: '✅ To-Do Kanalları', value: todoValue, inline: false }
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
