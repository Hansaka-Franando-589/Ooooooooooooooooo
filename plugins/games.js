const { cmd } = require('../command');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

cmd({
    pattern: "coinflip",
    alias: ["flip", "coin"],
    desc: "Flip a coin game.",
    category: "fun",
    filename: __filename
},
async (hansaka, mek, m, { from, reply }) => {
    const result = Math.random() < 0.5 ? "🔴 Heads (සිරස/බොක්ක)" : "🔵 Tails (අගය/මල)";
    
    // Simple suspense
    let sentMsg = await hansaka.sendMessage(from, { text: "🪙 *Coin Flip Initiated...*" }, { quoted: mek });
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    await wait(1000);
    await hansaka.sendMessage(from, { text: "🪙 *Coin Flip Initiated...*\nකාසිය උඩින් පාවෙමින් පවතී... ⚡", edit: sentMsg.key });
    
    await wait(1500);
    await hansaka.sendMessage(from, { text: formatMsg("🟢 *Coin Flip Result*", `The virtual coin has landed.\n\nResult: *${result}* ✅`), edit: sentMsg.key });
});

cmd({
    pattern: "dice",
    alias: ["roll"],
    desc: "Roll a dice.",
    category: "fun",
    filename: __filename
},
async (hansaka, mek, m, { from, reply }) => {
    const diceNumber = Math.floor(Math.random() * 6) + 1;
    
    let sentMsg = await hansaka.sendMessage(from, { text: "🎲 *Rolling the Dice...*" }, { quoted: mek });
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    await wait(1500);
    await hansaka.sendMessage(from, { text: formatMsg("🟢 *Dice Result*", `Dice එක නැවතුණා.\n\nඅංකය: *${diceNumber}* 🎲 ✅`), edit: sentMsg.key });
});
