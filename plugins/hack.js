const { cmd } = require('../command');

cmd({
    pattern: "hack",
    desc: "Fake hacking animation.",
    category: "fun",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    let target = q ? q : "LOCAL SYSTEM";
    let sentMsg = await hansaka.sendMessage(from, { text: "🔴 *Olya System Hack Initiated* 🤖\n\n[>] Initializing Hack Protocol..." }, { quoted: mek });
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const hacks = [
        `🔴 *Olya System Hack* 🤖\n\n[System] Bypassing firewall for ${target}... 10% 📡`,
        `🔴 *Olya System Hack* 🤖\n\n[System] Decrypting AES-256 password hashes... 30% 🔓`,
        `🔴 *Olya System Hack* 🤖\n\n[System] Accessing secured Mainframe Database... 50% ⚙️`,
        `🔴 *Olya System Hack* 🤖\n\n[System] Extracting personal images & private chats... 80% 📸`,
        `🔴 *Olya System Hack* 🤖\n\n[System] Uploading data to Olya Cloud Servers... 99% ☁️`,
        `🟢 *Olya System Hack* 🤖\n\n✅ [System] Hacking Complete on ${target}!\nසියලුම දත්ත Olya Vault (ගබඩාවට) ලබා ගන්නാ ලදී 🔒.`
    ];

    for (let i = 0; i < hacks.length; i++) {
        await wait(1800); // Wait 1.8 seconds between edits
        await hansaka.sendMessage(from, { text: hacks[i], edit: sentMsg.key });
    }
});
