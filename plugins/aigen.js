const { cmd } = require('../command');
const axios = require('axios');
const { sendButtons } = require('gifted-btns');

cmd({
    pattern: "imagine",
    alias: ["aigen", "draw", "generate"],
    desc: "Generate an image using Pollinations AI",
    category: "ai",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, pushname }) => {
    if (!q) return reply(`💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර කුමක් හෝ විස්තරයක් ලබාදෙන්න.\n*උදා:* .imagine A futuristic city in Sri Lanka at night`);
    
    await reply("👩‍💼 _Olya is generating your image. Please wait a few seconds..._ 🎨");
    
    try {
        const prompt = encodeURIComponent(q);
        const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true`;
        
        await sendButtons(conn, from, {
            image: { url: imageUrl },
            text: `🎨 *Olya AI Image Generator*\n\n💭 *Prompt:* _${q}_\n👤 *Requested By:* ${pushname}`,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `.imagine ${q} cartoon anime style`, text: "🎨 Cartoon Style" },
                { id: `.imagine ${q} hyper realistic 8k ultra detail`, text: "📸 Realistic 8K" },
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });
        
    } catch (e) {
        console.error("AI Gen Error:", e);
        reply("❌ ඡායාරූපය සැකසීමේදී දෝෂයක් ඇතිවිය. පසුව උත්සාහ කරන්න.");
    }
});
