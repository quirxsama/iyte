import { SlashCommandBuilder } from 'discord.js';
import { getChain, incrementChain, breakChain } from '../database/db.js';
import { createChainEmbed, createInfoEmbed } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
    .setName('chain')
    .setDescription('Zincir sistemini yönet')
    .addSubcommand(subcommand =>
        subcommand
            .setName('ekle')
            .setDescription('Zincirini 1 gün ilerlet')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('kır')
            .setDescription('Zincirini sıfırla')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('durum')
            .setDescription('Zincir durumunu göster')
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    switch (subcommand) {
        case 'ekle': {
            const result = incrementChain(guildId, userId);
            const embed = createChainEmbed(
                result.chain_count,
                result.best_chain,
                result.last_update
            );
            await interaction.reply({ embeds: [embed] });
            break;
        }
        
        case 'kır': {
            const result = breakChain(guildId, userId);
            const embed = createChainEmbed(0, result.best_chain, '', true);
            await interaction.reply({ embeds: [embed] });
            break;
        }
        
        case 'durum': {
            const chain = getChain(guildId, userId);
            
            if (!chain || chain.chain_count === 0) {
                const embed = createInfoEmbed(
                    'Zincir Durumu',
                    'Henüz bir zincirin yok. `/chain ekle` ile başla!'
                );
                if (chain?.best_chain > 0) {
                    embed.addFields({ 
                        name: '🏆 En İyi Zincir', 
                        value: `${chain.best_chain} gün`, 
                        inline: true 
                    });
                }
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = createChainEmbed(
                    chain.chain_count,
                    chain.best_chain,
                    chain.last_update
                );
                await interaction.reply({ embeds: [embed] });
            }
            break;
        }
    }
}
