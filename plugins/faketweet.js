const { cmd } = require('../command');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "faketweet",
    alias: ["tweet", "tweetmaker", "ft"],
    desc: "Create a fake tweet image.",
    category: "fun",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply, sender, pushname }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර Tweet එකට අවශ්‍ය Text එක ලබාදෙන්න.\nඋදා: .faketweet මම තමයි හොඳටම කරල තියෙන්නෙ"));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "🐦", key: mek.key } });
        
        // Try getting user profile picture
        let ppUrl;
        try {
            ppUrl = await hansaka.profilePictureUrl(sender, 'image');
        } catch {
            ppUrl = "https://i.ibb.co/tCKY1t5/default-avatar-profile-icon-social-media-user-free-vector.jpg"; // Fallback image
        }
        
        let authorName = pushname || "Olya_User";
        let usernameText = "CyberUser";
        
        // Free robust canvas API for Twitter
        const apiUrl = `https://some-random-api.com/canvas/misc/tweet?displayname=${encodeURIComponent(authorName)}&username=${encodeURIComponent(usernameText)}&avatar=${encodeURIComponent(ppUrl)}&comment=${encodeURIComponent(q)}`;
        
        await hansaka.sendMessage(from, { 
            image: { url: apiUrl }, 
            caption: formatMsg("🟢 *Tweet Render Complete*", "මෙහි පෙනෙන පණිවිඩය සත්‍ය X (Twitter) පණිවිඩයක් නොව, Olya මගින් AI Image Generator භාවිතයෙන් හැඩගැන්වූවකි 🤖.") 
        }, { quoted: mek });

    } catch(e) {
        console.error(e);
        reply(formatMsg("🔴 *Render Error*", "🤖 බොරු Tweet එක Rendering කිරීම අසාර්ථකයි."));
    }
});
