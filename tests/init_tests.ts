import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker_account_check', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let jackpotPda: PublicKey;
  let jackpotBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;
  let playerListPda: PublicKey;
  let playerListBump: number;
  let leaderboardPda: PublicKey;
  let leaderboardBump: number;
  let stakingTreasuryPda: PublicKey;
  let stakingTreasuryBump: number;
  let userPda: PublicKey;
  let userBump: number;
  let totalWonPointsPda: PublicKey;
  let totalWonPointsBump: number;

  before(async () => {
    [jackpotPda, jackpotBump] = await PublicKey.findProgramAddress(
      [Buffer.from("jackpot")],
      program.programId
    );

    [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury")],
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

    [stakingTreasuryPda, stakingTreasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("staking_treasury")],
      program.programId
    );

    [userPda, userBump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    [totalWonPointsPda, totalWonPointsBump] = await PublicKey.findProgramAddress(
      [Buffer.from("total_won_points")],
      program.programId
    );

    try {
      const jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
      console.log("Jackpot Account:", {
        publicKey: jackpotPda.toBase58(),
        content: {
          amount: jackpotAccount.amount.toString(),
          winner: jackpotAccount.winner.toBase58(),
        },
      });
    } catch (err) {
      console.log(`Jackpot Account (${jackpotPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initialize(jackpotBump)
        .accounts({
          jackpot: jackpotPda,
          treasury: treasuryPda,
          playerList: playerListPda,
          leaderboard: leaderboardPda,
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    try {
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      console.log("Treasury Account:", {
        publicKey: treasuryPda.toBase58(),
        content: {
          amount: treasuryAccount.amount.toString(),
        },
      });
    } catch (err) {
      console.log(`Treasury Account (${treasuryPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initialize(jackpotBump)
        .accounts({
          jackpot: jackpotPda,
          treasury: treasuryPda,
          playerList: playerListPda,
          leaderboard: leaderboardPda,
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    try {
      const playerListAccount = await program.account.playerList.fetch(playerListPda);
      console.log("Player List Account:", {
        publicKey: playerListPda.toBase58(),
        content: {
          players: playerListAccount.players.map(player => player.toBase58()),
        },
      });
    } catch (err) {
      console.log(`Player List Account (${playerListPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initialize(jackpotBump)
        .accounts({
          jackpot: jackpotPda,
          treasury: treasuryPda,
          playerList: playerListPda,
          leaderboard: leaderboardPda,
          stakingTreasury: stakingTreasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    try {
      const leaderboardAccount = await program.account.leaderboard.fetch(leaderboardPda);
      console.log("Leaderboard Account:", {
        publicKey: leaderboardPda.toBase58(),
        content: {
          users: leaderboardAccount.users.map(userEntry => ({
            user: userEntry.user.toBase58(),
            points: userEntry.points.toString(),
          })),
        },
      });
    } catch (err) {
      console.log(`Leaderboard Account (${leaderboardPda.toBase58()}) does not exist. Initializing...`);
      await program.methods
        .initializeLeaderboard(leaderboardBump)
        .accounts({
          leaderboard: leaderboardPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    try {
      const userAccount = await program.account.user.fetch(userPda);
      console.log("User Account:", {
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

    try {
      const stakingTreasuryAccount = await program.account.stakingTreasury.fetch(stakingTreasuryPda);
      console.log("Staking Treasury Account:", {
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

    try {
      const totalWonPointsAccount = await program.account.totalWonPoints.fetch(totalWonPointsPda);
      console.log("Total Won Points Account:", {
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
  });

  it('Check account initialization', async () => {
    try {
      const jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
      console.log("Jackpot Account:", {
        publicKey: jackpotPda.toBase58(),
        content: {
          amount: jackpotAccount.amount.toString(),
          winner: jackpotAccount.winner.toBase58(),
        },
      });
    } catch (err) {
      console.error("Jackpot Account fetch error:", err);
    }

    try {
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      console.log("Treasury Account:", {
        publicKey: treasuryPda.toBase58(),
        content: {
          amount: treasuryAccount.amount.toString(),
        },
      });
    } catch (err) {
      console.error("Treasury Account fetch error:", err);
    }

    try {
      const playerListAccount = await program.account.playerList.fetch(playerListPda);
      console.log("Player List Account:", {
        publicKey: playerListPda.toBase58(),
        content: {
          players: playerListAccount.players.map(player => player.toBase58()),
        },
      });
    } catch (err) {
      console.error("Player List Account fetch error:", err);
    }

    try {
      const leaderboardAccount = await program.account.leaderboard.fetch(leaderboardPda);
      console.log("Leaderboard Account:", {
        publicKey: leaderboardPda.toBase58(),
        content: {
          users: leaderboardAccount.users.map(userEntry => ({
            user: userEntry.user.toBase58(),
            points: userEntry.points.toString(),
          })),
        },
      });
    } catch (err) {
      console.error("Leaderboard Account fetch error:", err);
    }

    try {
      const userAccount = await program.account.user.fetch(userPda);
      console.log("User Account:", {
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
      console.error("User Account fetch error:", err);
    }

    try {
      const stakingTreasuryAccount = await program.account.stakingTreasury.fetch(stakingTreasuryPda);
      console.log("Staking Treasury Account:", {
        publicKey: stakingTreasuryPda.toBase58(),
      });
    } catch (err) {
      console.error("Staking Treasury Account fetch error:", err);
    }

    try {
      const totalWonPointsAccount = await program.account.totalWonPoints.fetch(totalWonPointsPda);
      console.log("Total Won Points Account:", {
        publicKey: totalWonPointsPda.toBase58(),
        content: {
          points: totalWonPointsAccount.points.toString(),
        },
      });
    } catch (err) {
      console.error("Total Won Points Account fetch error:", err);
    }
  });
});

