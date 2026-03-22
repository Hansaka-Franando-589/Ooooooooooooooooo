const { cmd } = require('../command');
const axios = require('axios');
const { sendButtons } = require('gifted-btns');

cmd({
    pattern: "search",
    alias: ["ask", "google", "find"],
    desc: "Search the web for information",
    category: "search",
    react: "🔍",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර සෙවුම් පදයක් ලබාදෙන්න.\n*උදා:* .search ශ්‍රී ලංකාවේ හොඳම පාසල් ලැයිස්තුව");
    
    await reply("👩‍💼 _Olya is searching the web..._ 🌐");
    
    try {
        const promptInfo = `Act as an intelligent web search engine and assistant named Olya. 
        The user is searching for: "${q}".
        Provide a comprehensive, accurate, and easy-to-read answer in Sinhala (if the query is in Sinhala) or English. 
        Use bullet points for readability and formatting. 
        Do not use any markdown code blocks wrapping the response. Just the raw text. Do not add custom footers.`;
        
        const promptUrl = `https://text.pollinations.ai/${encodeURIComponent(promptInfo)}`;
        const res = await axios.get(promptUrl, { timeout: 45000 });
        
        let outputStr = res.data;
        if (typeof outputStr === 'string' && outputStr.includes('```')) {
            outputStr = outputStr.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
        }
        
        await sendButtons(conn, from, {
            text: outputStr,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `.imagine ${q}`, text: "🎨 Try Image Generate" },
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });
        
    } catch (e) {
        console.error("Web Search Error:", e);
        reply("❌ සෙවීම අසාර්ථක විය. පසුව උත්සාහ කරන්න.");
    }
});
