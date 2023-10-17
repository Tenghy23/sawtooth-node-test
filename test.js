const { randomBytes, createHash } = require('crypto')
const secp256k1 = require('secp256k1')
// or require('secp256k1/elliptic')
//   if you want to use pure js implementation in node
const { CryptoFactory, createContext } = require('sawtooth-sdk-js/signing');
const { Secp256k1PrivateKey } = require('sawtooth-sdk-js/signing/secp256k1');
const axios = require('axios');
const protobuf = require("sawtooth-sdk-js/protobuf");

const createPrivateKey = () => {
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

    return privKey.toString('hex')
}

const privateKeyHexStr = createPrivateKey();
const privateKey = new Secp256k1PrivateKey(privateKeyHexStr);
const context = createContext('secp256k1');
const signer = new CryptoFactory(context).newSigner(privateKey);

// payload -> Transaction -> TransactionList -> Batch -> BatchList -> Byte -> REST-API

var payload = seedSampleData();
const payloadBytes = Buffer.from(payload, 'utf8')

const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: 'Boeing 787',
    familyVersion: '1.0.0',
    inputs: [],
    outputs: [],
    signerPublicKey: signer.getPublicKey().asHex(),
    batcherPublicKey: signer.getPublicKey().asHex(),
    nonce: `${Math.random()}`,
    dependencies: [],
    payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
}).finish();

const transaction = protobuf.TransactionHeader.encode({
    header: transactionHeaderBytes,
    headerSignature: signer.sign(transactionHeaderBytes),
    payload: payloadBytes
}).finish();

const transactionList = [transaction];

const batchHeaderBytes = protobuf.TransactionHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: transactionList.map(t => t.headerSignature)
}).finish();

const batch = protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: signer.sign(batchHeaderBytes),
    transactions: transactionList
}).finish();

const batchList = [batch];

const batchListBytes = protobuf.BatchList.encode({
    batches: batchList
}).finish();

console.log(batchListBytes.toString());

// forward 
// go to localhost:8008/state to see the output 
axios.post('http://localhost:8008/batches', {}, {
    headers: {
        'Content-Type': 'application/octet-stream'
    },
    data: batchListBytes
}).then((res) => {
    console.log(`response name: ${res.name}`)
    console.log(`response data: ${res.data}`)
}).catch((err) => {
    console.log(`error name: ${err.name}`)
    console.log(`error data: ${err.data}`)
})


//create sample data from req
async function seedSampleData() {

    // seed some sample data into the payload
    const offsetInHours = 8;
    const now = new Date();
  
    const dateTimeStarted = new Date(now.getTime() + (offsetInHours * 60 * 60 * 1000));
    const dateTimeEnded = new Date(dateTimeStarted);
    dateTimeEnded.setDate(dateTimeStarted.getDate() + 2);      
  
    const hours = Math.floor(Math.random() * 12) + 1;
    
    // Create a payload object
    const payload = {
      name: "TEST NAME",
      job: "TEST JOB",
      dateTimeStarted,
      dateTimeEnded,
      hours
    };
  
    return payload;
  }
    