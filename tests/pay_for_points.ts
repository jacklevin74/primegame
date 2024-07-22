import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker - Pay for Points', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let treasuryPda: PublicKey;
  let treasuryBump: number;
  let userPda: PublicKey;
  let userBump: number;

  before(async () => {
    await initializeTreasury();
    await initializeUser();
  });

  async function initializeTreasury() {
    [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury")],
      program.programId
    );

    try {
      await program.account.treasury.fetch(treasuryPda);
      console.log("Treasury account already exists.");
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        console.log("Treasury account does not exist. Initializing...");

        const tx = await program.methods.initializeTreasury(treasuryBump).accounts({
          treasury: treasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc();

        console.log("Initialization transaction signature:", tx);
        const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
        if (treasuryAccount.amount.toNumber() !== 0) {
          throw new Error('Treasury account amount is not 0');
        }
      } else {
        throw err;
      }
    }
  }

  async function initializeUser() {
    [userPda, userBump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.account.user.fetch(userPda);
      console.log("User account already exists.");
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        console.log("User account does not exist. Initializing...");

        const tx = await program.methods.initializeUser(userBump).accounts({
          user: userPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc();

        console.log("User initialization transaction signature:", tx);
        const userAccount = await program.account.user.fetch(userPda);
        if (userAccount.points.toNumber() !== 1000) {
          throw new Error('User account points are not 1000');
        }
      } else {
        throw err;
      }
    }
  }

  it('User pays 1 SOL to receive 1000 points', async () => {
    const tx = await program.methods.payForPoints(userBump).accounts({
      user: userPda,
      treasury: treasuryPda,
      payer: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    }).rpc();

    console.log("Paid for points Transaction signature:", tx);

    const userAccount = await program.account.user.fetch(userPda);
    console.log('User Points:', userAccount.points.toNumber());

    const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
    console.log('Treasury Points:', treasuryAccount.amount.toNumber());
  });
});

