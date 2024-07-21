import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, Connection, SystemProgram } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Path to the keypair file
const keypairPath = path.resolve(require('os').homedir(), '.config', 'solana', 'id.json');

// Load the keypair from the file
const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
const wallet = Keypair.fromSecretKey(secretKey);

console.log("Wallet public key:", wallet.publicKey.toBase58());

// Setup provider with custom RPC URL
const customRpcUrl = 'http://xolana.xen.network:8899/';
const connection = new Connection(customRpcUrl, 'confirmed');
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), anchor.AnchorProvider.defaultOptions());
anchor.setProvider(provider);

console.log("Provider set with custom RPC URL");

// New program ID
const programId = new PublicKey('9kmiyGAXfnvXJPLNXHJYjhABieuEouDeyAJ8RQCCT4AU');
console.log("Program ID:", programId.toBase58());

// Load the IDL from the file system
const idlPath = path.resolve(__dirname, './target/idl/prime_slot_checker.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

console.log("IDL loaded");

const main = async () => {
  try {
    const program = new anchor.Program(idl, provider);

    console.log("Program initialized");

    // Derive the PDA for the jackpot account
    const [jackpotPda, jackpotBump] = await PublicKey.findProgramAddress(
      [Buffer.from("jackpot")],
      programId
    );

    console.log("Jackpot PDA:", jackpotPda.toBase58());
    console.log("Jackpot bump seed:", jackpotBump);

    // Initialize the jackpot account if it doesn't exist
    try {
      await program.account.jackpot.fetch(jackpotPda);
      console.log("Jackpot account already exists.");
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        console.log("Jackpot account does not exist. Initializing...");

        // Initialize the jackpot account
        try {
          const txInitJackpot = await program.methods
            .initialize(jackpotBump)
            .accounts({
              jackpot: jackpotPda,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([wallet])
            .rpc();

          console.log("Jackpot initialization transaction signature:", txInitJackpot);
        } catch (initJackpotErr) {
          console.error("Error initializing jackpot account:", initJackpotErr);
          return;
        }
      } else {
        console.error("Error checking jackpot account:", err);
        return;
      }
    }

    // Derive the PDA for the user's account
    const [userPda, userBump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), wallet.publicKey.toBuffer()],
      programId
    );

    console.log("User PDA:", userPda.toBase58());
    console.log("User bump seed:", userBump);

    // Initialize the user account if it doesn't exist
    try {
      await program.account.user.fetch(userPda);
      console.log("User account already exists.");
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        console.log("User account does not exist. Initializing...");

        // Initialize the user account
        try {
          const txInitUser = await program.methods
            .initializeUser(userBump)
            .accounts({
              user: userPda,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([wallet])
            .rpc();

          console.log("User initialization transaction signature:", txInitUser);
        } catch (initUserErr) {
          console.error("Error initializing user account:", initUserErr);
          return;
        }
      } else {
        console.error("Error checking user account:", err);
        return;
      }
    }

    // Send transaction to check the current slot
    const tx = await program.methods
      .checkSlot(userBump)
      .accounts({
        user: userPda,
        jackpot: jackpotPda,
        payer: wallet.publicKey,
      })
      .signers([wallet])
      .rpc();

    console.log("Transaction signature", tx);

    const userAccountData: any = await program.account.user.fetch(userPda);
    console.log('User points after checking the current slot:', userAccountData.points.toString());

    const jackpotAccountData: any = await program.account.jackpot.fetch(jackpotPda);
    console.log('Jackpot pool amount:', jackpotAccountData.amount.toString());
  } catch (err) {
    console.error("Error:", err);
  }
};

main().catch((err) => {
  console.error("Main function error:", err);
});

