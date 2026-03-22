const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const { sendButtons } = require('gifted-btns');

cmd({
    pattern: "logo",
    desc: "Create a cool logo with your name.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර ලෝගෝ එකට අවශ්‍ය නම ලබා දෙන්න. (උදා: .logo Olya)");
    try {
        await hansaka.sendMessage(from, { react: { text: "🎨", key: mek.key } });
        const logoUrl = `https://api.vreden.my.id/api/textpro-generic?text=${encodeURIComponent(q)}&link=https://textpro.me/create-realistic-golden-text-effect-on-black-background-1089.html`;
        
        await sendButtons(hansaka, from, {
            image: { url: logoUrl },
            text: `✨ *Logo Created Successfully!*\n\n👤 *Name:* ${q}`,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });
    } catch (e) {
        reply("❌ ලෝගෝ එක සෑදීමේදී දෝෂයක් ඇතිවිය.");
    }
});

cmd({
    pattern: "broadcast",
    alias: ["bc"],
    desc: "Send message to all users.",
    category: "owner",
    filename: __filename
},
async (hansaka, mek, m, { from, q, isOwner, reply }) => {
    if (!isOwner) return reply("මෙය භාවිතා කළ හැක්කේ අයිතිකරුට පමණි.");
    if (!q) return reply("යැවිය යුතු පණිවිඩය ඇතුලත් කරන්න.");

    const USERS_FILE = './users.json';
    if (!fs.existsSync(USERS_FILE)) return reply("තවමත් පරිශීලකයින් ලියාපදිංචි වී නැත.");
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    reply(`පණිවිඩය යවමින් පවතී... (සමස්ත ගොනුව: ${users.length})`);

    let count = 0;
    for (let jid of users) {
        try {
            await hansaka.sendMessage(jid + "@s.whatsapp.net", { text: `📢 *olya MD - BROADCAST*\n\n${q}\n\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝` });
            count++;
        } catch (e) {
            console.log(`Failed for ${jid}`);
        }
    }
    reply(`සාර්ථකව පණිවිඩ ${count} ක් යවන ලදී. ✅`);
});

cmd({
    pattern: "google",
    desc: "Search anything on Google.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ සෙවිය යුතු දේ පවසන්න.");
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/google?query=${encodeURIComponent(q)}`);
        const result = res.data.result;
        let text = `🔍 *Google Search Results* for: _${q}_\n\n`;
        result.forEach((v, i) => {
            if (i < 5) text += `*${i+1}. ${v.title}*\n🔗 ${v.link}\n\n`;
        });
        
        await sendButtons(hansaka, from, {
            image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png" },
            text: text.trim(),
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });
    } catch (e) {
        reply("❌ සෙවීමේදී දෝෂයක් ඇතිවිය.");
    }
});

cmd({
    pattern: "owner",
    alias: ["contact", "dev"],
    desc: "Get owner's contact card.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from }) => {
    const vcard = 'BEGIN:VCARD\n'
                + 'VERSION:3.0\n' 
                + 'FN:Hansaka P Fernando\n'
                + 'ORG:Olya Team;\n'
                + 'TEL;type=CELL;type=VOICE;waid=94779912589:+94 77 991 2589\n'
                + 'END:VCARD';
    
    await hansaka.sendMessage(from, { 
        contacts: { 
            displayName: 'Hansaka P Fernando', 
            contacts: [{ vcard }] 
        }
    }, { quoted: mek });
});
