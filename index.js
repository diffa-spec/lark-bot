console.log("NEW VERSION DEPLOYED");
const express = require("express");
const app = express();

app.use(express.json());

// Lark event endpoint
app.post("/", (req, res) => {
    console.log("Received body:", req.body);

    if (req.body.type === "url_verification") {
        return res.status(200).json({
            challenge: req.body.challenge
        });
    }

    return res.status(200).json({ ok: true });
});

// Health check route
app.get("/", (req, res) => {
    res.status(200).send("Server is running");
});

// 🔥 IMPORTANT: Use Render's PORT
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});