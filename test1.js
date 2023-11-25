const { randomBytes, createHash } = require("crypto");
const secp256k1 = require("secp256k1");
// or require('secp256k1/elliptic')
//   if you want to use pure js implementation in node
const { CryptoFactory, createContext } = require("sawtooth-sdk-js/signing");
const { Secp256k1PrivateKey } = require("sawtooth-sdk-js/signing/secp256k1");
const axios = require("axios");
const protobuf = require("sawtooth-sdk-js/protobuf");

const privateKeyHexStr = createPrivateKey();

// create instance of private key w internal class
const privateKey = new Secp256k1PrivateKey(
  Buffer.from(privateKeyHexStr, "hex")
);
const context = createContext("secp256k1");

// create a new signer to sign the payload
const signer = new CryptoFactory(context).newSigner(privateKey);

// payload -> Transaction -> TransactionList -> Batch -> BatchList -> Byte -> REST-API
const payload = "Test ME";
const payloadBytes = Buffer.from(payload);



console.log({ batchListBytes })
axios
  .post(
    "http://localhost:8008/batches",
    batchListBytes,
    {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    }
  )
  .then((res) => {
    console.log({ res });
  })
  .catch((err) => {
    console.log(err);
  });

// create private key
function createPrivateKey() {
  // generate message to sign
  // message should have 32-byte length, if you have some other length you can hash message
  // for example `msg = sha256(rawMessage)`
  const msg = randomBytes(32);

  // generate privKey
  let privKey;
  do {
    privKey = randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privKey));

  // get the public key in a compressed format
  const pubKey = secp256k1.publicKeyCreate(privKey);

  // sign the message
  const sigObj = secp256k1.ecdsaSign(msg, privKey);

  // verify the signature
  // console.log(secp256k1.ecdsaVerify(sigObj.signature, msg, pubKey));
  // => true

  return privKey.toString("hex");
}