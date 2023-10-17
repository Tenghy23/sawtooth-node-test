const { randomBytes, createHash } = require('crypto')
const secp256k1 = require('secp256k1')
const { CryptoFactory, createContext } = require('sawtooth-sdk-js/signing');
const { Secp256k1PrivateKey } = require('sawtooth-sdk-js/signing/secp256k1');


// exports make it available outside of the file
exports.createPrivateKey = () => {
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

exports.getSawtoothSigner = (privateKeyHex) => {

    const privateKeyHexStr = createPrivateKey();

    // create instance of private key w internal class
    const privateKey = new Secp256k1PrivateKey(Buffer.From(privateKeyHexStr));
    const context = createContext('secp256k1');

    // create a new signer to sign the payload
    const signer = new CryptoFactory(context).newSigner(privateKey);

    return signer;
}