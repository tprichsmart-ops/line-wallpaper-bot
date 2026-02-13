import express from "express";
import * as line from "@line/bot-sdk";

const app = express();

// ✅ Render 會用環境變數提供
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// ✅ 讓 /images/xxx.jpg 變成公開圖片網址
app.use("/images", express.static("public"));

// 先用 placeholder，等 Render 有網址再換成真正網址
function imageUrl(req, filename) {
  const base = process.env.PUBLIC_BASE_URL; // 例如 https://xxx.onrender.com
  return `${base}/images/${filename}`;
}

const keywordMap = {
  "成功": { file: "success.png", text: "🏆 成功模式啟動中。\n不急著衝刺，但每一步都算數。" },
  "業績": { file: "sales.png", text: "📈 進度條幫你偷偷往前推一格。\n今年努力有回音，辛苦也值得。" },
  "有錢": { file: "rich.png", text: "💰 財氣已幫你放進口袋。\n願今年進帳穩穩來，也能留點時間給自己。" },
  "好運": { file: "luck.png", text: "🍀 好消息正在路上。\n願今年多一點驚喜，少一點驚嚇 😄" }
};

const alias = {
  "賺錢": "有錢",
  "發財": "有錢"
};

function normalize(text) {
  const t = (text || "").trim();
  return alias[t] || t;
}

// 健康檢查
app.get("/", (req, res) => res.send("LINE bot running ✅"));

// Webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    await Promise.all(events.map((e) => handleEvent(e)));
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("ERR");
  }
});

async function handleEvent(event) {
  if (event.type !== "message") return;
  if (event.message.type !== "text") return;

  const key = normalize(event.message.text);
  const hit = keywordMap[key];
  if (!hit) return; // 不命中就不回

  // 用 Render 的網址組出圖片直連
  const url = imageUrl(null, hit.file);

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      { type: "text", text: hit.text },
      {
        type: "image",
        originalContentUrl: url,
        previewImageUrl: url
      }
    ]
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));
