import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

// --- Webhook for receiving commands ---
const app = express();
app.use(bodyParser.json());

app.post('/newCommand', async (req, res) => {
    const { name, description } = req.body;

    // Register slash command dynamically
    const commands = [{
        name: name,
        description: description,
    }];

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log(`Registered command: ${name}`);
        res.send({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Bot API running on port ${PORT}`));
