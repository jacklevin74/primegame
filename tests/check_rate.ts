import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker_rate_test', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let userPda: PublicKey;
  let userBump: number;
  let stakingTreasuryPda: PublicKey;
  let stakingTreasuryBump: number;
  let totalWonPointsPda: PublicKey;
  let totalWonPointsBump: number;

  before(async () => {
    [stakingTreasuryPda, stakingTreasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("staking_treasury")],
      program.programId
    );

    [totalWonPointsPda, totalWonPointsBump] = await PublicKey.findProgramAddress(
      [Buffer.from("total_won_points")],
      program.programId
    );

    [userPda, userBump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeUser(userBump)
        .accounts({
          user: userPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .initializeStakingTreasury()
        .accounts({
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .initializeTotalWonPoints()
        .accounts({
          totalWonPoints: totalWonPointsPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

    } catch (err) {
      console.error("Initialization Error:", err);
      console.error("Problematic Accounts:");
      console.error(`User Account: ${userPda.toBase58()}`);
      console.error(`Staking Treasury Account: ${stakingTreasuryPda.toBase58()}`);
      console.error(`Total Won Points Account: ${totalWonPointsPda.toBase58()}`);
      throw new Error("Initialization failed. Exiting tests.");
    }
  });

  it('calculates the point rate', async () => {
    try {
      // Call the calculatePointRate method
      const pointRateResult = await program.methods
        .calculatePointRate()
        .accounts({
          stakingTreasury: stakingTreasuryPda,
          totalWonPoints: totalWonPointsPda,
          payer: provider.wallet.publicKey,
        })
        .rpc();

      // Fetch the result from the logs or program output
      console.log('Point rate result:', pointRateResult);
      
    } catch (err) {
      console.error("Error in 'calculates the point rate' test:", err);
      console.error("Problematic Accounts:");
      console.error(`Staking Treasury Account: ${stakingTreasuryPda.toBase58()}`);
      console.error(`Total Won Points Account: ${totalWonPointsPda.toBase58()}`);
      throw new Error("Test 'calculates the point rate' failed. Exiting tests.");
    }
  });
});

