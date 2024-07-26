import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let userPda, userBump;
  let totalWonPointsPda, totalWonPointsBump;
  let stakingTreasuryPda, stakingTreasuryBump;

  before(async () => {
    [userPda, userBump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    [totalWonPointsPda, totalWonPointsBump] = await PublicKey.findProgramAddress(
      [Buffer.from("total_won_points")],
      program.programId
    );

    [stakingTreasuryPda, stakingTreasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("staking_treasury")],
      program.programId
    );

    // Ensure the user account is initialized
    try {
      const userAccount = await program.account.user.fetch(userPda);
      console.log("User Account already exists:", {
        publicKey: userPda.toBase58(),
        content: {
          points: userAccount.points.toString(),
          wonPoints: userAccount.wonPoints.toString(),
          lastWonSlot: userAccount.lastWonSlot.toString(),
          lastClaimedSlot: userAccount.lastClaimedSlot.toString(),
          lastClaimedLamports: userAccount.lastClaimedLamports.toString(),
        },
      });
    } catch (err) {
      console.log(`User Account (${userPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initializeUser(userBump)
        .accounts({
          user: userPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Ensure the total won points account is initialized
    try {
      const totalWonPointsAccount = await program.account.totalWonPoints.fetch(totalWonPointsPda);
      console.log("Total Won Points Account already exists:", {
        publicKey: totalWonPointsPda.toBase58(),
        content: {
          points: totalWonPointsAccount.points.toString(),
        },
      });
    } catch (err) {
      console.log(`Total Won Points Account (${totalWonPointsPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initializeTotalWonPoints()
        .accounts({
          totalWonPoints: totalWonPointsPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Ensure the staking treasury account is initialized
    try {
      const stakingTreasuryAccount = await program.account.stakingTreasury.fetch(stakingTreasuryPda);
      console.log("Staking Treasury Account already exists:", {
        publicKey: stakingTreasuryPda.toBase58(),
      });
    } catch (err) {
      console.log(`Staking Treasury Account (${stakingTreasuryPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initializeStakingTreasury()
        .accounts({
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }
  });

  it('Allows user to claim lamports', async () => {
    console.log(`Attempting to claim lamports for user ${userPda.toBase58()}`);
    
    try {
      const tx = await program.methods
        .claimLamports(userBump)
        .accounts({
          user: userPda,
          totalWonPoints: totalWonPointsPda,
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`Claim lamports transaction signature: ${tx}`);
    } catch (err) {
      console.error(`Error during claimLamports transaction: ${err}`);
    }

    try {
      const userAccount = await program.account.user.fetch(userPda);
      console.log("Updated User Account:", {
        publicKey: userPda.toBase58(),
        content: {
          points: userAccount.points.toString(),
          wonPoints: userAccount.wonPoints.toString(),
          lastWonSlot: userAccount.lastWonSlot.toString(),
          lastClaimedSlot: userAccount.lastClaimedSlot.toString(),
          lastClaimedLamports: userAccount.lastClaimedLamports.toString(),
        },
      });
    } catch (err) {
      console.error("User Account fetch error after claim:", err);
    }
  });
});

