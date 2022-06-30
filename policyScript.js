import {
  Address,
  BaseAddress,
  NativeScript,
  ScriptPubkey,
} from '@emurgo/cardano-serialization-lib-asmjs';
import { Buffer } from "buffer";

/**
 *
 * @param {Address} address The address that can generate the tokens
 * @returns {NativeScript}
 */
export const buildPolicyScript = (address) => {
  const keyHash = BaseAddress.from_address(address).payment_cred().to_keyhash();
  const policyScript = NativeScript.new_script_pubkey(
    ScriptPubkey.new(keyHash)
  );
  const expectedPolicyId = Buffer.from(policyScript.hash().to_bytes()).toString(
    'hex'
  );
  console.log({ expectedPolicyId });
  return policyScript;
};
