import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

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
        if (jackpotAccount.amount.toNumber() !== 0) {
          throw new Error('Jackpot account amount is not 0');
        }
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
        if (userAccount.points.toNumber() !== 1000) {
          throw new Error('User account points are not 1000');
        }
      } else {
        throw err;
      }
    }
  });

  it('Play against current slot until jackpot is 0', async () => {
    let jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
    let userAccount = await program.account.user.fetch(userPda);

    let counter = 0;
    while (jackpotAccount.amount.toNumber() > -1 && counter < 20)  {
      try {
	counter++;
        const tx = await program.methods
          .checkSlot(userBump)
          .accounts({
            user: userPda,
            jackpot: jackpotPda,
            payer: provider.wallet.publicKey,
          })
          .rpc();

        console.log("Transaction signature:", tx);
      } catch (err) {
        console.log("Transaction failed or timed out. Continuing to next iteration.");
      }

      jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
      userAccount = await program.account.user.fetch(userPda);

      console.log('Updated Jackpot Points:', jackpotAccount.amount.toNumber());
      console.log('Updated User Points:', userAccount.points.toNumber());
      console.log('Jackpot Winner Pubkey:', jackpotAccount.winner.toBase58());
    }

  });
});

