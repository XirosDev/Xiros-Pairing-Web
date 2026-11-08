const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json()); 
app.use(express.static('public'));

app.post('/api/get-code', async (req, res) => {
    let phoneNumber = req.body.number;
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    if (!phoneNumber) {
        return res.json({ success: false, error: "Numéro invalide." });
    }

    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/temp_${phoneNumber}`);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Xiros-Md Web", "Chrome", "1.0.0"]
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                res.json({ success: true, code: code });
            } catch (error) {
                res.json({ success: false, error: "Échec de la génération." });
            }
        }, 2000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            await sock.sendMessage(sock.user.id, { 
                text: "✅ *Connexion réussie à 𝐗ɪʀᴏs 𝐌ᴅ !*\n\nTa session a bien été générée." 
            });
        }
    });
});

app.listen(3000, () => {
    console.log('Serveur Web Xiros-Md en ligne sur le port 3000');
});
