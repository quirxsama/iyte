import { Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTodoByMessageId, updateTodoStatus, updateTodoContent, deleteTodo, markReviewDone, getReviewTopicById } from '../database/db.js';
import { createTodoEmbed } from '../utils/embed.js';

export const name = 'interactionCreate';

export async function execute(interaction, client) {
    // Slash komutları
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            console.error(`${interaction.commandName} komutu bulunamadı.`);
            return;
        }
        
        // Cooldown kontrolü
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldown = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldown) * 1000;
        
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                return interaction.reply({
                    content: `⏳ Lütfen bekle! Bu komutu <t:${expiredTimestamp}:R> tekrar kullanabilirsin.`,
                    ephemeral: true
                });
            }
        }
        
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`Komut hatası (${interaction.commandName}):`, error);
            
            const errorMessage = '❌ Bu komutu çalıştırırken bir hata oluştu!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
    
    // Buton etkileşimleri
    else if (interaction.isButton()) {
        const customId = interaction.customId;
        
        // To-do tamamla/başarısız butonları
        if (customId === 'todo_complete' || customId === 'todo_failed') {
            const messageId = interaction.message.id;
            const todo = getTodoByMessageId(messageId);
            
            if (!todo) {
                return interaction.reply({
                    content: '❌ Bu to-do bulunamadı!',
                    ephemeral: true
                });
            }
            
            // Sadece oluşturan kişi ya da yönetici değiştirebilir
            if (todo.user_id !== interaction.user.id && 
                !interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({
                    content: '❌ Bu to-do\'yu sadece oluşturan kişi değiştirebilir!',
                    ephemeral: true
                });
            }
            
            const newStatus = customId === 'todo_complete' ? 'completed' : 'failed';
            updateTodoStatus(messageId, newStatus);
            
            // Embed'i güncelle
            const embed = createTodoEmbed(todo.content, newStatus);
            embed.setFooter({ 
                text: `${interaction.user.username} tarafından ${newStatus === 'completed' ? 'tamamlandı' : 'başarısız olarak işaretlendi'}` 
            });
            
            // Butonları devre dışı bırak
            await interaction.update({
                embeds: [embed],
                components: []
            });
        }
        
        // To-do iptal butonu
        else if (customId === 'todo_cancel') {
            const messageId = interaction.message.id;
            const todo = getTodoByMessageId(messageId);
            
            if (!todo) {
                return interaction.reply({
                    content: '❌ Bu to-do bulunamadı!',
                    ephemeral: true
                });
            }
            
            // Sadece oluşturan kişi ya da yönetici iptal edebilir
            if (todo.user_id !== interaction.user.id && 
                !interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({
                    content: '❌ Bu to-do\'yu sadece oluşturan kişi iptal edebilir!',
                    ephemeral: true
                });
            }
            
            // Veritabanından sil
            deleteTodo(messageId);
            
            // Mesajı sil
            try {
                await interaction.message.delete();
            } catch (error) {
                console.error('To-do mesajı silinemedi:', error.message);
            }
            
            // Bildirim gönder (ephemeral)
            await interaction.reply({
                content: '🗑️ To-do iptal edildi ve silindi.',
                ephemeral: true
            });
        }
        
        // To-do düzenle butonu
        else if (customId === 'todo_edit') {
            const messageId = interaction.message.id;
            const todo = getTodoByMessageId(messageId);
            
            if (!todo) {
                return interaction.reply({
                    content: '❌ Bu to-do bulunamadı!',
                    ephemeral: true
                });
            }
            
            // Sadece oluşturan kişi ya da yönetici değiştirebilir
            if (todo.user_id !== interaction.user.id && 
                !interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({
                    content: '❌ Bu to-do\'yu sadece oluşturan kişi düzenleyebilir!',
                    ephemeral: true
                });
            }
            
            // Modal oluştur
            const modal = new ModalBuilder()
                .setCustomId(`todo_edit_modal_${messageId}`)
                .setTitle('📝 To-Do Düzenle');
            
            const contentInput = new TextInputBuilder()
                .setCustomId('todo_content')
                .setLabel('Yeni İçerik')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(todo.content)
                .setPlaceholder('To-do içeriğini yazın...')
                .setRequired(true)
                .setMaxLength(1000);
            
            const row = new ActionRowBuilder().addComponents(contentInput);
            modal.addComponents(row);
            
            await interaction.showModal(modal);
        }
        
        // Tekrar sistemi - tamamlama butonu
        else if (customId.startsWith('review_done_')) {
            const parts = customId.split('_');
            const topicId = parseInt(parts[2]);
            const interval = parts[3];
            
            const topic = getReviewTopicById(topicId);
            if (!topic) {
                return interaction.reply({
                    content: '❌ Bu tekrar konusu bulunamadı!',
                    ephemeral: true
                });
            }
            
            if (topic.user_id !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ Bu tekrar konusu sana ait değil!',
                    ephemeral: true
                });
            }
            
            markReviewDone(topicId, interval);
            
            // Butonu devre dışı bırak
            const updatedComponents = interaction.message.components.map(row => {
                return ActionRowBuilder.from(row).setComponents(
                    row.components.map(button => {
                        const btn = ButtonBuilder.from(button);
                        if (button.customId === customId) {
                            btn.setDisabled(true)
                               .setLabel(`✅ ${topic.topic.substring(0, 30)} (D${interval} Tamam!)`);
                        }
                        return btn;
                    })
                );
            });
            
            await interaction.update({ components: updatedComponents });
        }
    }
    
    // Modal submit
    else if (interaction.isModalSubmit()) {
        const customId = interaction.customId;
        
        // To-do düzenleme modal'ı
        if (customId.startsWith('todo_edit_modal_')) {
            const messageId = customId.replace('todo_edit_modal_', '');
            const newContent = interaction.fields.getTextInputValue('todo_content');
            
            const todo = getTodoByMessageId(messageId);
            
            if (!todo) {
                return interaction.reply({
                    content: '❌ Bu to-do bulunamadı!',
                    ephemeral: true
                });
            }
            
            // Veritabanını güncelle
            updateTodoContent(messageId, newContent);
            
            // Embed'i güncelle
            const embed = createTodoEmbed(newContent, todo.status);
            embed.setFooter({ 
                text: `${interaction.user.username} tarafından düzenlendi` 
            });
            
            // Butonları yeniden oluştur (eğer pending ise)
            let components = [];
            if (todo.status === 'pending') {
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
                components = [row];
            }
            
            // Orijinal mesajı güncelle
            try {
                const message = await interaction.channel.messages.fetch(messageId);
                await message.edit({
                    embeds: [embed],
                    components: components
                });
                
                await interaction.reply({
                    content: '✅ To-do başarıyla güncellendi!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('To-do güncellenemedi:', error);
                await interaction.reply({
                    content: '❌ To-do güncellenirken bir hata oluştu!',
                    ephemeral: true
                });
            }
        }
    }
}
