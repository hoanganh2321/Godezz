const { ticketsCollection } = require('../mongodb');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const ticketIcons = require('../UI/icons/ticketicons');

let config = {};

async function loadConfig() {
    try {
        const tickets = await ticketsCollection.find({}).toArray();
        config.tickets = tickets.reduce((acc, ticket) => {
            acc[ticket.serverId] = {
                ticketChannelId: ticket.ticketChannelId,
                adminRoleId: ticket.adminRoleId,
                status: ticket.status
            };
            return acc;
        }, {});
    } catch (err) {
        //console.error('Error loading config from MongoDB:', err);
    }
}

setInterval(loadConfig, 5000);

module.exports = (client) => {
    client.on('ready', async () => {
        await loadConfig();
        monitorConfigChanges(client);
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
            handleSelectMenu(interaction, client);
        } else if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
            handleCloseButton(interaction, client);
        }
    });
};

async function monitorConfigChanges(client) {
    let previousConfig = JSON.parse(JSON.stringify(config));

    setInterval(async () => {
        await loadConfig();
        if (JSON.stringify(config) !== JSON.stringify(previousConfig)) {
            for (const guildId of Object.keys(config.tickets)) {
                const settings = config.tickets[guildId];
                const previousSettings = previousConfig.tickets[guildId];

                if (settings && settings.status && settings.ticketChannelId && (!previousSettings || settings.ticketChannelId !== previousSettings.ticketChannelId)) {
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) continue;

                    const ticketChannel = guild.channels.cache.get(settings.ticketChannelId);
                    if (!ticketChannel) continue;

          
                    const embed = new EmbedBuilder()
                        .setAuthor({
                            name: "Welcome to Ticket System",
                            iconURL: ticketIcons.mainIcon,
                            url: "https://discord.gg/tAD4TFuxZN"
                        })
                        .setDescription('- Please click below menu to create a new ticket.\n\n' +
                            '**Ticket System:**\n' +
                            '- Tạo Ticket Không Nói Không Rằng Gì Thì Ăn Mute Nhé.\n' +
                            '- Vui Lòng Chờ Các <@&1230864469580714095> Rep Ticket Của Bạn Nhé.')
                        .setFooter({ text: 'Made by Jfunk_', iconURL: 'https://cdn.discordapp.com/avatars/779507251282968587/8fc9bf366dde18bfe30e5d21127ba6ac.png?size=1024' })
                        .setColor('#00FF00')
                        .setTimestamp();

                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('select_ticket_type')
                        .setPlaceholder('Choose ticket type')
                        .addOptions([
                            { label: '🛒 Buy & Cày Thuê', value: 'support' },
                            { label: '📂 Suggestion', value: 'suggestion' },
                            { label: '💜 Feedback', value: 'feedback' },
                            { label: '⚠️ Report', value: 'report' }
                        ]);

                    const row = new ActionRowBuilder().addComponents(menu);

                    await ticketChannel.send({
                        embeds: [embed],
                        components: [row]
                    });

                    previousConfig = JSON.parse(JSON.stringify(config));
                }
            }
        }
    }, 5000);
}

async function handleSelectMenu(interaction, client) {
    await interaction.deferReply({ ephemeral: true }); 

    const { guild, user, values } = interaction;
    if (!guild || !user) return;

    const guildId = guild.id;
    const userId = user.id;
    const ticketType = values[0];
    const settings = config.tickets[guildId];
    if (!settings) return;

    const ticketExists = await ticketsCollection.findOne({ guildId, userId });
    if (ticketExists) {
        return interaction.followUp({ content: 'You already have an open ticket.', ephemeral: true });
    }

    const ticketChannel = await guild.channels.create({
        name: `${user.username}-${ticketType}-ticket`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: userId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
            },
            {
                id: settings.adminRoleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
            }
        ]
    });

    const ticketId = `${guildId}-${ticketChannel.id}`;
    await ticketsCollection.insertOne({ id: ticketId, channelId: ticketChannel.id, guildId, userId, type: ticketType });

    const ticketEmbed = new EmbedBuilder()
        .setAuthor({
            name: "Ticket System",
            iconURL: ticketIcons.modIcon,
            url: "https://discord.gg/tAD4TFuxZN"
        })
        .setDescription(`Hello ${user}, welcome to our ticket\n- Hãy Nói Ra Yêu Cầu Của Bạn Vào Đây \n- Và Hãy Chờ Các <@&1230864469580714095> Rep Ticket Của Bạn Nhé.\n- Nếu ${user} Tạo Ticket Với Mục Đích Cho Vui Thì Xin Phép Mute 3 ngày.`)
        .setFooter({ text: 'Made By Jfunk_', iconURL: 'https://cdn.discordapp.com/avatars/779507251282968587/8fc9bf366dde18bfe30e5d21127ba6ac.png?size=1024' })
        .setColor('#00FF00')
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ content: `${user}`, embeds: [ticketEmbed], components: [actionRow] });

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setAuthor({ 
            name: "Ticket Created!", 
            iconURL: ticketIcons.correctIcon,
            url: "https://discord.gg/tAD4TFuxZN"
        })
        .setDescription(`- Your ${ticketType} ticket has been created.`)
        .addFields(
            { name: 'Ticket Channel', value: `${ticketChannel.url}` },
        )
        .setTimestamp()
        .setFooter({ text: 'Thank you for reaching out!', iconURL: ticketIcons.modIcon });

    await user.send({ content: `Your ${ticketType} ticket has been created`, embeds: [embed] });

    interaction.followUp({ content: 'Ticket created!', ephemeral: true });
}

async function handleCloseButton(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.customId.replace('close_ticket_', '');
    const { guild, user } = interaction;
    if (!guild || !user) return;

    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) {
        return interaction.followUp({ content: 'Ticket not found. Please report to staff!', ephemeral: true });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        setTimeout(async () => {
            await ticketChannel.delete().catch(console.error);
        }, 5000);
    }

    await ticketsCollection.deleteOne({ id: ticketId });

    const ticketUser = await client.users.fetch(ticket.userId);
    if (ticketUser) {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setAuthor({ 
                name: "Ticket closed!", 
                iconURL: ticketIcons.correctrIcon,
                url: "https://discord.gg/tAD4TFuxZN"
            })
            .setDescription(`- Your ticket has been closed.`)
            .setTimestamp()
            .setFooter({ text: 'Thank you for reaching out!', iconURL: ticketIcons.modIcon });

        await ticketUser.send({ content: `Your ticket has been closed.`, embeds: [embed] });
    }

    interaction.followUp({ content: 'Ticket closed and user notified.', ephemeral: true });
}
