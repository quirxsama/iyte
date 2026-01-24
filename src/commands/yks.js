import { SlashCommandBuilder } from 'discord.js';
import { createCountdownEmbed, getDaysUntilYKS } from '../modules/countdown.js';

export const data = new SlashCommandBuilder()
    .setName('yks')
    .setDescription('YKS geri sayımını göster');

export async function execute(interaction) {
    const embed = createCountdownEmbed();
    await interaction.reply({ embeds: [embed] });
}
