const { cmd, commands } = require("../command");
const config = require("../config");
const { runtime } = require("../lib/functions");
const { sendInteractiveMessage } = require('gifted-btns');

cmd(
  {
    pattern: "menu",
    alias: ["help", "list", "panel", "allmenu"],
    desc: "Displays all available commands",
    category: "main",
    filename: __filename,
  },
  async (hansaka, mek, m, { from, pushname, prefix }) => {
    try {
      const categories = {};
      
      // Categorize commands
      for (let cmdData of commands) {
        if (cmdData.dontAddCommandList || !cmdData.pattern) continue;
        const cat = cmdData.category?.toLowerCase() || "other";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({
          pattern: cmdData.pattern,
          desc: cmdData.desc || "No description"
        });
      }

      const listEmoji = "🔹";
      const categoryMap = {
          "main": "✨ 𝖤𝗌𝗌𝖾𝗇𝗍𝗂𝖺𝗅𝗌",
          "ai": "🤖 𝖠.𝖨. 𝖥𝖾𝖺𝗍𝗎𝗋𝖾𝗌",
          "download": "📥 𝖣𝗈𝗐𝗇𝗅𝗈𝖺𝖽𝖾𝗋𝗌",
          "search": "🔍 𝖱𝖾𝗌𝖾𝖺𝗋𝖼𝗁 & 𝖲𝖾𝖺𝗋𝖼𝗁",
          "group": "👥 𝖦𝗋𝗈𝗎𝗉 𝖢𝗈𝗇𝗍𝗋𝗈𝗅𝗌",
          "owner": "👑 𝖮𝗐𝗇𝖾𝗋 𝖤𝗑𝖼𝗅𝗎𝗌𝗂𝗏𝖾",
          "fun": "🎮 𝖤𝗇𝗍𝖾𝗋𝗍𝖺𝗂𝗇𝗆𝖾𝗇𝗍",
          "image": "🌉 𝖨𝗆𝖺𝗀𝖾 𝖤𝖽𝗂𝗍𝗂𝗇𝗀",
          "convert": "🔄 𝖥𝗂𝗅𝖾 𝖢𝗈𝗇𝗏𝖾𝗋𝗍𝖾𝗋𝗌",
          "other": "📂 𝖬𝗂𝗌𝖼𝖾𝗅𝗅𝖺𝗇𝖾𝗈𝗎𝗌"
      };

      const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const uptime = runtime(process.uptime());

      let menuBody = `╭───❮ ✧ 𝓞𝓵𝔂𝓪 𝓐𝓘 𝓜𝓮𝓷𝓾 ✧ ❯───
│ 👤 *User:* ${pushname}
│ 👑 *Creator:* ${config.OWNER_NAME}
│ ⏳ *Uptime:* ${uptime}
│ 💾 *Memory:* ${ram} MB
│ ⚙️ *Prefix:* [ ${prefix} ]
╰───────────────────────────

🔮 *Discover my capabilities below.*
_Tap the interactive list to explore commands!_ ✨`;

      // Build List Sections
      let sections = [];
      for (const [cat, cmds] of Object.entries(categories)) {
        let rows = cmds.map(c => ({
            title: `${listEmoji} ${prefix}${c.pattern}`,
            description: c.desc || "Olya AI System Command",
            id: `${prefix}${c.pattern}`
        }));
        
        const styledTitle = categoryMap[cat.toLowerCase()] || `🏷️ ${cat.toUpperCase()}`;
        
        sections.push({
            title: styledTitle,
            rows: rows
        });
      }

      await sendInteractiveMessage(hansaka, from, {
          title: "🦋 𝓞𝓵𝔂𝓪 𝓐𝓘 - 𝓟𝓻𝓮𝓶𝓲𝓾𝓶 𝓑𝓸𝓽 🦋\n",
          text: menuBody,
          footer: `👾 Powered by ${config.OWNER_NAME}`,
          image: { url: config.MENU_IMG },
          contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
              title: "🦋 ✧ 𝓞𝓵𝔂𝓪 𝓐𝓘 𝓜𝓮𝓷𝓾 ✧ 🦋",
              body: `Created By ${config.OWNER_NAME}`,
              mediaType: 1,
              thumbnailUrl: config.MENU_IMG,
              sourceUrl: `https://wa.me/${config.OWNER_NUMBER}`,
              renderLargerThumbnail: true
            }
          },
          aimode: true,
          interactiveButtons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '📂 View All Commands',
                sections: sections
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '⚡ System Status',
                id: `${prefix}system`
              })
            },
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: 'Owner WhatsApp',
                url: `https://wa.me/${config.OWNER_NUMBER}`
              })
            }
          ]
      }, { quoted: mek });

    } catch (err) {
      console.error("Menu Gen Error:", err);
      m.reply("❌ Error generating menu.");
    }
  }
);
