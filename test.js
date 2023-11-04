const { randomBytes, createHash } = require("crypto");
const secp256k1 = require("secp256k1");
const { CryptoFactory, createContext } = require("sawtooth-sdk-js/signing");
const { Secp256k1PrivateKey } = require("sawtooth-sdk-js/signing/secp256k1");
const axios = require("axios");
const protobuf = require("sawtooth-sdk-js/protobuf");

const privateKeyHexStr = createPrivateKey();
const privateKey = new Secp256k1PrivateKey(
  Buffer.from(privateKeyHexStr, "hex")
);
const context = createContext("secp256k1");
const signer = new CryptoFactory(context).newSigner(privateKey);

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
// Middleware to parse JSON data
app.use(express.json());
const port = process.env.PORT || 3002;

app.get("/health", (req, res) => {
  res.json({
    message: "Running",
  });
});

app.post("/create-maintenance-record", async (req, res) => {
  // Extract maintenance record data from the request
  const maintenanceRecord = req.body;

  // Create a payload object for the maintenance record
  const payload = {
    owner: maintenanceRecord.owner,
    aircraftID: maintenanceRecord.aircraftID,
    mechanic: maintenanceRecord.mechanic,
    station: maintenanceRecord.station,
    description: maintenanceRecord.description,
    partHistory: maintenanceRecord.partHistory,
    date: maintenanceRecord.date,
    // Add other relevant fields
  };

  // Convert the payload to bytes
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: "intkey",
    familyVersion: "1.0.0",
    inputs: ["1cf126"],
    outputs: ["1cf126"],
    signerPublicKey: signer.getPublicKey().asHex(),
    batcherPublicKey: signer.getPublicKey().asHex(),
    nonce: `${Math.random()}`,
    dependencies: [],
    payloadSha512: createHash("sha512").update(payloadBytes).digest("hex"),
  }).finish();

  const transaction = protobuf.Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: signer.sign(transactionHeaderBytes),
    payload: payloadBytes,
  });

  const transactions = [transaction];

  const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: transactions.map((t) => t.headerSignature),
  }).finish();

  const batch = protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: signer.sign(batchHeaderBytes),
    transactions: transactions,
  });

  const batches = [batch];
  const batchListBytes = protobuf.BatchList.encode({
    batches: batches,
  }).finish();

  try {
    const response = await axios.post("http://localhost:8008/batches", batchListBytes, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    // Extract relevant information from the Axios response
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    };

    return res.json({ response: responseData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while sending the payload to Sawtooth.",
    });
  }
});

function createPrivateKey() {
  const msg = randomBytes(32);
  let privKey;
  do {
    privKey = randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privKey));
  return privKey.toString("hex");
}

function createTransactionHeader(payloadBytes) {
  return protobuf.TransactionHeader.encode({
    familyName: "intkey",
    familyVersion: "1.0.0",
    inputs: ["1cf126"],
    outputs: ["1cf126"],
    signerPublicKey: signer.getPublicKey().asHex(),
    batcherPublicKey: signer.getPublicKey().asHex(),
    nonce: `${Math.random()}`,
    dependencies: [],
    payloadSha512: createHash("sha512").update(payloadBytes).digest("hex"),
  }).finish();
}

function createTransaction(payloadBytes) {
  const transactionHeaderBytes = createTransactionHeader(payloadBytes);
  return protobuf.Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: signer.sign(transactionHeaderBytes),
    payload: payloadBytes,
  });
}

function createBatch(transactions) {
  const transactionIds = transactions.map((t) => t.headerSignature);
  const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds,
  }).finish();
  return protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: signer.sign(batchHeaderBytes),
    transactions,
  });
}

function createBatchList(payloadBytes) {
  const transaction = createTransaction(payloadBytes);
  const transactions = [transaction];
  const batch = createBatch(transactions);
  const batches = [batch];
  return protobuf.BatchList.encode({
    batches,
  }).finish();
}

async function sendPayloadToSawtooth(batchListBytes) {
  try {
    return await axios.post("http://localhost:8008/batches", batchListBytes, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
