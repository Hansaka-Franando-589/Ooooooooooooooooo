const { cmd } = require('../command');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendButtons } = require('gifted-btns');

cmd({
    pattern: "read",
    alias: ["ocr", "text"],
    desc: "Extract text from an image (OCR)",
    category: "ai",
    react: "📝",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    const isImage = mek.message?.imageMessage || (mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);
    
    if (!isImage) {
        return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ කරුණාකර ඡායාරූපයක් (Image) සමග \`.read\` විධානය යොදන්න. (ෆොටෝ එකකට Reply කරන්න හෝ ෆොටෝ එකක් යවද්දී Caption එකට .read දාන්න)");
    }
    
    await reply("👩‍💼 _Olya Vision is scanning the image for text..._ 🔍");
    
    try {
        let actualMek = mek.message?.imageMessage ? mek : { message: mek.message.extendedTextMessage.contextInfo.quotedMessage };
        const buffer = await downloadMediaMessage(actualMek, 'buffer', {}, { logger: console });
        const base64Image = buffer.toString('base64');
        
        const response = await axios.post('https://text.pollinations.ai/', {
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                        },
                        {
                            type: 'text',
                            text: "Extract all the text visible in this image accurately. Maintain the original language and formatting. If there is no text, reply with 'NO_TEXT_FOUND'."
                        }
                    ]
                }
            ],
            model: 'openai',
            jsonMode: false
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 45000
        });

        const extractedText = response.data?.choices?.[0]?.message?.content?.trim() || '';
        
        if (!extractedText || extractedText.includes('NO_TEXT_FOUND')) {
            return reply("⚠️ මේ ෆොටෝ එකේ කියවන්න පුළුවන් අකුරු කිසිවක් Olya ට හඳුනාගන්න බැරි වුණා.");
        }
        
        const finalMessage = `📝 *Olya Text Extractor (OCR)*\n\n${extractedText}`;
        
        await sendButtons(conn, from, {
            text: finalMessage,
            footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
            aimode: true,
            buttons: [
                { id: `btn_action_menu`, text: "📋 Main Menu" }
            ]
        }, { quoted: mek });
        
    } catch (e) {
        console.error("OCR Error:", e);
        reply("❌ දෝෂයක් ඇතිවිය. ෆොටෝ එකේ Quality මදි හෝ System Error එකක්.");
    }
});
