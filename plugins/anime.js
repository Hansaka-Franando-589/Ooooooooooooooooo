const { cmd } = require('../command');
const axios = require('axios');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "anime",
    desc: "Search details of any Anime.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර Anime එකෙහි නම ලබාදෙන්න.\nඋදා: .anime Naruto"));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "⛩️", key: mek.key } });
        
        // Using Jikan API for top-tier anime stats
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`);
        
        if (response.data && response.data.data && response.data.data.length > 0) {
            let anime = response.data.data[0];
            
            let title = anime.title;
            let episodes = anime.episodes || "Ongoing";
            let score = anime.score || "N/A";
            let rating = anime.rating || "N/A";
            let year = anime.year || "N/A";
            let synopsis = anime.synopsis ? anime.synopsis.substring(0, 300) + "..." : "No synopsis available.";
            
            let body = `📌 *Title:* ${title}\n🎬 *Episodes:* ${episodes}\n⭐ *Score:* ${score}/10\n🕰️ *Year:* ${year}\n🔞 *Rating:* ${rating}\n\n📝 *Synopsis:*\n${synopsis}`;
            let image = anime.images.jpg.large_image_url;
            
            await hansaka.sendMessage(from, { 
                image: { url: image }, 
                caption: formatMsg("🟢 *Anime Matrix Scanned*", body) 
            }, { quoted: mek });
        } else {
             reply(formatMsg("🔴 *Search Error*", "🤖 ඔබ ඇතුළත් කළ නමට අදාළ Anime එකක් හමු නොවීය."));
        }
    } catch(e) {
        console.error("Anime search error", e);
        reply(formatMsg("🔴 *System Error*", "🤖 Anime Database එකට Access ලබාගැනීමට නොහැක."));
    }
});
