const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
// Add fetch polyfill for Node.js if needed
let fetch = global.fetch;
if (!fetch) fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

cmd({
    pattern: "yt2",
    alias: ["play2", "music"],
    react: "🎵",
    desc: "Download audio from YouTube",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let videoUrl, title;
        // Check if it's a URL
        if (q.match(/(youtube\.com|youtu\.be)/)) {
            videoUrl = q;
            // Improved YouTube video ID extraction
            const idMatch = q.match(/(?:v=|\/|be\/|embed\/|shorts\/|watch\?v=)([0-9A-Za-z_-]{11})/);
            const videoId = idMatch ? idMatch[1] : null;
            if (!videoId) return await reply("❌ Invalid YouTube URL!");
            const videoInfo = await yts({ videoId });
            if (!videoInfo || !videoInfo.title) return await reply("❌ Could not fetch video info!");
            title = videoInfo.title;
        } else {
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
        }

        await reply("⏳ Downloading audio...");

        // Use API to get audio
        const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        let response, data;
        try {
            response = await fetch(apiUrl);
            data = await response.json();
        } catch (err) {
            console.error('API fetch error:', err);
            return await reply("❌ Failed to fetch from API!");
        }

        // Debug: log API response
        if (!data || typeof data !== 'object') {
            console.error('API returned non-object:', data);
            return await reply("❌ API returned invalid response!");
        }
        if (!data.success) {
            console.error('API error:', data);
            return await reply(`❌ API error: ${data.message || 'Unknown error'}`);
        }
        if (!data.result || !data.result.download_url) {
            console.error('API missing download_url:', data);
            return await reply("❌ Failed to download audio! (No download_url)");
        }

        await conn.sendMessage(from, {
            audio: { url: data.result.download_url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!`);

    } catch (error) {
        console.error('Handler error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});

