import { EmbedBuilder } from 'discord.js';
import { getAllDueReviewsToday } from '../database/db.js';

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

    // Her kullanıcıya DM gönder
    for (const [userId, reviews] of userReviews) {
        try {
            const user = await client.users.fetch(userId);
            if (!user) continue;

            let description = '📅 Bugün tekrar etmen gereken konular:\n\n';

            for (const r of reviews) {
                const intervals = [];
                if (r.d1_date === today && !r.d1_done) intervals.push('D1');
                if (r.d7_date === today && !r.d7_done) intervals.push('D7');
                if (r.d14_date === today && !r.d14_done) intervals.push('D14');
                if (r.d30_date === today && !r.d30_done) intervals.push('D30');

                description += `📚 **#${r.id}** ${r.topic} — ${intervals.join(', ')} tekrarı\n`;
            }

            description += '\n💡 Tekrarı tamamladıktan sonra sunucuda `/tekrar bugün` yazarak işaretle!';

            const embed = new EmbedBuilder()
                .setTitle('🔔 Tekrar Hatırlatması')
                .setDescription(description)
                .setColor(0x9b59b6)
                .setFooter({ text: '🎓 Unutma eğrisini yen!' })
                .setTimestamp();

            await user.send({ embeds: [embed] });
            console.log(`📩 Tekrar hatırlatması gönderildi: ${user.username} (${reviews.length} konu)`);
        } catch (error) {
            console.error(`Tekrar hatırlatması gönderilemedi (User: ${userId}):`, error.message);
        }
    }
}
