import {
  Address,
  BigNum,
  LinearFee,
  Transaction,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionWitnessSet,
} from "@emurgo/cardano-serialization-lib-asmjs";
import { Buffer } from "buffer";

/**
 * https://github.com/input-output-hk/cardano-node/blob/master/configuration/cardano/testnet-shelley-genesis.json
 * Protocol parameters
 * @type {{
 * keyDeposit: string,
 * coinsPerUtxoWord: string,
 * minUtxo: string,
 * poolDeposit: string,
 * maxTxSize: number,
 * priceMem: number,
 * maxValSize: number,
 * linearFee: {minFeeB: string, minFeeA: string},
 * priceStep: number
 * }}
 */
const protocolParams = {
  linearFee: {
    minFeeA: "44",
    minFeeB: "155381",
  },
  minUtxo: "34482",
  poolDeposit: "500000000",
  keyDeposit: "2000000",
  maxValSize: 5000,
  maxTxSize: 16384,
  priceMem: 0.0577,
  priceStep: 0.0000721,
  coinsPerUtxoWord: "34482",
};

/**
 * Every transaction starts with initializing the
 * TransactionBuilder and setting the protocol parameters
 * This is boilerplate
 * @returns {TransactionBuilder}
 */
export const initTransactionBuilder = () => {
  const txBuilderConfig = TransactionBuilderConfigBuilder.new()
    .fee_algo(
      LinearFee.new(
        BigNum.from_str(protocolParams.linearFee.minFeeA),
        BigNum.from_str(protocolParams.linearFee.minFeeB)
      )
    )
    .pool_deposit(BigNum.from_str(protocolParams.poolDeposit))
    .key_deposit(BigNum.from_str(protocolParams.keyDeposit))
    .coins_per_utxo_word(BigNum.from_str(protocolParams.coinsPerUtxoWord))
    .max_value_size(protocolParams.maxValSize)
    .max_tx_size(protocolParams.maxTxSize)
    .prefer_pure_change(true)
    .build();

  return TransactionBuilder.new(txBuilderConfig);
};

/**
 * Get the address from the wallet into which any spare UTXO should be sent
 * as change when building transactions.
 * @returns {Promise<Address>}
 */
export const getChangeAddress = async (api) => {
  const raw = await api.getChangeAddress();
  return Address.from_bytes(Buffer.from(raw, "hex"));
};

/**
 * Gets the UTXOs from the user's wallet and then
 * stores in an object in the state
 * @returns {Promise<[TransactionUnspentOutput]>}
 */
export const getUtxos = async (api) => {
  const rawUtxos = await api.getUtxos();
  return rawUtxos.map((rawUtxo) =>
    TransactionUnspentOutput.from_bytes(Buffer.from(rawUtxo, "hex"))
  );
};

/**
 * Builds an object with all the utxos from the user's wallet
 * @param {[TransactionUnspentOutput]} utxos An array of utxo
 * @returns {TransactionUnspentOutputs}
 */
export const getTxUnspentOutputs = (utxos) => {
  let txOutputs = TransactionUnspentOutputs.new();
  for (const utxo of utxos) {
    txOutputs.add(utxo);
  }
  return txOutputs;
};

/**
 *
 * @param {*} api cardano api
 * @param {Transaction} tx Transaction body created by buildTxBody
 * @returns {Promise<string>} The submitted transaction ID
 */
export const signAndSubmitTx = async (api, tx) => {
  const txHex = Buffer.from(tx.to_bytes()).toString("hex");
  console.log({ unsignedTxHex: txHex });

  const partialSign = true;
  const responseHex = await api.signTx(txHex, partialSign);

  const witnessSet = TransactionWitnessSet.from_bytes(
    Buffer.from(responseHex, "hex")
  );

  // Create a copy of the witness set
  const txWitnessSet = TransactionWitnessSet.from_bytes(
    tx.witness_set().to_bytes()
  );

  txWitnessSet.set_vkeys(witnessSet.vkeys());
  const signedTx = Transaction.new(tx.body(), txWitnessSet);

  const signedTxHex = Buffer.from(signedTx.to_bytes()).toString("hex");
  console.log({ responseHex, signedTxHex });

  const submittedTxHash = await api.submitTx(signedTxHex);
  console.log({ submittedTxHash });

  return submittedTxHash;
};
