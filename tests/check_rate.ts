import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { assert } from 'chai';
import { PrimeSlotChecker } from '../target/types/prime_slot_checker';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker_rate_test', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as Program<PrimeSlotChecker>;

  let userPda: PublicKey;
  let userBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;
  let stakingTreasuryPda: PublicKey;
  let stakingTreasuryBump: number;
  let totalWonPointsPda: PublicKey;
  let totalWonPointsBump: number;
  let ratePda: PublicKey;
  let rateBump: number;

  before(async () => {
    [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury")],
      program.programId
    );

    [stakingTreasuryPda, stakingTreasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("staking_treasury")],
      program.programId
    );

    [totalWonPointsPda, totalWonPointsBump] = await PublicKey.findProgramAddress(
      [Buffer.from("total_won_points")],
      program.programId
    );

    [ratePda, rateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("rate")],
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

      await program.methods
        .initializeRate(rateBump)
        .accounts({
          rate: ratePda,
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

  it('calculates the point rate', async () => {
    try {

      const rateAccount = await program.account.rate.fetch(ratePda);
      console.log('Point rate:', rateAccount.value);

      // Add assertions to check the point rate is correct
      assert.isNumber(rateAccount.value, 'Point rate should be a number');
    } catch (err) {
      console.error("Error in 'calculates the point rate' test:", err);
      throw new Error("Test 'calculates the point rate' failed. Exiting tests.");
    }
  });
});

