import pkg from 'discord.js';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = pkg;
import { getAllDueReviewsToday, getTodoChannels, createTodo } from '../database/db.js';
import { createTodoEmbed } from '../utils/embed.js';

export async function sendDailyReviewReminders(client) {
    const today = new Date().toISOString().split('T')[0];
    const dueReviews = getAllDueReviewsToday(today);

    if (dueReviews.length === 0) return;

    // Kullanıcıya göre grupla
    const userReviews = new Map();
    for (const review of dueReviews) {
        const key = review.user_id;
        if (!userReviews.has(key)) {
            userReviews.set(key, []);
        }
        userReviews.get(key).push(review);
    }

    // Her kullanıcıya DM gönder ve To-do kanalına mesaj at
    for (const [userId, reviews] of userReviews) {
        try {
            const user = await client.users.fetch(userId);
            if (!user) continue;

            let description = '📅 Bugün tekrar etmen gereken konular:\n\n';

            for (const r of reviews) {
                const intervals = [];
                if (r.d1_date === today && !r.d1_done) intervals.push('1');
                if (r.d7_date === today && !r.d7_done) intervals.push('7');
                if (r.d14_date === today && !r.d14_done) intervals.push('14');
                if (r.d30_date === today && !r.d30_done) intervals.push('30');

                description += `📚 **#${r.id}** ${r.topic} — D${intervals.join(', D')} tekrarı\n`;

                // To-Do oluştur (Sadece ilk uygun To-Do kanalına)
                const todoChannels = getTodoChannels(r.guild_id);
                if (todoChannels.length > 0) {
                    try {
                        const channel = await client.channels.fetch(todoChannels[0]);
                        if (channel) {
                            for (const interval of intervals) {
                                const content = `Tekrar: ${r.topic} (D${interval})`;
                                const row = new ActionRowBuilder().addComponents(
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
                                        .setEmoji('🗑️')
                                );

                                const embedTodo = createTodoEmbed(content, 'pending');
                                embedTodo.setFooter({ text: `${user.username} için planlandı` });

                                const todoMessage = await channel.send({ content: `<@${userId}>`, embeds: [embedTodo], components: [row] });
                                createTodo(r.guild_id, userId, todoMessage.id, content, 1, r.id, interval);
                            }
                        }
                    } catch (e) {
                        console.error(`To-do kanalına mesaj gönderilemedi (User: ${userId}, Guild: ${r.guild_id}):`, e.message);
                    }
                }
            }

            description += '\n💡 Bu tekrarlar otomatik olarak To-Do listene eklendi. Listeden veya `/tekrar bugün` ile tamamlayabilirsin!';

            const embed = new EmbedBuilder()
                .setTitle('🔔 Tekrar Hatırlatması')
                .setDescription(description)
                .setColor(0x9b59b6)
                .setFooter({ text: '🎓 Unutma eğrisini yen!' })
                .setTimestamp();

            await user.send({ embeds: [embed] });
            console.log(`📩 Tekrar hatırlatması ve to-do eklentisi gönderildi: ${user.username} (${reviews.length} konu)`);
        } catch (error) {
            console.error(`Tekrar hatırlatması gönderilemedi (User: ${userId}):`, error.message);
        }
    }
}
