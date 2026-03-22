const { cmd } = require('../command');
const axios = require('axios');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "github",
    alias: ["gh", "clone", "repo"],
    desc: "Clone a github repo and download as zip.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර GitHub Repository ලිපිනය ලබාදෙන්න.\nඋදා: .github https://github.com/hansaka/repo"));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "📦", key: mek.key } });
        
        const repoUrl = q.trim();
        const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
        const match = repoUrl.match(regex);
        
        if (!match) return reply(formatMsg("🔴 *Invalid Link*", "🤖 කරුණාකර නිවැරදි GitHub Link එකක් ලබාදෙන්න."));
        
        const user = match[1];
        const repo = match[2].replace(".git", "");
        
        const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
        
        let body = `📦 *Repository:* ${repo}\n👤 *Owner:* ${user}\n\nදත්ත ගබඩාව Download කරමින් පවතී... ⚙️`;
        
        // Test if the repo exists / is reachable
        await axios.head(zipUrl); 
        
        await hansaka.sendMessage(from, { 
            document: { url: zipUrl }, 
            mimetype: "application/zip", 
            fileName: `${repo}.zip`, 
            caption: formatMsg("🟢 *GitHub Cloner*", body) 
        }, { quoted: mek });

    } catch(e) {
        if (e.response && e.response.status === 404) {
            reply(formatMsg("🔴 *Repository Error*", "🤖 මෙම Repository එක Private එකක් හෝ එය මකා දමා ඇත."));
        } else {
            reply(formatMsg("🔴 *System Error*", "🤖 Repository එක ලබාගැනීමට නොහැකි විය. ගොනුව විශාල වැඩි විය හැක."));
        }
    }
});
