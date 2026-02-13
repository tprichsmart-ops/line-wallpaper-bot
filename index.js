import express from "express";
import line from "@line/bot-sdk";

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
  "成功": { file: "success.png", text: "🎉 成功模式啟動！送你桌布～" },
  "業績": { file: "sales.png", text: "📈 業績起飛！送你桌布～" },
  "有錢": { file: "rich.png", text: "💰 有錢有閒有福氣！送你桌布～" },
  "好運": { file: "luck.png", text: "🍀 好運黏上身！送你桌布～" }
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
