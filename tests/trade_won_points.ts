import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let jackpotPda: PublicKey;
  let jackpotBump: number;
  let userPda: PublicKey;
  let userBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;
  let stakingTreasuryPda: PublicKey;
  let stakingTreasuryBump: number;
  let totalWonPointsPda: PublicKey;
  let totalWonPointsBump: number;
  let playerListPda: PublicKey;
  let playerListBump: number;
  let leaderboardPda: PublicKey;
  let leaderboardBump: number;
  let ratePda: PublicKey;
  let rateBump: number;

  before(async () => {
    [jackpotPda, jackpotBump] = await PublicKey.findProgramAddress(
      [Buffer.from("jackpot")],
      program.programId
    );

    [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury")],
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

    [playerListPda, playerListBump] = await PublicKey.findProgramAddress(
      [Buffer.from("player_list")],
      program.programId
    );

    [leaderboardPda, leaderboardBump] = await PublicKey.findProgramAddress(
      [Buffer.from("leaderboard")],
      program.programId
    );

    [ratePda, rateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("rate")],
      program.programId
    );

    await program.account.jackpot.fetch(jackpotPda);
    await program.account.treasury.fetch(treasuryPda);
    await program.account.stakingTreasury.fetch(stakingTreasuryPda);
    await program.account.totalWonPoints.fetch(totalWonPointsPda);
    await program.account.playerList.fetch(playerListPda);
    await program.account.leaderboard.fetch(leaderboardPda);
    await program.account.rate.fetch(ratePda);
  });

  it('Trade won points for lamports', async () => {
    let userAccount;

    try {
      [userPda, userBump] = await PublicKey.findProgramAddress(
        [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      userAccount = await program.account.user.fetch(userPda);
    } catch (err) {
      console.error("Fetch Error before 'Trade won points for lamports':", err);
      console.error("Problematic Accounts:");
      console.error(`User Account: ${userPda ? userPda.toBase58() : 'undefined'}`);
      throw new Error("Fetch failed. Exiting tests.");
    }

    try {
      const tx = await program.methods
        .tradeWonPoints(userBump)
        .accounts({
          user: userPda,
          rate: ratePda,
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("\nTransaction signature:", tx);
    } catch (err) {
      console.error("Transaction failed:", err);
    }

    try {
      userAccount = await program.account.user.fetch(userPda);
      const rateAccount = await program.account.rate.fetch(ratePda);
      const payerBalance = await provider.connection.getBalance(provider.wallet.publicKey);
      const stakingTreasuryBalance = await provider.connection.getBalance(stakingTreasuryPda);

      console.log('Updated User Won Points:', userAccount.wonPoints ? userAccount.wonPoints.toNumber() : 0);
      console.log('Updated Rate:', rateAccount.value);
      console.log('Payer Balance:', payerBalance / 1000000000 + " SOL");
      console.log('Staking Treasury Balance:', stakingTreasuryBalance / 1000000000 + " SOL");
    } catch (err) {
      console.error("Fetch Error after trade:", err);
      console.error("Problematic Accounts:");
      console.error(`User Account: ${userPda.toBase58()}`);
      throw new Error("Fetch failed. Exiting tests.");
    }
  });
});

