import { Buffer } from "buffer";
import {
  AssetName,
  Int,
  MintAssets,
  Transaction,
} from "@emurgo/cardano-serialization-lib-asmjs";

import {
  getChangeAddress,
  getTxUnspentOutputs,
  getUtxos,
  initTransactionBuilder,
  signAndSubmitTx,
} from "./utils.js";
import { buildPolicyScript } from "./policyScript";

/**
 * @param {string} walletName ex : eternl, yoroi, nami
 * @param {string} tokenName the name of the token we will mint or burn
 * @param {number} amount number of tokens to mint. A negative number will burn tokens
 * @returns {Promise<string>} the submitted transaction ID in hex format
 */
export const mintTokens = async (walletName, tokenName, amount) => {
  const api = await window.cardano[walletName].enable();
  const changeAddress = await getChangeAddress(api);
  const utxos = await getUtxos(api);

  console.log({
    tokenName,
    changeAddress: changeAddress.to_bech32(),
    amount,
    utxos,
  });

  const tokenNameHex = Buffer.from(tokenName).toString("hex");
  const assetName = AssetName.new(Buffer.from(tokenNameHex, "hex"));
  const mintAssets = MintAssets.new_from_entry(assetName, Int.new_i32(amount));

  const txUnspentOutputs = getTxUnspentOutputs(utxos);

  const usedAddress = txUnspentOutputs.get(0).output().address();
  const policyScript = buildPolicyScript(usedAddress);

  const txBuilder = initTransactionBuilder();

  txBuilder.set_mint_asset(policyScript, mintAssets);

  // Find the available utxos in the wallet and
  // use them as Inputs
  txBuilder.add_inputs_from(txUnspentOutputs, 2);

  // calculate the min fee required and send any change to an address
  txBuilder.add_change_if_needed(changeAddress);

  // once the transaction is ready, we build it to get the tx body without witnesses
  const tx = txBuilder.build_tx();

  const submittedTxHash = await signAndSubmitTx(api, tx);
  return submittedTxHash;
};

const handleClick = async (walletName) => {
  const prompt = document.querySelector("#prompt");
  prompt.innerHTML = "";
  console.log(`Trying to sign with ${walletName}`);

  const submittedTxHash = await mintTokens(walletName, "test", 10);

  prompt.innerHTML = `<h1>Transaction submitted successfully with ${walletName}</h1><br/>tx hash: ${submittedTxHash}`;
};

const mintEternlButton = document.querySelector(".eternl-button");
const mintNamiButton = document.querySelector(".nami-button");
const mintYoroiButton = document.querySelector(".yoroi-button");
mintEternlButton.addEventListener("click", () => handleClick("eternl"));
mintNamiButton.addEventListener("click", () => handleClick("nami"));
mintYoroiButton.addEventListener("click", () => handleClick("yoroi"));
