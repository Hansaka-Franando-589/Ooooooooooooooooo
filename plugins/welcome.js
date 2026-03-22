const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const { sendInteractiveMessage } = require('gifted-btns');

cmd({
    pattern: "welcome",
    alias: ["start", "intro"],
    desc: "Show the welcome message again.",
    category: "main",
    react: "👋",
    filename: __filename
},
async (hansaka, mek, m, { from, pushname, senderNumber }) => {
    try {
        // Load user's registered name if available
        let displayName = pushname;
        const USERS_FILE = './users.json';
        try {
            if (fs.existsSync(USERS_FILE)) {
                const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                if (usersData[senderNumber]?.name) {
                    displayName = usersData[senderNumber].name;
                }
            }
        } catch (e) {}

        const now   = new Date();
        const date  = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const time  = now.toLocaleTimeString('en-GB', { hour12: false });

        // Load Welcome image as local buffer (Fast)
        let welcomeImg = null;
        try {
            welcomeImg = fs.readFileSync(config.WELCOME_IMG);
        } catch(e) { welcomeImg = null; }

        const welcomeText =
`♡────────────────────────♡
💞 *Assistant Olya* 🤖💼
♡────────────────────────♡

👋 *H E L L O, ${displayName.toUpperCase()}!*

I am *Olya*, the exclusive AI Personal Assistant to *${config.OWNER_NAME}*. 👩‍💼

*ඔබව සාදරයෙන් පිළිගන්නවා!*
මම Olya, ${config.OWNER_NAME} ගේ personal AI Secretary. 🌸

─────────────────────
📅 ${date}  🕐 ${time}
─────────────────────

✨ *මට කළ හැකි දේ:*
📊 Monthly PDF Reports
💬 AI Assistant (Sinhala/English)
🎵 YouTube / Facebook Downloads
📞 Owner Contact Info

© All rights reserved by ${config.OWNER_NAME}'s AI Assistant.`;

        return await sendInteractiveMessage(hansaka, from, {
            text: welcomeText,
            footer: "Olya MD AI - Powered by Gemini",
            image: welcomeImg ? { buffer: welcomeImg } : { url: 'https://i.ibb.co/s93hdn6L/Olya-welcome.png' },
            aimode: true,
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '📊 Get My Report', id: 'PDF වාර්තාව' })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '🤖 Bot Status', id: '.alive' })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📞 Contact Hansaka',
                        url: `https://wa.me/94779912589?text=Hey__Olya`
                    })
                }
            ]
        });

    } catch (e) {
        console.error("Welcome cmd error:", e);
        m.reply("දෝෂයක් ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.");
    }
});
