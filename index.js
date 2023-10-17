const { TransactionProcessor } = require('sawtooth-sdk-js/processor');

const VALIDATOR_URL = 'tcp://localhost:4004'
const transactionProcessor = new TransactionProcessor(VALIDATOR_URL)

transactionProcessor.start();

//Handle Stop Process
process.on('SIGUSR2', () => {
    transactionProcessor._handleShutdown();
})

console.log('hi')