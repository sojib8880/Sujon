const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// -----------------------------
// Search by song name
// -----------------------------
app.get("/search", async (req, res) => {
  const song = req.query.song;
  if (!song) return res.status(400).json({ error: "Missing song name" });

  // Use yt-dlp search
  // List top 5 results
  const cmd = `yt-dlp "ytsearch5:${song}" --print json`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: "Search failed", details: stderr });

    // Each line is a JSON object
    const lines = stdout.split("\n").filter(l => l.trim());
    const results = lines.map(l => {
      try {
        const info = JSON.parse(l);
        return {
          id: info.id,
          title: info.title,
          url: info.webpage_url,
          duration: info.duration,
          channel: info.uploader,
          thumbnail: info.thumbnail
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json(results);
  });
});

// -----------------------------
// Download video/audio by link
// -----------------------------
app.get("/ytvideo", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const format = req.query.format || "mp4"; // default video
  const fileName = `video_${Date.now()}.${format}`;
  const filePath = path.join(__dirname, fileName);

  // yt-dlp command
  // -f bestvideo+bestaudio for mp4, bestaudio for mp3
  let cmd;
  if (format === "mp3") {
    cmd = `yt-dlp -x --audio-format mp3 -o "${filePath}" "${url}"`;
  } else {
    cmd = `yt-dlp -f "bestvideo+bestaudio/best" --merge-output-format mp4 -o "${filePath}" "${url}"`;
  }

  exec(cmd, (err) => {
    if (err || !fs.existsSync(filePath)) {
      return res.status(500).json({ error: "Download failed" });
    }

    res.download(filePath, fileName, () => {
      try { fs.unlinkSync(filePath); } catch {}
    });
  });
});

app.listen(PORT, () => console.log(`YT API running on http://0.0.0.0:${PORT}`));