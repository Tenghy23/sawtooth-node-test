const { TransactionProcessor } = require('sawtooth-sdk-js/processor');
const IntkeyHandler = require('./handler/intKey.js');

const VALIDATOR_URL = 'tcp://localhost:4004'
const transactionProcessor = new TransactionProcessor(VALIDATOR_URL)

// add all transaction handlers
transactionProcessor.addHandler(new IntkeyHandler())

transactionProcessor.start();

//Handle Stop Process
process.on('SIGUSR2', () => {
    transactionProcessor._handleShutdown();
})

console.log('hi')
