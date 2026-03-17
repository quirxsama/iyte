import pkg from 'discord.js';
const { SlashCommandBuilder } = pkg;
import { createCountdownEmbed, getDaysUntilYKS } from '../modules/countdown.js';

export const data = new SlashCommandBuilder()
    .setName('yks')
    .setDescription('YKS geri sayımını göster');

export async function execute(interaction) {
    await interaction.deferReply();
    const embed = await createCountdownEmbed();
    await interaction.editReply({ embeds: [embed] });
}
