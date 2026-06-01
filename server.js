const express = require("express");
const app = express();

app.use(express.json());

app.get("/", function (req, res) {
  res.send("RAK10700 decoder running");
});

function int16(msb, lsb) {
  var v = (msb << 8) | lsb;
  return (v & 0x8000) ? v - 0x10000 : v;
}

function int24(b1, b2, b3) {
  var v = (b1 << 16) | (b2 << 8) | b3;
  return (v & 0x800000) ? v - 0x1000000 : v;
}

function hexToBytes(hex) {
  var bytes = [];
  if (!hex) return bytes;

  hex = hex.replace(/\s+/g, "");

  for (var i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }

  return bytes;
}

function decodeRak10700(hex) {
  var b = hexToBytes(hex);
  var decoded = {};
  var i = 0;

  while (i < b.length) {
    var ch = b[i++];
    var type = b[i++];

    if ((ch === 1 && type === 0x74) || (ch === 2 && type === 0x02)) {
      decoded.battery_voltage = int16(b[i], b[i + 1]) / 100;
      i += 2;
    }

    else if (ch === 10 && type === 0x88) {
      decoded.latitude = int24(b[i], b[i + 1], b[i + 2]) / 10000;
      decoded.longitude = int24(b[i + 3], b[i + 4], b[i + 5]) / 10000;
      decoded.altitude = int24(b[i + 6], b[i + 7], b[i + 8]) / 100;
      i += 9;
    }

    else if ((ch === 2 || ch === 3 || ch === 6) && type === 0x68) {
      decoded.humidity = b[i] / 2;
      i += 1;
    }

    else if ((ch === 3 || ch === 4 || ch === 7) && type === 0x67) {
      decoded.temperature = int16(b[i], b[i + 1]) / 10;
      i += 2;
    }

    else if ((ch === 4 || ch === 5 || ch === 8) && type === 0x73) {
      decoded.pressure = ((b[i] << 8) | b[i + 1]) / 10;
      i += 2;
    }

    else if ((ch === 6 || ch === 9) && type === 0x02) {
      decoded.gas_resistance = int16(b[i], b[i + 1]) / 100;
      i += 2;
    }

    else {
      decoded.unknown_channel = ch;
      decoded.unknown_type = type;
      decoded.remaining_bytes = b.slice(i);
      break;
    }
  }

  return decoded;
}

app.post("/rak10700", function (req, res) {
  var payload = req.body.value && req.body.value.payload;
  var decoded = decodeRak10700(payload);

  var response = {
    model: "rak10700_tracker_v1",
    value: decoded,
    tags: ["RAK10700", "CAYENNE_LPP"]
  };

  if (decoded.latitude !== undefined && decoded.longitude !== undefined) {
    response.location = {
      provider: "device",
      lat: decoded.latitude,
      lon: decoded.longitude,
      alt: decoded.altitude || 0
    };
  }

  res.json(response);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, function () {
  console.log("Listening on " + PORT);
});