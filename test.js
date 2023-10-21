const { randomBytes, createHash } = require('crypto')
const secp256k1 = require('secp256k1')
// or require('secp256k1/elliptic')
//   if you want to use pure js implementation in node
const { CryptoFactory, createContext } = require('sawtooth-sdk-js/signing');
const { Secp256k1PrivateKey } = require('sawtooth-sdk-js/signing/secp256k1');
const axios = require('axios');
const protobuf = require("sawtooth-sdk-js/protobuf");
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

// Middleware to parse JSON data
app.use(express.json());
const port = process.env.PORT || 3002;



const privateKeyHexStr = createPrivateKey();

// create instance of private key w internal class
const privateKey = new Secp256k1PrivateKey(Buffer.from(privateKeyHexStr));
const context = createContext('secp256k1');

// create a new signer to sign the payload
const signer = new CryptoFactory(context).newSigner(privateKey);

// payload -> Transaction -> TransactionList -> Batch -> BatchList -> Byte -> REST-API

app.get('/health', (req, res) => {
    res.json({
        message: 'Running'
    })
})

app.post('/send-payload', async (req, res) => {
    try {
       
        const payload = seedSampleData(req);
        const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');

        const transactionHeaderBytes1 = createTransactionHeader(signer, payloadBytes);
        const transaction1 = createTransaction(transactionHeaderBytes1, signer, payloadBytes);
        const transactionList1 = [transaction1];
        const batch1 = createBatch(signer, transactionList1);
        const batchList1 = [batch1];
        const batchListBytes1 = createBatchList(batchList1);
        
        console.log("transaction List 1")
        console.log(transactionList1.toString());
        console.log("batch 1")
        console.log(batch1.toString());
        console.log("batch list 1")
        console.log(batchListBytes1.toString());

        // Send the payload to the Sawtooth network
        const response = await sendPayloadToSawtooth(batchListBytes1);
  
        res.json({ message: 'Payload sent successfully', response });
      
    } catch (error) {
        res.status(500).json({ 
            'Error name:': error.name,
            'Error message:': error.message,
            'Error stack trace:': error.stack,
        });
    }
  });
  

async function sendPayloadToSawtooth(batchList) {
    // Make an HTTP POST request to the Sawtooth REST API
    const sawtoothRestApiUrl = 'http://localhost:8008/batches'; 
    // const sawtoothRestApiUrl = 'http://sawtooth-rest-api-default-0:8008/batches'; // Update with your Sawtooth API URL

    const response = await axios.post(sawtoothRestApiUrl, batchList, {
        headers: { 'Content-Type': 'application/octet-stream' },
        // headers: { 'Content-Type': 'application/json' },
    }).then((res) => {
        console.log(res.data);
    }).catch((err) => {
        console.log(err.response);
    })

    return response.data;
}
  
// create private key
function createPrivateKey() {
    // generate message to sign
    // message should have 32-byte length, if you have some other length you can hash message
    // for example `msg = sha256(rawMessage)`
    const msg = randomBytes(32)

    // generate privKey
    let privKey
    do {
        privKey = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privKey))

    // get the public key in a compressed format
    const pubKey = secp256k1.publicKeyCreate(privKey)

    // sign the message
    const sigObj = secp256k1.ecdsaSign(msg, privKey)

    // verify the signature
    console.log(secp256k1.ecdsaVerify(sigObj.signature, msg, pubKey))
    // => true

    return privKey
}

// create sample data from req
function seedSampleData(req) {

    const { name, job } = req.body;

    // seed some sample data into the payload
    const offsetInHours = 8;
    const now = new Date();
  
    const dateTimeStarted = new Date(now.getTime() + (offsetInHours * 60 * 60 * 1000));
    const dateTimeEnded = new Date(dateTimeStarted);
    dateTimeEnded.setDate(dateTimeStarted.getDate() + 2);      
  
    const hours = Math.floor(Math.random() * 12) + 1;
    
    // Create a payload object
    const payload = {
      name: name,
      job: job,
      dateTimeStarted: dateTimeStarted,
      dateTimeEnded: dateTimeEnded,
      hoursTaken: hours
    };
  
    return JSON.stringify(payload);
  }
    
// 1. create txn header bytes 
const createTransactionHeader = (signer, payloadBytes) => {

    const addressData = 'Boeing 787' + '1.0.0';
    const hash = createHash('sha256').update(addressData).digest('hex');
    const address = hash.slice(0, 64);

    return protobuf.TransactionHeader.encode({
        familyName: 'Boeing 787',
        familyVersion: '1.0.0',
        inputs: [address],
        outputs: [address],
        signerPublicKey: signer.getPublicKey().asHex(),
        batcherPublicKey: signer.getPublicKey().asHex(),
        nonce: `${Math.random()}`,
        dependencies: [],
        payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
    }).finish();
}

// 2. create txn 
const createTransaction = (transactionHeaderBytes, signer, payloadBytes) => {
    return protobuf.Transaction.create({
        header: transactionHeaderBytes,
        headerSignature: signer.sign(transactionHeaderBytes),
        payload: payloadBytes
    });
}

// 3. create txn list 
// const transactionList = [transaction];

// 4. create batch with batch header info
const createBatch = (signer, transactionList) => {
    const batchHeaderBytes = protobuf.BatchHeader.encode({
        signerPublicKey: signer.getPublicKey().asHex(),
        transactionIds: transactionList.map(t => t.headerSignature)
    }).finish();

    return protobuf.Batch.create({
        header: batchHeaderBytes,
        headerSignature: signer.sign(batchHeaderBytes),
        transactions: transactionList
    });
}

// 5. create batch list
// const batchList = [batch];

// 6. create batch list bytes
const createBatchList = (batchList) => {
    return protobuf.BatchList.encode({ batches: batchList }).finish();
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });