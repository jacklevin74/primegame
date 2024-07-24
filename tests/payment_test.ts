import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker_payment_test', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let userPda: PublicKey;
  let userBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;

  before(async () => {
    [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury")],
      program.programId
    );

    try {
      [userPda, userBump] = await PublicKey.findProgramAddress(
        [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializeUser(userBump)
        .accounts({
          user: userPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (err) {
      console.error("Initialization Error:", err);
      console.error("Problematic Accounts:");
      console.error(`User Account: ${userPda.toBase58()}`);
      throw new Error("Initialization failed. Exiting tests.");
    }
  });

  it('User pays 1 SOL to receive 1000 points', async () => {
    try {
      const tx = await program.methods.payForPoints(userBump).accounts({
        user: userPda,
        treasury: treasuryPda,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }).rpc();

      console.log("Paid for points Transaction signature:", tx);

      const userAccount = await program.account.user.fetch(userPda);

      const treasuryBalance = await provider.connection.getBalance(treasuryPda);
      console.log("Treasury Balance: " + treasuryBalance / 1000000000 + " SOL");
    } catch (err) {
      console.error("Error in 'User pays 1 SOL to receive 1000 points' test:", err);
      console.error("Problematic Accounts:");
      console.error(`User Account: ${userPda.toBase58()}`);
      console.error(`Treasury Account: ${treasuryPda.toBase58()}`);
      throw new Error("Test 'User pays 1 SOL to receive 1000 points' failed. Exiting tests.");
    }
  });
});

