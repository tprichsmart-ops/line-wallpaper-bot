import express from "express";
import * as line from "@line/bot-sdk";

const app = express();

// ===============================
// 靜態圖片路徑
// ===============================
app.use("/images", express.static("public"));

// ===============================
// 環境變數
// ===============================
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

// ===============================
// 關鍵字對照表
// ===============================
const keywordMap = {
  "成功": {
    file: "success.png",
    text: "🏆 成功模式啟動中。\n不急著衝刺，但每一步都算數。"
  },
  "業績": {
    file: "sales.png",
    text: "📈 進度條幫你偷偷往前推一格。\n今年努力有回音，辛苦也值得。"
  },
  "有錢": {
    file: "rich.png",
    text: "💰 財氣已幫你放進口袋。\n願今年進帳穩穩來，也能留點時間給自己。"
  },
  "好運": {
    file: "luck.png",
    text: "🍀 好消息正在路上。\n願今年多一點驚喜，少一點驚嚇 😄"
  }
};

// ===============================
// 同義詞（依你指定）
// ===============================
const alias = {
  // 成功
  "勝利": "成功",
  "達標": "成功",
  "突破": "成功",
  "上榜": "成功",
  "升遷": "成功",
  "升官": "成功",

  // 業績
  "成交": "業績",
  "爆單": "業績",
  "接案": "業績",
  "事業": "業績",

  // 有錢
  "賺錢": "有錢",
  "發財": "有錢",
  "中獎": "有錢",
  "賺大錢": "有錢",
  "超有錢": "有錢",
  "很有錢": "有錢",

  // 好運
  "幸運": "好運",
  "好事": "好運",
  "開運": "好運",
  "轉運": "好運",
  "吉": "好運",
  "大吉": "好運",
  "順利": "好運"
  "大吉大利": "好運",
};

function normalize(text) {
  const t = (text || "").trim();
  return alias[t] || t;
}

function makeImageUrl(filename) {
  return `${PUBLIC_BASE_URL}/images/${filename}`;
}

// ===============================
// 健康檢查
// ===============================
app.get("/", (req, res) => {
  res.send(
    "LINE bot running ✅\n" +
    `PUBLIC_BASE_URL=${PUBLIC_BASE_URL}\n` +
    `A_KEYS=${process.env.A_CHANNEL_SECRET && process.env.A_CHANNEL_ACCESS_TOKEN ? "SET" : "MISSING"}\n` +
    `B_KEYS=${process.env.B_CHANNEL_SECRET && process.env.B_CHANNEL_ACCESS_TOKEN ? "SET" : "MISSING"}\n`
  );
});

// ===============================
// 多帳號支援
// ===============================

function makeConfig(prefix) {
  return {
    channelSecret: process.env[`${prefix}_CHANNEL_SECRET`],
    channelAccessToken: process.env[`${prefix}_CHANNEL_ACCESS_TOKEN`]
  };
}

function makeClient(prefix) {
  const { channelAccessToken } = makeConfig(prefix);
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken
  });
}

async function handleEvent(event, client) {
  if (event.type !== "message") return;
  if (event.message.type !== "text") return;

  const key = normalize(event.message.text);
  const hit = keywordMap[key];

  // ❌ 沒命中關鍵字就完全不回
  if (!hit) return;

  const imageUrl = makeImageUrl(hit.file);

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      { type: "text", text: hit.text },
      {
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      }
    ]
  });
}

function mountWebhook(path, prefix) {
  const config = makeConfig(prefix);

  if (!config.channelSecret || !config.channelAccessToken) {
    app.post(path, express.json(), (req, res) => {
      res.status(200).send(
        `Webhook ${path} OK, but ${prefix} keys missing.`
      );
    });
    return;
  }

  const client = makeClient(prefix);

  app.post(path, line.middleware(config), async (req, res) => {
    try {
      const events = req.body.events || [];
      await Promise.all(
        events.map((event) => handleEvent(event, client))
      );
      res.status(200).send("OK");
    } catch (err) {
      console.error(`Webhook error on ${path}:`, err);
      res.status(500).send("ERR");
    }
  });
}

// ===============================
// 掛載兩個官方帳號
// ===============================
mountWebhook("/webhook/a", "A");
mountWebhook("/webhook/b", "B");

// ===============================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on port", port);
});
