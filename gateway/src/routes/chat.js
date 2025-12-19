// // gateway/src/routes/chat.js
// const express = require("express");
// const axios = require("axios");
// const router = express.Router();

// const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || "http://localhost:8001/generate";
// const RETRIEVER_URL = process.env.RETRIEVER_URL || "http://localhost:8002/retrieve";
// const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
// const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3";

// const OLLAMA_TIMEOUT = Number(process.env.OLLAMA_TIMEOUT_MS || 45000);
// const PRIMARY_TIMEOUT = Number(process.env.PRIMARY_TIMEOUT_MS || 120000);
// const RETRIEVER_TIMEOUT = 4000;

// function buildPrompt(contexts, userQuestion) {
//   const system = `You are a finance assistant. Answer concisely. Use the documents when present.`;
//   const ctxText = contexts && contexts.length
//     ? contexts.map((c,i)=>`--- Document ${i+1} (id:${c.id}) ---\n${c.text}`).join("\n\n")
//     : "(no context)";
//   return `${system}\n\n${ctxText}\n\nUser: ${userQuestion}\nAssistant:`;
// }

// router.post("/", async (req, res) => {
//   try {
//     const t0 = Date.now();
//     const { prompt: userQuestion, max_tokens = 256, temperature = 0 } = req.body;
//     if (!userQuestion) return res.status(400).json({ error: "missing prompt" });

//     // retriever (best-effort)
//     let contexts = [];
//     try {
//       const rresp = await axios.post(RETRIEVER_URL, { query: userQuestion, k: 4 }, { timeout: RETRIEVER_TIMEOUT, headers: { "Content-Type": "application/json" } });
//       contexts = rresp.data.contexts || [];
//     } catch (e) { console.warn("Retriever failed:", e.message); }

//     const fullPrompt = buildPrompt(contexts, userQuestion);
//     console.log(`Prompt lengths: user=${userQuestion.length}, full=${fullPrompt.length}`);

//     // 1) Ollama first (longer timeout)
//     try {
//       const s = Date.now();
//       const oresp = await axios.post(OLLAMA_URL, { model: OLLAMA_MODEL, prompt: fullPrompt, stream: false }, { timeout: OLLAMA_TIMEOUT, headers: { "Content-Type": "application/json" } });
//       console.log("Ollama time(ms):", Date.now()-s);
//       const ollamaAnswer = oresp.data.response || oresp.data.text || JSON.stringify(oresp.data);
//       return res.json({ source: "ollama", answer: ollamaAnswer, contexts, timings: { total_ms: Date.now()-t0 } });
//     } catch (e) {
//       console.warn("Ollama failed/slow:", e.message);
//     }

//     // 2) Primary local model (long)
//     try {
//       const s = Date.now();
//       const modelResp = await axios.post(MODEL_SERVER_URL, { prompt: fullPrompt, max_tokens, temperature }, { timeout: PRIMARY_TIMEOUT, headers: { "Content-Type": "application/json" } });
//       console.log("Model-server time(ms):", Date.now()-s);
//       return res.json({ source: "model-server", answer: modelResp.data.answer, contexts, timings: { total_ms: Date.now()-t0 } });
//     } catch (e) {
//       console.warn("Primary failed/slow:", e.message);
//     }

//     return res.status(502).json({ error: "all_fallbacks_failed", detail: "ollama and primary failed/timeout" });
//   } catch (err) {
//     console.error("gateway error:", err);
//     return res.status(500).json({ error: "gateway_error", detail: err.message });
//   }
// });

// module.exports = router;










// gateway/src/routes/chat.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || "http://localhost:8001/generate";
const RETRIEVER_URL = process.env.RETRIEVER_URL || "http://localhost:8002/retrieve";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3";

const STOCK_API_KEY = process.env.STOCK_API_KEY || null;
const STOCK_API_BASE = process.env.STOCK_API_BASE || "https://www.alphavantage.co/query";

const OLLAMA_TIMEOUT = Number(process.env.OLLAMA_TIMEOUT_MS || 45000);
const PRIMARY_TIMEOUT = Number(process.env.PRIMARY_TIMEOUT_MS || 120000);
const RETRIEVER_TIMEOUT = 4000;

// ---------- Prompt builder for RAG ----------
function buildPrompt(contexts, userQuestion) {
  const system =
    `You are an expert finance assistant.\n` +
    `Use the reference snippets if they are relevant, but also rely on your own finance knowledge.\n` +
    `Never mention phrases like "in the documents" or "not defined in documents". ` +
    `Just answer naturally and clearly. If you truly don't know, say "I'm not sure".`;

  if (!contexts || !contexts.length) {
    return `${system}\n\nUser question: ${userQuestion}\nAnswer:`;
  }

  const ctxText = contexts
    .map((c, i) => `Snippet ${i + 1} (id: ${c.id}):\n${c.text}`)
    .join("\n\n");

  return (
    `${system}\n\nHere are some reference snippets that may help:\n` +
    `${ctxText}\n\nUser question: ${userQuestion}\nAnswer:`
  );
}

// ---------- Detect stock price intent ----------
function looksLikePriceQuestion(q) {
  const s = q.toLowerCase();
  return (
    s.includes("stock price") ||
    s.includes("current price") ||
    s.includes("price of") ||
    s.includes("price for") ||
    s.includes("trading at") ||
    s.includes("live price") ||
    s.includes("kitna chal") ||
    s.includes("kitna chal raha") ||
    s.includes("kitna chal rha")
  );
}

function extractTicker(q) {
  // try to find AAPL, TSLA, INFY type tokens
  const upper = q.toUpperCase();
  const matches = upper.match(/\b[A-Z]{1,5}\b/g);
  if (!matches) return null;

  const stop = new Set([
    "WHAT", "IS", "THE", "OF", "PRICE", "STOCK", "TODAY", "CURRENT",
    "PLEASE", "LIVE", "KITNA", "CHAL", "RAHA", "HAI"
  ]);

  const filtered = matches.filter((t) => !stop.has(t));
  return filtered[0] || null;
}

// ---------- Call live stock API ----------
async function fetchLivePrice(ticker) {
  if (!STOCK_API_KEY) throw new Error("STOCK_API_KEY missing");

  const url = `${STOCK_API_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
    ticker
  )}&apikey=${STOCK_API_KEY}`;

  const resp = await axios.get(url, { timeout: 8000 });
  const quote = resp.data && resp.data["Global Quote"];
  if (!quote || !quote["05. price"]) {
    throw new Error("No quote data found");
  }

  return {
    symbol: quote["01. symbol"] || ticker,
    price: parseFloat(quote["05. price"]),
    change: parseFloat(quote["09. change"] || 0),
    changePercent: quote["10. change percent"] || "",
    raw: quote,
  };
}

// ---------- Main /api/chat ----------
router.post("/", async (req, res) => {
  try {
    const { prompt: userQuestion, max_tokens = 256, temperature = 0 } = req.body;
    if (!userQuestion) return res.status(400).json({ error: "missing prompt" });

    const q = userQuestion || "";
    const ticker = extractTicker(q);
    const isPrice = looksLikePriceQuestion(q);

    // 1) LIVE PRICE PATH
    if (ticker && isPrice && STOCK_API_KEY) {
      console.log(`Detected live price query for ${ticker}`);
      try {
        const quote = await fetchLivePrice(ticker);
        const answerText =
          `Current price of ${quote.symbol} is ${quote.price.toFixed(2)} USD. ` +
          (quote.change
            ? `Change: ${quote.change.toFixed(2)} (${quote.changePercent}).`
            : "");

        return res.json({
          source: "live-price-api",
          answer: answerText,
          live: true,
          ticker: quote.symbol,
          quote: quote.raw,
        });
      } catch (e) {
        console.warn("Live price API failed, falling back to LLM:", e.message);
        // fall back to normal LLM flow
      }
    }

    // 2) NORMAL FINANCE Q&A (concepts etc.) → RAG + LLM
    let contexts = [];
    try {
      const rresp = await axios.post(
        RETRIEVER_URL,
        { query: userQuestion, k: 4 },
        { timeout: RETRIEVER_TIMEOUT, headers: { "Content-Type": "application/json" } }
      );
      contexts = rresp.data.contexts || [];
    } catch (e) {
      console.warn("Retriever failed:", e.message);
    }

    const fullPrompt = buildPrompt(contexts, userQuestion);
    console.log("Prompt lengths: user=", userQuestion.length, " full=", fullPrompt.length);

    // 3) Try Ollama first
    try {
      const oresp = await axios.post(
        OLLAMA_URL,
        { model: OLLAMA_MODEL, prompt: fullPrompt, stream: false },
        { timeout: OLLAMA_TIMEOUT, headers: { "Content-Type": "application/json" } }
      );
      const ollamaAnswer =
        oresp.data.response || oresp.data.text || JSON.stringify(oresp.data);
      return res.json({
        source: "ollama",
        answer: ollamaAnswer,
        contexts,
        live: false,
      });
    } catch (e) {
      console.warn("Ollama failed/slow:", e.message);
    }

    // 4) Fallback: tumhara fine-tuned model server
    try {
      const modelResp = await axios.post(
        MODEL_SERVER_URL,
        { prompt: fullPrompt, max_tokens, temperature },
        { timeout: PRIMARY_TIMEOUT, headers: { "Content-Type": "application/json" } }
      );
      return res.json({
        source: "model-server",
        answer: modelResp.data.answer,
        contexts,
        live: false,
      });
    } catch (e) {
      console.warn("Primary model failed/slow:", e.message);
    }

    return res.status(502).json({
      error: "all_fallbacks_failed",
      detail: "live API, ollama, and primary all failed",
    });
  } catch (err) {
    console.error("gateway /api/chat error:", err);
    return res.status(500).json({ error: "gateway_error", detail: err.message });
  }
});

module.exports = router;
