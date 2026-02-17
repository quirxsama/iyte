import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { 
    addReviewTopic, 
    getReviewTopicsByUser, 
    getDueReviews, 
    markReviewDone, 
    deleteReviewTopic,
    getReviewTopicById
} from '../database/db.js';
import { createSuccessEmbed, createInfoEmbed, createErrorEmbed } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('tekrar')
    .setDescription('Tekrar sistemi - Unutma eğrisi bazlı konu tekrarı')
    .addSubcommand(subcommand =>
        subcommand
            .setName('ekle')
            .setDescription('Tekrar edilecek konu ekle')
            .addStringOption(option =>
                option
                    .setName('konu')
                    .setDescription('Tekrar edilecek konu adı')
                    .setRequired(true)
                    .setMaxLength(200)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('liste')
            .setDescription('Tüm tekrar konularını listele')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('bugün')
            .setDescription('Bugün tekrar edilmesi gereken konuları göster')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('sil')
            .setDescription('Tekrar konusunu sil')
            .addIntegerOption(option =>
                option
                    .setName('id')
                    .setDescription('Silinecek konunun ID numarası')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    switch (subcommand) {
        case 'ekle': {
            const topic = interaction.options.getString('konu');
            const result = addReviewTopic(guildId, userId, topic);
            
            const now = new Date();
            const addDays = (days) => {
                const d = new Date(now);
                d.setDate(d.getDate() + days);
                return d.toISOString().split('T')[0];
            };

            const embed = createSuccessEmbed(
                'Tekrar Konusu Eklendi',
                `📚 **${topic}** konusu tekrar listesine eklendi!`
            ).addFields(
                { name: '📅 Tekrar Takvimi', value: 
                    `🔹 **D1** (1 gün sonra): \`${addDays(1)}\`\n` +
                    `🔹 **D7** (7 gün sonra): \`${addDays(7)}\`\n` +
                    `🔹 **D14** (14 gün sonra): \`${addDays(14)}\`\n` +
                    `🔹 **D30** (30 gün sonra): \`${addDays(30)}\``,
                    inline: false 
                },
                { name: '💡 Bilgi', value: 'Her tekrar gününde sabah DM ile hatırlatma alacaksın!', inline: false }
            ).setColor(0x9b59b6);

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'liste': {
            const topics = getReviewTopicsByUser(guildId, userId);

            if (topics.length === 0) {
                const embed = createInfoEmbed(
                    'Tekrar Listesi',
                    'Henüz tekrar listesinde konu yok.\n`/tekrar ekle` ile konu ekleyebilirsin!'
                );
                return interaction.reply({ embeds: [embed] });
            }

            const today = new Date().toISOString().split('T')[0];

            let description = '';
            for (const t of topics) {
                const d1Status = t.d1_done ? '✅' : (t.d1_date <= today ? '⚠️' : '⏳');
                const d7Status = t.d7_done ? '✅' : (t.d7_date <= today ? '⚠️' : '⏳');
                const d14Status = t.d14_done ? '✅' : (t.d14_date <= today ? '⚠️' : '⏳');
                const d30Status = t.d30_done ? '✅' : (t.d30_date <= today ? '⚠️' : '⏳');
                
                const allDone = t.d1_done && t.d7_done && t.d14_done && t.d30_done;
                const topicEmoji = allDone ? '🏆' : '📚';

                description += `${topicEmoji} **#${t.id}** ${t.topic}\n`;
                description += `  D1${d1Status} D7${d7Status} D14${d14Status} D30${d30Status}\n\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Tekrar Listesi')
                .setDescription(description)
                .setColor(0x9b59b6)
                .setFooter({ text: `✅ Tamamlandı | ⏳ Bekliyor | ⚠️ Gecikmiş • Toplam: ${topics.length} konu` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'bugün': {
            const dueTopics = getDueReviews(guildId, userId);

            if (dueTopics.length === 0) {
                const embed = createInfoEmbed(
                    'Bugünkü Tekrarlar',
                    '🎉 Bugün tekrar edilecek konu yok! Harika iş!'
                );
                return interaction.reply({ embeds: [embed] });
            }

            const today = new Date().toISOString().split('T')[0];
            let description = '';

            for (const t of dueTopics) {
                const intervals = [];
                if (t.d1_date === today && !t.d1_done) intervals.push('D1');
                if (t.d7_date === today && !t.d7_done) intervals.push('D7');
                if (t.d14_date === today && !t.d14_done) intervals.push('D14');
                if (t.d30_date === today && !t.d30_done) intervals.push('D30');

                description += `📚 **#${t.id}** ${t.topic} — ${intervals.join(', ')} tekrarı\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('📅 Bugünkü Tekrarlar')
                .setDescription(description)
                .setColor(0xe67e22)
                .setFooter({ text: 'Tekrarı tamamladıktan sonra aşağıdaki butonları kullan!' })
                .setTimestamp();

            // Butonlar oluştur
            const rows = [];
            for (const t of dueTopics) {
                const intervals = [];
                if (t.d1_date === today && !t.d1_done) intervals.push('1');
                if (t.d7_date === today && !t.d7_done) intervals.push('7');
                if (t.d14_date === today && !t.d14_done) intervals.push('14');
                if (t.d30_date === today && !t.d30_done) intervals.push('30');

                for (const interval of intervals) {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`review_done_${t.id}_${interval}`)
                            .setLabel(`✅ #${t.id} ${t.topic.substring(0, 30)} (D${interval})`)
                            .setStyle(ButtonStyle.Success)
                    );
                    rows.push(row);
                    if (rows.length >= 5) break; // Discord 5 satır limiti
                }
                if (rows.length >= 5) break;
            }

            await interaction.reply({ embeds: [embed], components: rows });
            break;
        }

        case 'sil': {
            const topicId = interaction.options.getInteger('id');
            const result = deleteReviewTopic(topicId, userId);

            if (result.changes === 0) {
                const embed = createErrorEmbed(
                    'Konu Bulunamadı',
                    'Bu ID ile kayıtlı bir konu bulunamadı veya bu konu sana ait değil.'
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = createSuccessEmbed(
                'Konu Silindi',
                `🗑️ **#${topicId}** numaralı konu tekrar listesinden silindi.`
            );
            await interaction.reply({ embeds: [embed] });
            break;
        }
    }
}
