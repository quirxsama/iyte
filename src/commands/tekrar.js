import pkg from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = pkg;
import { 
    addReviewTopic, 
    getReviewTopicsByUser, 
    getDueReviews, 
    markReviewDone, 
    deleteReviewTopic,
    getReviewTopicById,
    searchReviewTopics,
    updateReviewTopicNote
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
            .addStringOption(option =>
                option
                    .setName('tarih')
                    .setDescription('Başlangıç tarihi (YYYY-AA-GG) Opsiyonel, varsayılan: Bugün')
                    .setRequired(false)
            )
            .addBooleanOption(option =>
                option
                    .setName('hepsi')
                    .setDescription('Tüm aralıkları (D1, D7, D14, D30) otomatik seçmek için True yapın.')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ara')
            .setDescription('Tekrar konularında arama yap')
            .addStringOption(option =>
                option
                    .setName('kelime')
                    .setDescription('Aranacak kelime')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('not')
            .setDescription('Tekrar konusuna not ekle')
            .addIntegerOption(option =>
                option
                    .setName('id')
                    .setDescription('Not eklenecek konunun ID numarası')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('metin')
                    .setDescription('Notunuz')
                    .setRequired(true)
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
            const dateInput = interaction.options.getString('tarih');
            const isAll = interaction.options.getBoolean('hepsi') ?? false;

            let startDate = null;
            if (dateInput) {
                const parsedDate = new Date(dateInput);
                if (isNaN(parsedDate.getTime())) {
                    return interaction.reply({ embeds: [createErrorEmbed('Hata', 'Geçersiz tarih formatı. Lütfen YYYY-AA-GG formatında girin.')], ephemeral: true });
                }
                startDate = parsedDate.toISOString().split('T')[0];
            } else {
                startDate = new Date().toISOString().split('T')[0];
            }

            if (isAll) {
                addReviewTopic(guildId, userId, topic, startDate, ['d1', 'd7', 'd14', 'd30']);

                const addDays = (days) => {
                    const d = new Date(startDate);
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
                    { name: '💡 Bilgi', value: 'Her tekrar gününde To-Do kanalına otomatik olarak gönderilecek.', inline: false }
                ).setColor(0x9b59b6);

                return interaction.reply({ embeds: [embed] });
            } else {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('tekrar_ekle_aralik')
                    .setPlaceholder('Hangi tekrar günlerini seçmek istersin?')
                    .setMinValues(1)
                    .setMaxValues(5)
                    .addOptions([
                        { label: 'D1 (1 Gün)', value: 'd1' },
                        { label: 'D7 (7 Gün)', value: 'd7' },
                        { label: 'D14 (14 Gün)', value: 'd14' },
                        { label: 'D30 (30 Gün)', value: 'd30' },
                        { label: 'Hepsi', value: 'all', description: 'Tüm aralıkları seçer' }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const embed = createInfoEmbed(
                    'Aralık Seçimi',
                    `**Konu:** ${topic}\n**Tarih:** ${startDate}\n\nLütfen bu konu için uygulamak istediğiniz tekrar günlerini seçin.`
                );

                const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

                const filter = i => i.customId === 'tekrar_ekle_aralik' && i.user.id === userId;
                const collector = message.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async i => {
                    let selected = i.values;
                    if (selected.includes('all')) {
                        selected = ['d1', 'd7', 'd14', 'd30'];
                    }

                    addReviewTopic(guildId, userId, topic, startDate, selected);

                    const addDays = (days) => {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() + days);
                        return d.toISOString().split('T')[0];
                    };

                    let valueStr = '';
                    if (selected.includes('d1')) valueStr += `🔹 **D1**: \`${addDays(1)}\`\n`;
                    if (selected.includes('d7')) valueStr += `🔹 **D7**: \`${addDays(7)}\`\n`;
                    if (selected.includes('d14')) valueStr += `🔹 **D14**: \`${addDays(14)}\`\n`;
                    if (selected.includes('d30')) valueStr += `🔹 **D30**: \`${addDays(30)}\`\n`;

                    const resEmbed = createSuccessEmbed('Tekrar Konusu Eklendi', `📚 **${topic}** konusu eklendi!`)
                        .addFields(
                            { name: '📅 Seçilen Takvim', value: valueStr || 'Seçim yok', inline: false }
                        );

                    await i.update({ embeds: [resEmbed], components: [] });
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.editReply({ content: 'Zaman aşımına uğradı. Lütfen komutu tekrar kullanın.', embeds: [], components: [] }).catch(() => {});
                    }
                });
            }
            break;
        }

        case 'ara': {
            const query = interaction.options.getString('kelime');
            const results = searchReviewTopics(guildId, userId, query);

            if (results.length === 0) {
                return interaction.reply({ embeds: [createInfoEmbed('Sonuç Bulunamadı', `"${query}" kelimesini içeren bir tekrar konusu bulunamadı.`)], ephemeral: true });
            }

            let description = '';
            for (const t of results) {
                description += `**#${t.id}** ${t.topic}\n`;
                description += `D1: ${t.d1_date} | D7: ${t.d7_date} | D14: ${t.d14_date} | D30: ${t.d30_date}\n`;
                if (t.notes) description += `📝 Not: ${t.notes}\n`;
                description += '\n';
            }

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Arama Sonuçları: "${query}"`)
                .setDescription(description)
                .setColor(0x3498db);

            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'not': {
            const id = interaction.options.getInteger('id');
            const noteText = interaction.options.getString('metin');

            const topic = getReviewTopicById(id);
            if (!topic || topic.user_id !== userId) {
                return interaction.reply({ embeds: [createErrorEmbed('Bulunamadı', 'Bu ID ile sana ait bir konu bulunamadı.')], ephemeral: true });
            }

            updateReviewTopicNote(id, userId, noteText);

            const embed = createSuccessEmbed('Not Eklendi', `**#${id} ${topic.topic}** konusuna not eklendi:\n\n*${noteText}*`);
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
