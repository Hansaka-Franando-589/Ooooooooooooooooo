const { cmd, commands } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');
const { sendInteractiveMessage } = require('gifted-btns');

cmd({
    pattern: "alive",
    alias: ["system", "ping", "status", "bot"],
    desc: "Check bot online or no.",
    category: "main",
    filename: __filename
},
async (hansaka, mek, m, {
    from, quoted, pushname, prefix, senderNumber
}) => {
    try {
        const uptime  = runtime(process.uptime());
        const now     = new Date();
        const date    = now.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
        const time    = now.toLocaleTimeString('en-GB', { hour12: false });
        const botNum  = hansaka.user.id.split(':')[0];

        // Load image as local buffer (Fast)
        let aliveImg = null;
        try {
            const fs = require('fs');
            aliveImg = fs.readFileSync(config.ALIVE_IMG);
        } catch(e) { aliveImg = null; }

        const aliveText =
`♡──────────────────♡
💞 Hey...I'm *Olya MD AI* 🤖, your
lovely assistant — alive and sparkling now!
♡──────────────────♡

📅 DATE: ${date}
🕐 TIME: ${time}

📟 NUMBER: ${botNum}
💬 PREFIX: ${prefix}
⏰ UPTIME: ${uptime}

© POWERED BY OLYA
© Olya MD - Hansaka P Fernando`;

        return await sendInteractiveMessage(hansaka, from, {
            text: aliveText,
            footer: "© Olya MD AI - Cyber System",
            image: aliveImg ? { buffer: aliveImg } : { url: 'https://i.ibb.co/s93hdn6L/Olya-welcome.png' },
            aimode: true,
            interactiveButtons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📞 CONTACT HANSAKA',
                        url: `https://wa.me/94779912589?text=Hey__Olya`
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '⚡ PING', id: '.ping' })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '📋 MENU', id: '.menu' })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '🆘 HELP', id: '.help' })
                }
            ]
        });

    } catch (e) {
        console.log(e);
        m.reply(`${e}`);
    }
});
