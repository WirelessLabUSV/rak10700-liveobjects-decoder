const express = require("express");
const app = express();

app.use(express.json());

app.get("/", function (req, res) {
  res.send("Cayenne LPP decoder running");
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

function decodeCayenneLpp(hex) {
  var b = hexToBytes(hex);
  var decoded = {};
  var analogCount = 0;
  var i = 0;

  while (i < b.length) {
    var ch = b[i++];
    var type = b[i++];

    if (type === 0x00) {
      decoded["digital_input_" + ch] = b[i];
      i += 1;
    } else if (type === 0x01) {
      decoded["digital_output_" + ch] = b[i];
      i += 1;
    } else if (type === 0x02) {
      var analog = int16(b[i], b[i + 1]) / 100;
      analogCount++;

      if (analogCount === 1) decoded.battery_voltage = analog;
      else if (analogCount === 2) decoded.gas_resistance = analog;
      else decoded["analog_" + ch] = analog;

      i += 2;
    } else if (type === 0x65) {
      decoded.illuminance = ((b[i] << 8) | b[i + 1]);
      i += 2;
    } else if (type === 0x67) {
      decoded.temperature = int16(b[i], b[i + 1]) / 10;
      i += 2;
    } else if (type === 0x68) {
      decoded.humidity = b[i] / 2;
      i += 1;
    } else if (type === 0x73) {
      decoded.pressure = ((b[i] << 8) | b[i + 1]) / 10;
      i += 2;
    } else if (type === 0x74) {
      decoded.battery_voltage = ((b[i] << 8) | b[i + 1]) / 100;
      i += 2;
    } else if (type === 0x88) {
      decoded.latitude = int24(b[i], b[i + 1], b[i + 2]) / 10000;
      decoded.longitude = int24(b[i + 3], b[i + 4], b[i + 5]) / 10000;
      decoded.altitude = int24(b[i + 6], b[i + 7], b[i + 8]) / 100;
      i += 9;
    } else {
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
  var decoded = decodeCayenneLpp(payload);

  var response = {
    model: "cayenne_lpp_v1",
    value: decoded,
    tags: ["CAYENNE_LPP"]
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