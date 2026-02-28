console.log("NEW VERSION DEPLOYED");
const express = require("express");
const app = express();

app.use(express.json());

app.post("/", (req, res) => {
    console.log("Incoming body:", req.body);

    if (req.body.type === "url_verification") {
        return res.status(200).json({
            challenge: req.body.challenge
        });
    }

    // Always respond 200 for other events
    return res.status(200).json({});
});

app.get("/", (req, res) => {
    res.status(200).send("Server is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});