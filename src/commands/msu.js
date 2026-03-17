import pkg from 'discord.js';
const { SlashCommandBuilder } = pkg;
import { createMSUCountdownEmbed } from '../modules/countdown.js';

export const data = new SlashCommandBuilder()
    .setName('msu')
    .setDescription('MSÜ geri sayımını göster');

export async function execute(interaction) {
    const embed = createMSUCountdownEmbed();
    await interaction.reply({ embeds: [embed] });
}
