const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const path = require('path');

const app = express();
app.use(express.json());

let bot = null;
let qrCode = null;
let isConnected = false;

// Store user data (in production, use a database)
const userData = new Map();

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    bot = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: console
    });

    bot.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCode = qr;
            console.log('QR Code received, display to user');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            isConnected = true;
            console.log('WhatsApp bot connected!');
        }
    });

    bot.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    bot.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (text) {
            const response = await handleCommand(text, sender);
            if (response) {
                await bot.sendMessage(sender, { text: response });
            }
        }
    });
}

// Red Dragon Commands
async function handleCommand(command, sender) {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();
    
    // Initialize user data
    if (!userData.has(sender)) {
        userData.set(sender, { balance: 1000, level: 1 });
    }
    const user = userData.get(sender);

    switch(cmd) {
        case '.ping':
        case '!ping':
            const posts = [
                "msm7090: Just deployed my new animation website! 🚀",
                "msm7091: Working on a new comic series about space adventures! 🪐",
                "msm7092: Added 5 new animations to my portfolio today! 🎬"
            ];
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            const pingTime = (Math.random() * 100 + 50).toFixed(0);
            return `🏓 PONG!\n⚡ Response Time: ${pingTime}ms\n📱 Latest Post: ${randomPost}`;

        case '!help':
            return `🎮 *RED DRAGON COMMANDS*\n\n💰 *Economy:* !daily, !work, !balance, !gamble [amount]\n🎰 *Games:* !slot [amount], !coinflip [amount]\n👥 *Social:* !profile, !leaderboard\n⚙️ *Utility:* !help, .ping, !ping`;

        case '!daily':
            user.balance += 100;
            return `💰 You claimed your daily reward of $100!\n💵 New balance: $${user.balance}`;

        case '!balance':
            return `💵 Your balance: $${user.balance}`;

        case '!work':
            const earnings = Math.floor(Math.random() * 50) + 25;
            user.balance += earnings;
            return `💼 You worked and earned $${earnings}!\n💵 New balance: $${user.balance}`;

        case '!gamble':
            const bet = parseInt(args[1]);
            if (!bet || bet <= 0) return '❌ Usage: !gamble [amount]';
            if (bet > user.balance) return '❌ Insufficient funds!';
            
            const win = Math.random() > 0.5;
            if (win) {
                user.balance += bet;
                return `🎉 You won $${bet}!\n💵 New balance: $${user.balance}`;
            } else {
                user.balance -= bet;
                return `💥 You lost $${bet}!\n💵 New balance: $${user.balance}`;
            }

        case '!profile':
            return `👤 *Your Profile*\n💰 Balance: $${user.balance}\n⭐ Level: ${user.level}`;

        default:
            return '❌ Unknown command. Type !help for available commands.';
    }
}

// API Routes
app.get('/api/qr', (req, res) => {
    if (qrCode) {
        res.json({ qr: qrCode, connected: isConnected });
    } else {
        res.json({ qr: null, connected: isConnected });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ connected: isConnected });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start bot and server
connectToWhatsApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WhatsApp bot server running on port ${PORT}`);
});

module.exports = app;
