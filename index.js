console.log("NEW VERSION DEPLOYED");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post("/", async (req, res) => {
  const body = req.body;

  // 🔹 Lark URL verification
  if (body.type === "url_verification") {
    return res.json({ challenge: body.challenge });
  }

  // 🔹 Handle message events
  if (body.event && body.event.message) {
    const userMessage = body.event.message.content;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          { role: "user", content: userMessage }
        ]
      });

      const claudeReply = response.content[0].text;

      console.log("Claude reply:", claudeReply);

      // ⚠️ For now just log it
      // Next step we will send it back to Lark

    } catch (error) {
      console.error("Claude error:", error);
    }
  }

  res.json({});
});

app.post("/attio-webhook", async (req, res) => {
  const data = req.body;

  console.log("Attio event received:", data);

  // Adjust based on Attio's actual payload structure
  const name = data.data?.values?.name || "Unknown";
  const company = data.data?.values?.company || "Unknown";
  const email = data.data?.values?.email || "No email";

  await sendMessageToLark(`
📇 New Contact Added to Attio

Name: ${name}
Company: ${company}
Email: ${email}
  `);

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Server running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});