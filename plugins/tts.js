const { cmd } = require('../command');
const googleTTS = require("google-tts-api");
const axios = require('axios');

cmd({
    pattern: "tts",
    alias: ["speak", "voice"],
    desc: "Convert text to Voice Note (Audio)",
    category: "ai",
    react: "🗣️",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර Olya ට කියවන්න අවශ්‍ය දේ ලබාදෙන්න.\n*උදා:* .tts සුභ උදෑසනක්!");
    
    try {
        await conn.sendPresenceUpdate('recording', from);
        
        // Use Sinhala as default since Olya speaks mostly Sinhala
        const audioUrl = googleTTS.getAudioUrl(q.substring(0, 200), {
            lang: 'si',
            slow: false,
            host: 'https://translate.google.com'
        });
        
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(from, { 
            audio: Buffer.from(audioRes.data, 'binary'), 
            mimetype: 'audio/mp4', 
            ptt: true 
        }, { quoted: mek });
        
    } catch (e) {
        console.error("TTS Error:", e);
        reply("❌ Voice Note එක සැකසීමේදී දෝෂයක් ඇතිවිය. පසුව උත්සාහ කරන්න.");
    }
});
