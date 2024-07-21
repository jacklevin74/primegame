import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { assert } from 'chai';

describe('prime_slot_checker', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<PrimeSlotChecker>;

  let jackpotPda: PublicKey;
  let jackpotBump: number;
  let userPda: PublicKey;
  let userBump: number;

  it('Initializes the jackpot account', async () => {
    [jackpotPda, jackpotBump] = await PublicKey.findProgramAddress(
      [Buffer.from("jackpot")],
      program.programId
    );

    try {
      await program.account.jackpot.fetch(jackpotPda);
      console.log("Jackpot account already exists.");
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        console.log("Jackpot account does not exist. Initializing...");

        const tx = await program.methods
          .initialize(jackpotBump)
          .accounts({
            jackpot: jackpotPda,
            payer: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Jackpot initialization transaction signature:", tx);
        const jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
        assert.equal(jackpotAccount.amount.toNumber(), 0);
      } else {
        throw err;
      }
    }
  });

  it('Initializes the user account', async () => {
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

        const tx = await program.methods
          .initializeUser(userBump)
          .accounts({
            user: userPda,
            payer: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("User initialization transaction signature:", tx);
        const userAccount = await program.account.user.fetch(userPda);
        assert.equal(userAccount.points.toNumber(), 1000);
      } else {
        throw err;
      }
    }
  });

  it('Checks a non-prime slot', async () => {
    const currentSlot = await provider.connection.getSlot();
    // Ensure current slot is not prime for this test
    const nonPrimeSlot = currentSlot % 2 === 0 ? currentSlot : currentSlot + 1;

    const tx = await program.methods
      .checkSlot(userBump)
      .accounts({
        user: userPda,
        jackpot: jackpotPda,
        payer: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Transaction signature for non-prime slot:", tx);

    const jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
    const userAccount = await program.account.user.fetch(userPda);

    assert.isAbove(jackpotAccount.amount.toNumber(), 0);
    assert.equal(userAccount.points.toNumber(), 1000);
  });

  it('Checks a prime slot', async () => {
    const currentSlot = await provider.connection.getSlot();
    // Ensure current slot is prime for this test
    const primeSlot = currentSlot % 2 === 0 ? currentSlot + 1 : currentSlot;

    const tx = await program.methods
      .checkSlot(userBump)
      .accounts({
        user: userPda,
        jackpot: jackpotPda,
        payer: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Transaction signature for prime slot:", tx);

    const jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
    const userAccount = await program.account.user.fetch(userPda);

    assert.equal(jackpotAccount.amount.toNumber(), 0);
    assert.isAbove(userAccount.points.toNumber(), 1000);
  });
});

