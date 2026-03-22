const { cmd } = require('../command');
const axios = require('axios');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "spotify",
    alias: ["spot"],
    desc: "Download Spotify songs.",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q || !q.includes('spotify.com')) return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර නිවැරදි Spotify Link එකක් ලබාදෙන්න."));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "🎵", key: mek.key } });
        
        const apiUrl = `https://api.vreden.my.id/api/spotify?url=${encodeURIComponent(q)}`;
        const res = await axios.get(apiUrl);
        
        if (res.data && res.data.result && res.data.result.download) {
            let data = res.data.result;
            let info = `🎵 *Title:* ${data.title}\n🎤 *Artist:* ${data.artist}`;
            
            // Send Audio document
            await hansaka.sendMessage(from, { 
                document: { url: data.download }, 
                mimetype: "audio/mpeg", 
                fileName: `${data.title}.mp3`, 
                caption: formatMsg("🟢 *Spotify Download*", info) 
            }, { quoted: mek });
        } else {
             throw new Error("API Failure");
        }
    } catch(e) {
        console.error("Spotify API error", e);
        reply(formatMsg("🔴 *Download Failed*", "🤖 මියුසික් එක Download කිරීමේදී දෝෂයක්. (API Data Error)"));
    }
});
