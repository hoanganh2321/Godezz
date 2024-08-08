const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const lang = require('../../events/loadLanguage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription(lang.supportDescription),
    async execute(interaction) {
        const supportServerLink = lang.supportServerLink;
        const githubLink = lang.githubLink;
        const replitLink = lang.replitLink;
        const youtubeLink = lang.youtubeLink;

        const embed = new EmbedBuilder()
            .setColor('#b300ff')
            .setAuthor({
                name: lang.supportTitle,
                iconURL: lang.supportIconURL,
                url: supportServerLink
            })
            .setDescription(`
                ➡️ **${lang.supportDescriptionTitle}:**
                - ${lang.discord} - ${supportServerLink}
                
            `)
            .setImage: 'https://cdn.discordapp.com/attachments/1090895809098289185/1270760246964654162/116593332-large.gif?ex=66b587f4&is=66b43674&hm=95ee7e17b153b979da751b50fd5b5ccb44f61ea8b52d57fbdcdd27243e7b75b6&',
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
