const { TransactionHandler } = require('sawtooth-sdk-js/processor/handler')
const { InvalidTransaction, InternalError } = require('sawtooth-sdk-js/processor/exceptions')
const crypto = require('crypto')

// this is the sample intKey handler for learning purposes

const _hash = (x) =>
    crypto.createHash('sha512').update(x).digest('hex').toLowerCase()

const INT_KEY_FAMILY = 'intkey'
const INT_KEY_NAMESPACE = _hash(INT_KEY_FAMILY).substring(0, 6)

class IntegerKeyHandler extends TransactionHandler {
    constructor() {
        super(INT_KEY_FAMILY, ['1.0'], [INT_KEY_NAMESPACE])
    }

    apply(transactionProcessRequest, context) {
                // Validate the update
                let name = "foo"
                let value = 100

                let address = INT_KEY_NAMESPACE + _hash(name).slice(-64)

                // Apply the action to the promise's result:
                let actionPromise = getPromise.then(
                    actionFn(context, address, name, value)
                ).then((address)=>{
                    if (addresses.length === 0) {
                        throw new InternalError('State Error! Nothing happened')
                    }
                })

                return context.setState({
                    [address]: JSON.stringify(value)
                })
    }
}

module.exports = IntegerKeyHandler