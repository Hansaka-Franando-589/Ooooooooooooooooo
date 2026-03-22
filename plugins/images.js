const { cmd } = require('../command');
const axios = require('axios');
const { sendButtons } = require('gifted-btns');

cmd({
    pattern: "img",
    alias: ["photo", "image"],
    desc: "Generate AI Image for free.",
    category: "ai",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර රූපය ගැන විස්තරයක් ලබා දෙන්න. (උදා: .img space ship)");

    try {
        await hansaka.sendMessage(from, { react: { text: "🎨", key: mek.key } });
        
        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(q)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 10000)}`;

        await sendButtons(hansaka, from, {
            image: { url: imageUrl },
            text: `🎨 *AI Image Generated*\n\n🔍 *Prompt:* ${q}`,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `.img ${q}`, text: "🔄 Try Again (Different)" },
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply("සමාවන්න, රූපය නිර්මාණය කිරීමට නොහැකි විය.");
    }
});

cmd({
    pattern: "imgsearch",
    desc: "Search for images on the web.",
    category: "search",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර සෙවිය යුතු දේ පවසන්න.");

    try {
        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        
        const res = await axios.get(`https://api.vreden.my.id/api/gimage?query=${encodeURIComponent(q)}`);
        const results = res.data.result;
        
        if (!results || results.length === 0) return reply("කිසිදු ප්‍රතිඵලයක් හමු නොවීය.");

        await sendButtons(hansaka, from, {
            image: { url: results[0] },
            text: `🌐 *Image Search Results* for: ${q}`,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply("සෙවීමේදී දෝෂයක් ඇතිවිය.");
    }
});
