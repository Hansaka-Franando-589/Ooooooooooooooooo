const { cmd } = require('../command');
const truecallerjs = require('truecallerjs');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "track",
    alias: ["truecaller", "lookup"],
    desc: "Track phone number details using Truecaller.",
    category: "utility",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) {
        return reply(formatMsg("🔴 *Input Error*", "🤖 කරුණාකර Track කිරීමට අවශ්‍ය දුරකථන අංකය ලබාදෙන්න.\nඋදා: .track +94779912589"));
    }

    try {
        await hansaka.sendMessage(from, { react: { text: "📡", key: mek.key } });

        // Normalize number
        let number = q.replace(/[^0-9]/g, '');
        if (number.startsWith('0')) number = '94' + number.substring(1);

        // We will try to use the truecallerjs package if configured, else fallback to API
        // truecallerjs needs installationId. So an alternative public route is also good as a backup.
        
        let searchData = {
            number: number,
            countryCode: "LK",
            installationId: "a1k07--i-will-replace-this-token" // Truecaller requires a valid token
        };

        let resultTitle = ``;
        let carrier = ``;
        let email = ``;
        let image = ``;

        try {
            // Trying native truecallerjs
            const res = await truecallerjs.search(searchData);
            let json = res.json();
            if (json && json.data && json.data[0]) {
                const data = json.data[0];
                resultTitle = data.name;
                carrier = data.phones && data.phones[0] ? data.phones[0].carrier : "Unknown";
                email = data.internetAddresses ? data.internetAddresses[0].id : "N/A";
                image = data.image ? data.image : "";
            } else {
                throw new Error("Local truecaller module failed");
            }
        } catch (e) {
            // Backup free API in case truecallerjs lacks auth token
            const axios = require('axios');
            const backups = await axios.get(`https://api.vreden.my.id/api/truecaller?number=${number}`);
            if (backups.data && backups.data.result) {
                const data = backups.data.result;
                resultTitle = data.name;
                carrier = data.carrier || "Unknown";
                email = data.email || "N/A";
            } else {
                return reply(formatMsg("🔴 *Track Failed*", "🤖 මෙම අංකය සඳහා දත්ත හමු නොවීය."));
            }
        }

        let bodyInfo = `📞 දුරකථන අංකය: +${number}\n👤 ලියාපදිංචි නම: *${resultTitle || "නොදනී"}*\n📡 සේවා සපයන්නා: ${carrier}\n📧 Email: ${email}`;

        if (image) {
            await hansaka.sendMessage(from, { image: { url: image }, caption: formatMsg("🟢 *Trace Complete*", bodyInfo) }, { quoted: mek });
        } else {
            reply(formatMsg("🟢 *Trace Complete*", bodyInfo));
        }

    } catch (e) {
        console.error("Tracker Error:", e);
        reply(formatMsg("🔴 *System Error*", "🤖 Tracker එක ක්‍රියාත්මක කිරීමේදී දෝෂයක් ඇතිවිය."));
    }
});
