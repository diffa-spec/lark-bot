console.log("NEW VERSION DEPLOYED");

const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────
// 🔑 Get a fresh Lark tenant access token
// (tokens expire every 2 hours, so always fetch fresh)
// ─────────────────────────────────────────────
async function getTenantToken() {
  const res = await axios.post(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }
  );

  if (!res.data.tenant_access_token) {
    throw new Error("Failed to get tenant token: " + JSON.stringify(res.data));
  }

  return res.data.tenant_access_token;
}

// ─────────────────────────────────────────────
// 📨 Send a message to a Lark chat
// ─────────────────────────────────────────────
async function sendMessageToLark(chatId, message) {
  if (!chatId) {
    console.error("sendMessageToLark called without a chatId!");
    return;
  }

  try {
    const token = await getTenantToken();

    const res = await axios.post(
      "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id",
      {
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text: message }),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Message sent to Lark:", res.data);
  } catch (err) {
    console.error("❌ Lark send error:", err.response?.data || err.message);
  }
}

// ─────────────────────────────────────────────
// 💬 Handle incoming Lark bot messages
// (separated so we can respond to Lark immediately)
// ─────────────────────────────────────────────
async function handleLarkMessage(body) {
  try {
    const messageContent = JSON.parse(body.event.message.content);
    const userMessage = messageContent.text;
    const chatId = body.event.message.chat_id;

    console.log("Received message:", userMessage, "| chatId:", chatId);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You are a helpful assistant inside Lark chat. Reply naturally but concisely.`,
      messages: [{ role: "user", content: userMessage }],
    });

    const claudeReply = response.content[0].text;

    await sendMessageToLark(chatId, claudeReply);
  } catch (error) {
    console.error("❌ Chat handling error:", error);
  }
}

// ─────────────────────────────────────────────
// 🪝 Main Lark webhook endpoint
// ─────────────────────────────────────────────
app.post("/", async (req, res) => {
  const body = req.body;

  // Lark URL verification handshake
  if (body.type === "url_verification") {
    return res.json({ challenge: body.challenge });
  }

  // Handle message events
  if (body.event && body.event.message) {
    // ✅ Respond to Lark immediately (must be within ~3s or Lark will retry)
    res.json({});

    // Process asynchronously after responding
    handleLarkMessage(body).catch(console.error);
    return;
  }

  res.json({});
});

// ─────────────────────────────────────────────
// 🔍 Fetch full record details from Attio API
// ─────────────────────────────────────────────
async function getAttioRecord(objectId, recordId) {
  const res = await axios.get(
    `https://api.attio.com/v2/objects/${objectId}/records/${recordId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.data;
}

// ─────────────────────────────────────────────
// 📋 Attio webhook — notifies Lark when a
// record is created/updated in Attio
// ─────────────────────────────────────────────
app.post("/attio-webhook", async (req, res) => {
  const data = req.body;

  console.log("Attio event received:", JSON.stringify(data, null, 2));

  // ✅ Respond to Attio immediately
  res.sendStatus(200);

  // ✅ Only process the FIRST event to avoid duplicate messages
  const event = data.events?.[0];
  if (!event) return;

  const { object_id, record_id } = event.id;

  try {
    // Fetch the full record from Attio API
    const record = await getAttioRecord(object_id, record_id);

    console.log("Attio record fetched:", JSON.stringify(record, null, 2));

    // Extract values — the log above will show exact field names if these don't match
    const name =
      record.values?.name?.[0]?.full_name ||
      record.values?.name?.[0]?.value ||
      "Unknown";

    const company =
      record.values?.company?.[0]?.target_record?.values?.name?.[0]?.value ||
      record.values?.company?.[0]?.value ||
      "Unknown";

    const email =
      record.values?.email_addresses?.[0]?.email_address ||
      record.values?.primary_email_address?.[0]?.email_address ||
      "No email";

    const notifyChatId = process.env.LARK_NOTIFY_CHAT_ID;
    const eventLabel =
      event.event_type === "record.created"
        ? "New Contact Added"
        : "Contact Updated";

    await sendMessageToLark(
      notifyChatId,
      `📇 ${eventLabel} in Attio\n\nName: ${name}\nCompany: ${company}\nEmail: ${email}`
    );
  } catch (err) {
    console.error("❌ Attio fetch error:", err.response?.data || err.message);
  }
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Server running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
