const { cmd } = require('../command');
const axios = require('axios');
const { sendButtons } = require('gifted-btns');

cmd({
    pattern: "movie",
    alias: ["film", "tvshow"],
    desc: "Get details about a Movie or TV Show",
    category: "search",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර චිත්‍රපටයේ හෝ කතාමාලාවේ නම ලබාදෙන්න.\n*උදා:* .movie Inception");
    
    await reply("👩‍💼 _Olya is searching for movie details..._ 🍿");
    
    try {
        const promptInfo = `Provide a detailed, beautifully formatted WhatsApp summary for the movie or TV show "${q}". 
        Include:
        - 🎬 Title & Release Year
        - ⭐ IMDb Rating
        - 🎭 Genre
        - 🎬 Director
        - 👥 Main Cast
        - 📖 Plot Summary (in Sinhala or simple English)
        
        Make it visually appealing with emojis. Do not add any footers yourself. 
        Do not include markdown blocks like \`\`\` text \`\`\`. Just return the raw text.`;
        
        const promptUrl = `https://text.pollinations.ai/${encodeURIComponent(promptInfo)}`;
        const res = await axios.get(promptUrl, { timeout: 30000 });
        
        let outputStr = res.data;
        if (typeof outputStr === 'string' && outputStr.includes('```')) {
            outputStr = outputStr.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
        }
        
        const posterUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`Cinematic movie poster for ${q}, high quality, dramatic lighting`)}?width=768&height=1024&nologo=true`;
        
        await sendButtons(conn, from, {
            image: { url: posterUrl },
            text: outputStr,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `.search download ${q} movie links`, text: "🔍 Search Downloads" },
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });
        
    } catch (e) {
        console.error("Movie Search Error:", e);
        reply("❌ විස්තර සොයාගැනීමට නොහැකි විය. පසුව උත්සාහ කරන්න.");
    }
});
