const { cmd } = require('../command');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "qr",
    alias: ["qrcode", "makeqr"],
    desc: "Generate QR code.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 QR කේතයක් සෑදීමට අවශ්‍ය Text එක හෝ Link එක දෙන්න.\nඋදා: .qr https://github.com/hansaka"));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "🔳", key: mek.key } });
        
        // Fast QR code API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`;
        
        await hansaka.sendMessage(from, { 
            image: { url: qrUrl }, 
            caption: formatMsg("🟢 *QR Generator Active*", "ඔබගේ දත්ත වලට අදාළව ජනනය කරන ලද QR කේතය (Matrix) මෙන්න 🤖.") 
        }, { quoted: mek });

    } catch(e) {
        reply(formatMsg("🔴 *System Error*", "🤖 QR Matrix පද්ධතියෙහි දෝෂයක්."));
    }
});
