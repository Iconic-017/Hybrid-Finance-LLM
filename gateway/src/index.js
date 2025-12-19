// gateway/src/index.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const chatRouter = require("./routes/chat");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

// mount router
app.use("/api/chat", chatRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Gateway listening on ${port}`));
