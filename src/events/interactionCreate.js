import { Collection } from 'discord.js';
import { getTodoByMessageId, updateTodoStatus } from '../database/db.js';
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
        
        // To-do butonları
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
    }
}
