const { cmd } = require('../command');
const axios = require('axios');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "tempmail",
    alias: ["temp", "mail"],
    desc: "Generate a temporary email address.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        await hansaka.sendMessage(from, { react: { text: "📧", key: mek.key } });
        
        // Fetch new email from 1secmail
        const response = await axios.get("https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1");
        const email = response.data[0];

        let bodyText = `Cyber-Ghost Email සෑදීම සාර්ථකයි.\n\n📧 *Email:* \`${email}\`\n\nඔබගේ Inbox එක බැලීමට '.inbox ${email}' ලෙස විධානයක් දෙන්න 🤖.`;

        reply(formatMsg("🟢 *Temp-Mail Generator*", bodyText));

    } catch (e) {
        reply(formatMsg("🔴 *System Error*", "🤖 ඊමේල් සෑදීමේදී දෝෂයක්. Network Error අගයක් හමු විය."));
    }
});

cmd({
    pattern: "inbox",
    desc: "Check tempmail inbox.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q || !q.includes('@')) {
        return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර ඔබගේ Temp Email එක ලබාදෙන්න.\nඋදා: .inbox ghost@1secmail.com"));
    }

    try {
        await hansaka.sendMessage(from, { react: { text: "📩", key: mek.key } });
        
        const [login, domain] = q.split('@');
        const res = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
        const messages = res.data;

        if (!messages || messages.length === 0) {
            return reply(formatMsg("🟡 *Inbox Empty*", "🤖 ඔබගේ ඊමේල් ගිණුමට තවමත් කිසිදු පණිවිඩයක් ලැබී නැත. ටිකකින් නැවත උත්සාහ කරන්න."));
        }

        let bodyText = `📩 *Inbox Data (${messages.length} messages):*\n\n`;
        // Show the latest 3 emails
        messages.slice(0, 3).forEach((msg, index) => {
            bodyText += `*${index + 1}. From:* ${msg.from}\n*Subject:* ${msg.subject}\n*Date:* ${msg.date}\n\n`;
        });
        
        bodyText += `(වැඩි විස්තර කියවීමට මේ මොහොතේ සහය නොදක්වයි. OTP පරීක්ෂාව සඳහා පමණි 🤖)`;
        reply(formatMsg("🟢 *Security Inbox Accessed*", bodyText));

    } catch (e) {
        reply(formatMsg("🔴 *System Error*", "🤖 Inbox එක කියවීමේදී දෝෂයක් ඇතිවිය."));
    }
});
