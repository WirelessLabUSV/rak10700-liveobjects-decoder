const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("RAK10700 decoder running");
});

app.post("/rak10700", (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    model: "rak10700_tracker_v1",
    value: {
      test: "ok"
    }
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});