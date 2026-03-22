const { cmd } = require('../command');
const fg = require('api-dylux');
const { sendButtons } = require('gifted-btns');

// 1. TikTok Downloader
cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    desc: "Download TikTok videos without watermark",
    category: "download",
    react: "📱",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q || !q.includes('tiktok.com')) {
        return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර නිවැරදි TikTok ලින්ක් එකක් ලබාදෙන්න.\n*උදා:* .tiktok https://www.tiktok.com/...");
    }

    try {
        await hansaka.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        let result = await fg.tiktok(q);
        
        let videoUrl = result.play || result.nowm || result.video || result.hd;
        if (!videoUrl) return reply("❌ වීඩියෝව සොයාගත නොහැකි විය.");

        let captionText = `📱 *Olya TikTok Downloader*\n\n`;
        if (result.title) captionText += `📝 *Title:* ${result.title}\n`;
        if (result.author && result.author.nickname) captionText += `👤 *Author:* ${result.author.nickname}\n`;
        
        await sendButtons(hansaka, from, {
            video: { url: videoUrl },
            text: captionText,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error("TikTok DL Error:", e);
        reply("❌ TikTok ලින්ක් එක download වීමේදී දෝෂයක් ඇතිවිය. ලින්ක් එක private හෝ ඉවත් කරලා වෙන්න පුළුවන්.");
    }
});

// 2. Instagram Downloader
cmd({
    pattern: "ig",
    alias: ["insta", "igdl", "reel"],
    desc: "Download Instagram Reels/Videos",
    category: "download",
    react: "📸",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q || !q.includes('instagram.com')) {
        return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර නිවැරදි Instagram ලින්ක් එකක් පවසන්න.\n*උදා:* .ig https://www.instagram.com/reel/...");
    }

    try {
        await hansaka.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        let result = await fg.igdl(q);
        if (!result || result.length === 0) return reply("❌ Instagram වීඩියෝව සොයාගත නොහැකි විය.");

        let mediaUrl = result[0].url || result[0].download_link;
        if (!mediaUrl) mediaUrl = result[0];
        
        await sendButtons(hansaka, from, {
            video: { url: mediaUrl },
            text: `📸 *Olya Instagram Downloader*\n\nඔබගේ Instagram වීඩියෝව සාර්ථකව ලබාගත්තා.`,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error("IG DL Error:", e);
        reply("❌ Instagram ලින්ක් එක download වීමේදී දෝෂයක් ඇතිවිය. ඒක private ගිණුමක් විය හැක.");
    }
});
