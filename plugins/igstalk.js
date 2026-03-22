const { cmd } = require('../command');
const axios = require('axios');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "igstalk",
    alias: ["stalk", "st"],
    desc: "Stalk Instagram accounts.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර Instagram Username එක ලබාදෙන්න. (උදා: .stalk leomessi)"));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "👁️", key: mek.key } });
        
        const res = await axios.get(`https://api.vreden.my.id/api/igstalk?username=${encodeURIComponent(q)}`);
        
        if (res.data && res.data.result) {
            const data = res.data.result;
            let body = `👤 *Name:* ${data.fullName}\n🔗 *Username:* ${data.username}\n\n👥 *Followers:* ${data.followers}\n👣 *Following:* ${data.following}\n📸 *Posts:* ${data.posts}\n\n📝 *Bio:* ${data.biography}`;
            
            await hansaka.sendMessage(from, { 
                image: { url: data.profilePic }, 
                caption: formatMsg("🟢 *Instagram Recon Complete*", body) 
            }, { quoted: mek });
        } else {
            throw new Error("Target missing");
        }
    } catch(e) {
        reply(formatMsg("🔴 *System Error*", "🤖 ගිණුම සෙවීමේදී දෝෂයක්. (Username වැරදි හෝ Private Account එකක් විය හැක)"));
    }
});
