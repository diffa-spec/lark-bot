const express = require("express");
const app = express();

app.use(express.json());

app.post("/", (req, res) => {
    const body = req.body;

    // 🔹 Handle Lark URL verification
    if (body.type === "url_verification") {
        return res.json({
            challenge: body.challenge
        });
    }

    // 🔹 Handle normal events
    console.log("Event received:", body);

    res.json({ message: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});