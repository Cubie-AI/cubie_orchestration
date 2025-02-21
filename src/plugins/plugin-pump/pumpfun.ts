export const PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { PumpFun } from "./pf_program/pumpfun.js";
import { IDL } from "./pf_program/idl.js";
import { solanaConnection } from "../../connection.js";
import { AMM } from "./amm.js";
import BN from "bn.js";

interface PumpfunServiceConfig {
  provider: AnchorProvider;
  owner: Keypair;
}

async function makeV0Transaction(
  instructions: TransactionInstruction[],
  owner: Keypair
) {
  const latestBlockhash = await solanaConnection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions: instructions,
    payerKey: owner.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([owner]);

  return transaction;
}

// Return bonding curevve, fee account , global account, program id, associated bonding curve,
async function getPumpfunAccounts(
  mintAddress: string,
  provider: AnchorProvider,
  owner: Keypair
) {
  // Setup pumpfun program with anchor
  const program = new Program(IDL as PumpFun, provider);

  // This is the CA
  const mint = new PublicKey(mintAddress);

  // This is the pumpfun bonding curve account which holds the (tokens, sol) balances
  const bondingCurveAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    program.programId // this is the program id of the pumpfun program (6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P)
  )[0];
  console.log(`Bonding Curve Account: ${bondingCurveAccount}`);

  // This is the associated token account for the bonding curve
  const associatedBondingCurveAccount = getAssociatedTokenAddressSync(
    mint,
    bondingCurveAccount,
    true
  );
  console.log(
    `Associated Bonding Curve Account: ${associatedBondingCurveAccount}`
  );

  // This is the pumpfun global account
  // 4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf
  const globalAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    program.programId
  )[0];

  console.log(`Global Account: ${globalAccount.toBase58()}`);
  // im too lazy to implement how to get this dynamically but you would fetch the data from the pumpfun global account and then parse it.
  // However, it doesnt change so you can hardcode it
  //https://solscan.io/account/4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf#anchorData
  const pumpfunFeeAccount = new PublicKey(
    "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
  );

  // This is the token account for the [owner, mint] pair (ATA)
  // if it doesnt exist, you need to create it
  // Every time you buy tokens you need to create a new ATA and pay the rent (0.002 SOL)
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    owner.publicKey
  );

  return {
    mint,
    globalAccount,
    pumpfunFeeAccount,
    bondingCurveAccount,
    associatedBondingCurveAccount,
    program,
    associatedTokenAccount,
  };
}

export class PumpfunService {
  constructor(private config: PumpfunServiceConfig) {}

  async buy(mintAddress: string, tokenAmount: number) {
    const { owner, provider } = this.config;

    const {
      mint,
      pumpfunFeeAccount,
      bondingCurveAccount,
      associatedBondingCurveAccount,
      program,
      associatedTokenAccount,
    } = await getPumpfunAccounts(mintAddress, provider, owner);

    // construct amm for bonding curve account
    const amm = await AMM.fromBondingCurveAccount(bondingCurveAccount);

    // Array to hold our instructions
    const instructions = [];

    // You need to calculate these values from the actual bonding curve account data.
    // There is a lot more math that needs to be done but this will work on a fresh CA with no buys
    // Where 0.75 SOL should get you more than 20,000,000 tokens but the sol value here is
    // the maximum amount you want to spend for the output amount of tokens
    const solAmount = amm?.getBuyPrice(BigInt(tokenAmount * 10 ** 6));

    try {
      const associatedTokenAccountInfo = await solanaConnection.getAccountInfo(
        associatedTokenAccount
      );

      // If the associated token account does not exist, create it
      if (!associatedTokenAccountInfo) {
        // First parameter is the fee payer (in regular cases, it should be the owner)
        instructions.push(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            associatedTokenAccount,
            provider.wallet.publicKey,
            mint
          )
        );
      }
    } catch (error) {
      console.error(error);
      return;
    }
    if (!solAmount) return;

    const token_amount = new BN(tokenAmount).mul(new BN(Math.pow(10, 6)));
    const sol_amount = new BN(Number(solAmount)).mul(new BN(LAMPORTS_PER_SOL));
    // Build a transaction to buy tokens
    const buyInstruction = await program.methods
      .buy(token_amount, sol_amount)
      .accounts({
        feeRecipient: pumpfunFeeAccount,
        associatedUser: associatedTokenAccount,
        user: provider.wallet.publicKey,
        mint: mint,
        associatedBondingCurve: associatedBondingCurveAccount,
      })
      .instruction();

    // Append it to the earlier transaction since we might need to create the ATA
    instructions.push(buyInstruction);

    // Build the final transaction
    const transaction = await makeV0Transaction(instructions, owner);

    const signature = await solanaConnection.sendTransaction(transaction, {
      skipPreflight: true,
      maxRetries: 5,
    });
    console.log(`Transaction Signature: ${signature}`);
    return signature;
  }

  async sell(mintAddress: string, tokenAmount: number) {
    const { owner, provider } = this.config;

    const {
      mint,
      pumpfunFeeAccount,
      bondingCurveAccount,
      associatedBondingCurveAccount,
      program,
      associatedTokenAccount,
    } = await getPumpfunAccounts(mintAddress, provider, owner);

    // construct amm for bonding curve account
    const amm = await AMM.fromBondingCurveAccount(bondingCurveAccount);

    // Array to hold our instructions
    const instructions = [];

    // You need to calculate these values from the actual bonding curve account data.
    // There is a lot more math that needs to be done but this will work on a fresh CA with no buys
    // Where 0.75 SOL should get you more than 20,000,000 tokens but the sol value here is
    // the maximum amount you want to spend for the output amount of tokens
    const solAmount = amm?.getSellPrice(BigInt(tokenAmount * 10 ** 6));

    try {
      const associatedTokenAccountInfo = await solanaConnection.getAccountInfo(
        associatedTokenAccount
      );

      // If the associated token account does not exist, create it
      if (!associatedTokenAccountInfo) {
        throw new Error("No tokens to sell.");
      }
    } catch (error) {
      console.error(error);
      return;
    }
    if (!solAmount) return;

    const token_amount = new BN(tokenAmount).mul(new BN(Math.pow(10, 6)));
    const sol_amount = new BN(Number(solAmount)).mul(new BN(LAMPORTS_PER_SOL));

    // Build a transaction to buy tokens
    const buyInstruction = await program.methods
      .sell(token_amount, new BN(Math.floor(sol_amount.toNumber() * 1.15)))
      .accounts({
        feeRecipient: pumpfunFeeAccount,
        associatedUser: associatedTokenAccount,
        user: provider.wallet.publicKey,
        mint: mint,
        associatedBondingCurve: associatedBondingCurveAccount,
      })
      .instruction();

    // Append it to the earlier transaction since we might need to create the ATA
    instructions.push(buyInstruction);

    // Build the final transaction
    const transaction = await makeV0Transaction(instructions, owner);

    const signature = await solanaConnection.sendTransaction(transaction, {
      skipPreflight: true,
      maxRetries: 5,
    });
    console.log(`Transaction Signature: ${signature}`);

    return signature;
  }

  // Notify me if there is a token , where dev is holding less than 5%, ai related, 0 snipers
  // FSH  @ 30% gain auto sell
  // Buy when wallet x buys
  // Buy when token matches <filters>, sell @ 100%
  // Buy when migrated ,  stop loss 1%
}
