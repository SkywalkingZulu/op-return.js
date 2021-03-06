const { readFileSync } = require('fs')
const reader = require("readline-sync")
const { PrivateKey, Address, Transaction } = require('bitcore-lib')
const { balance, utxos, pushTx } = require('blockchain-api-basic')
const validateOpReturnMessage = require('./lib/validateOpReturnMessage')
const convertUtxos = require('./utils/convertUtxos')
const filterUtxos = require('./utils/filterUtxos')
const catchRequestErrors = require('./utils/catchRequestErrors')

const pvtKeyString = readFileSync(".privateKey").toString().trim()

// load a Private key (generate one with ./utils/createPvtKey.js)
const pvtKey = new PrivateKey(pvtKeyString)
const address = pvtKey.toAddress().toString()
console.log("Private key loaded")
console.log(`Address: ${address}\n`)

;(async () => {

  try {
    // optional - get address balance via blockchain.info
    const bal = await balance(address)
    console.log(`Balance: ${bal} (sat)\n`)

    // ---

    console.log("Get UTXOs from bchain.info:")
    let utxoSet = await utxos(address)
    utxoSet = filterUtxos(utxoSet)

    utxoSet.map((utxo, idx) => {
      console.log(`UTXO #${idx}:`)
      console.log(`hash: ${utxo.tx_hash_big_endian}`)
      console.log(`value: ${utxo.value}`)
      console.log(`confs: ${utxo.confirmations}\n`)
    })
    console.log('')

    if (utxoSet.length == 0) {
      console.log("[]\n")
      console.log("No available UTXOs to spend, deposit few thousand satoshis to your address.\n")
      process.exit()
    }

    const utxoSelection = reader.question("Select UTXO: ")
    utxoSet = [ utxoSet[new Number(utxoSelection)] ]
    console.log("\n")
    utxoSet = convertUtxos(utxoSet)
    console.log("UTXO, selected and converted for bitcore")
    console.log(utxoSet)
    console.log("\n")

    // ---

    console.log("Type the message you want to be written to the blockchain")
    const message = reader.question("Message: ")
    validateOpReturnMessage(message)
    console.log("\n")

    // ---

    const amount = 1000

    const tx = new Transaction()
        .from(utxoSet)
        .to(address, amount)
        .change(address)
        .addData(message)
        .fee(1000) // minimum fee of 1k sat, use 5k+ sat for currency transactions (BTC)
        .sign(pvtKey)
    
    const txHex = tx.serialize()

    console.log("TX serialized:")
    console.log(txHex)
    console.log("\n")

    // ---

    console.log("Broadcasting TX...\n")
    const resp = await pushTx(txHex)
    console.log("response:")
    console.log(resp)

  } catch (err) {
    catchRequestErrors(err)
    console.log("exiting...")
  }

})()
