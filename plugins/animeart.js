const { cmd } = require('../command');
const axios = require('axios');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "animeart",
    alias: ["animeimg", "drawanime"],
    desc: "Generate Anime AI Images.",
    category: "fun",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර ඔබට අවශ්‍ය Anime රූපයේ දැක්විය යුතු දේ ඉංග්‍රීසියෙන් දෙන්න.\nඋදා: .animeart A lone samurai under a cherry blossom tree"));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "🎨", key: mek.key } });
        
        // Enhance prompt for anime style safely without breaking Pollinations tag parser
        const promptText = `anime style art ${q}`;
        const apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=1024&nologo=true`;
        
        // Fetch as buffer to circumvent whatsapp direct link download restrictions
        const res = await axios.get(apiUrl, { 
            responseType: 'arraybuffer',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        const buffer = Buffer.from(res.data, 'binary');
        
        await hansaka.sendMessage(from, { 
            image: buffer, 
            caption: formatMsg("🟢 *Anime Matrix Rendered*", `Prompt: ${q}\nAI Model: Custom Anime Generator 🤖.`) 
        }, { quoted: mek });

    } catch(e) {
        console.error("Anime art generation error:", e);
        reply(formatMsg("🔴 *Generation Error*", "🤖 Anime AI Image එක නිර්මාණය අසාර්ථක විය."));
    }
});
