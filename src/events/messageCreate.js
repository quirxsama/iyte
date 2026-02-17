import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { isTodoChannel, createTodo } from '../database/db.js';
import { createTodoEmbed } from '../utils/embed.js';

export const name = 'messageCreate';

export async function execute(message) {
    // Bot mesajlarını ve DM'leri yoksay
    if (message.author.bot || !message.guild) return;
    
    const guildId = message.guildId;
    
    // Mesaj to-do kanallarından birinde değilse çık
    if (!isTodoChannel(guildId, message.channelId)) {
        return;
    }
    
    // Mesajı satırlara böl
    const lines = message.content.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) return;
    
    // Orijinal mesajı sil
    try {
        await message.delete();
    } catch (error) {
        console.error('Mesaj silinemedi:', error.message);
    }
    
    // Her satır için bir to-do oluştur
    for (const line of lines) {
        const content = line.trim();
        if (content.length === 0) continue;
        
        // Butonları oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('todo_complete')
                    .setLabel('Tamamlandı')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('todo_failed')
                    .setLabel('Başarısız')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('todo_cancel')
                    .setLabel('İptal')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('todo_edit')
                    .setLabel('Düzenle')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✏️')
            );
        
        const embed = createTodoEmbed(content, 'pending');
        embed.setFooter({ text: `${message.author.username} tarafından oluşturuldu` });
        
        // Mesajı gönder
        const todoMessage = await message.channel.send({
            embeds: [embed],
            components: [row]
        });
        
        // Veritabanına kaydet
        createTodo(guildId, message.author.id, todoMessage.id, content);
    }
}
