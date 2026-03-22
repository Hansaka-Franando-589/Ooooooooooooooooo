const { cmd } = require('../command');
const fg = require('api-dylux');
const yts = require('yt-search');
const { ytDownloaderState } = require('../lib/state');

cmd({
    pattern: "yt",
    alias: ["song", "ytdl", "video"],
    desc: "YouTube downloader with numbered menu.",
    category: "download",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply, senderNumber }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර සින්දුවේ නම හෝ YouTube ලින්ක් එක ලබා දෙන්න.");

    try {
        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        let url = q;
        if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
            const search = await yts(q);
            if (!search.all || search.all.length === 0) return reply("සොයාගත නොහැකි විය.");
            url = search.all[0].url;
        }

        const info = await fg.ytv(url);

        const menuText = `🎬 *Olya Media Downloader*

📌 *Title:* ${info.title}
⏱️ *Duration:* ${info.duration || 'N/A'}
👁️ *Views:* ${info.views || 'N/A'}

_ඔබට අවශ්‍ය ආකෘතිය පහත බොත්තම් මගින් තෝරන්න._`;

        const { sendButtons } = require('gifted-btns');
        await sendButtons(hansaka, from, {
            image: { url: info.thumbnail },
            text: menuText,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `.ytmp3_internal ${url}`, text: "🎧 Audio (MP3)" },
                { id: `.ytmp4_internal ${url}`, text: "🎥 Video (MP4)" },
                { id: `.ytmp3_doc_internal ${url}`, text: "📂 Audio Doc" }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error("YT Error:", e);
        reply("තොරතුරු ලබා ගැනීමට නොහැකි විය. (Error: " + e.message + ")");
    }
});

// Adding background commands that handle the actual downloads
// These can be called manually or via index.js trigger logic
cmd({ pattern: "ytmp3_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        await hansaka.sendMessage(from, { react: { text: "🎧", key: mek.key } });
        const data = await fg.yta(q);
        await hansaka.sendMessage(from, { audio: { url: data.dl_url }, mimetype: 'audio/mpeg' }, { quoted: mek });
    } catch (e) { reply("Audio download error: " + e.message); }
});

cmd({ pattern: "ytmp3_doc_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const data = await fg.yta(q);
        await hansaka.sendMessage(from, { document: { url: data.dl_url }, mimetype: 'audio/mpeg', fileName: `${data.title}.mp3` }, { quoted: mek });
    } catch (e) { reply("Document audio error: " + e.message); }
});

cmd({ pattern: "ytptt_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const data = await fg.yta(q);
        await hansaka.sendMessage(from, { audio: { url: data.dl_url }, mimetype: 'audio/mpeg', ptt: true }, { quoted: mek });
    } catch (e) { reply("Voice error: " + e.message); }
});

cmd({ pattern: "ytmp4_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        await hansaka.sendMessage(from, { react: { text: "🎥", key: mek.key } });
        const data = await fg.ytv(q);
        await hansaka.sendMessage(from, { video: { url: data.dl_url }, caption: `📌 ${data.title}\n👑 Olya Assistant` }, { quoted: mek });
    } catch (e) { reply("Video error: " + e.message); }
});

cmd({ pattern: "ytmp4_doc_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const data = await fg.ytv(q);
        await hansaka.sendMessage(from, { document: { url: data.dl_url }, mimetype: 'video/mp4', fileName: `${data.title}.mp4` }, { quoted: mek });
    } catch (e) { reply("Document video error: " + e.message); }
});

// --- FACEBOOK INTERNAL HANDLERS ---
cmd({ pattern: "fbmp3_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        await hansaka.sendMessage(from, { react: { text: "🎧", key: mek.key } });
        const data = await fg.fbdl(q);
        const dl_url = data.video_hd || data.video_sd || data.url;
        await hansaka.sendMessage(from, { audio: { url: dl_url }, mimetype: 'audio/mp4' }, { quoted: mek });
    } catch (e) { reply("FB Audio error: " + e.message); }
});

cmd({ pattern: "fbmp3_doc_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const data = await fg.fbdl(q);
        const dl_url = data.video_hd || data.video_sd || data.url;
        await hansaka.sendMessage(from, { document: { url: dl_url }, mimetype: 'audio/mp4', fileName: `FB_Audio_${Date.now()}.m4a` }, { quoted: mek });
    } catch (e) { reply("FB Doc audio error: " + e.message); }
});

cmd({ pattern: "fbptt_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const data = await fg.fbdl(q);
        const dl_url = data.video_hd || data.video_sd || data.url;
        await hansaka.sendMessage(from, { audio: { url: dl_url }, mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
    } catch (e) { reply("FB Voice error: " + e.message); }
});

cmd({ pattern: "fbmp4_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        await hansaka.sendMessage(from, { react: { text: "🎥", key: mek.key } });
        const data = await fg.fbdl(q);
        const dl_url = data.video_hd || data.video_sd || data.url;
        await hansaka.sendMessage(from, { video: { url: dl_url }, caption: `📌 Facebook Video\n👑 Olya Assistant` }, { quoted: mek });
    } catch (e) { reply("FB Video error: " + e.message); }
});

cmd({ pattern: "fbmp4_doc_internal", dontAddCommandList: true, filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const data = await fg.fbdl(q);
        const dl_url = data.video_hd || data.video_sd || data.url;
        await hansaka.sendMessage(from, { document: { url: dl_url }, mimetype: 'video/mp4', fileName: `FB_Video_${Date.now()}.mp4` }, { quoted: mek });
    } catch (e) { reply("FB Document video error: " + e.message); }
});
