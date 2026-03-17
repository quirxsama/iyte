import pkg from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder } = pkg;
import { askGemini } from '../utils/ai.js';
import { createErrorEmbed } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('coz')
    .setDescription('Gönderilen soruyu/fotoğrafı öğretmen edasıyla çözer.')
    .addStringOption(option =>
        option.setName('metin')
            .setDescription('Çözülmesini istediğin soru metni')
            .setRequired(false)
    )
    .addAttachmentOption(option =>
        option.setName('fotograf')
            .setDescription('Çözülmesini istediğin sorunun fotoğrafı')
            .setRequired(false)
    );

export async function execute(interaction) {
    const text = interaction.options.getString('metin');
    const attachment = interaction.options.getAttachment('fotograf');

    if (!text && !attachment) {
        return interaction.reply({
            embeds: [createErrorEmbed('Eksik Bilgi', 'Lütfen çözülmesi için bir metin veya fotoğraf gönderin.')],
            ephemeral: true
        });
    }

    await interaction.deferReply();

    try {
        let imageUrl = null;
        let mimeType = null;

        if (attachment) {
            if (!attachment.contentType?.startsWith('image/')) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Geçersiz Dosya', 'Lütfen geçerli bir resim dosyası yükleyin.')]
                });
            }
            imageUrl = attachment.url;
            mimeType = attachment.contentType;
        }

        const promptContext = `Sen bir YKS hazırlık öğretmenisin. Sert, biraz asabi ama öğrencisini içten içe seven, motive edici ve Türkçe konuşan birisin. Öğrencin sana bir soru getirdi. Bu soruyu adım adım, net ve anlaşılır bir şekilde çöz. Eğer görselde bir karalama veya öğrencinin kendi çözümü varsa, yaptığı hatayı veya doğru yaklaşımını da yüzüne vurarak belirt. LÜTFEN DİKKAT: Yanıtlarında KESİNLİKLE LaTeX formatında matematiksel ifadeler (örn. $a \\cdot b = -6$, \\( \\), \\[ \\], $$) KULLANMA. Matematiksel işlemleri Discord'un desteklediği düz metin formatında yaz (örneğin çarpma için *, üslü sayılar için x^2 veya x³, kök için √ kullan. Kesinlikle \\cdot, \\frac, \\sqrt gibi LaTeX komutları veya $ işaretleri ile sarmalanmış bloklar kullanma). İşte öğrencinin sorusu: \n\n${text || 'Ekteki soruyu çözer misin hocam?'}`;

        const answer = await askGemini(promptContext, imageUrl, mimeType);

        const embed = new EmbedBuilder()
            .setTitle('👨‍🏫 Hoca Çözüyor...')
            .setDescription(answer)
            .setColor(0xe74c3c);

        if (attachment) {
            embed.setThumbnail(attachment.url);
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Gemini çözümü sırasında hata:', error);
        await interaction.editReply({
            embeds: [createErrorEmbed('Çözüm Hatası', 'Hoca şu an çok meşgul, sonra tekrar sor. (Bir hata oluştu)')]
        });
    }
}
