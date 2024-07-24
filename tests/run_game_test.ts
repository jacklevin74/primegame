import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

// Function to add delay using a simple loop
function sleep(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

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
  let playerListPda: PublicKey;
  let playerListBump: number;
  let leaderboardPda: PublicKey;
  let leaderboardBump: number;

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

     await program.account.jackpot.fetch(jackpotPda);
     await program.account.treasury.fetch(treasuryPda);
     await program.account.playerList.fetch(playerListPda);
     await program.account.leaderboard.fetch(leaderboardPda);

  });

  it('Play against current slot until jackpot is 0', async () => {
    let jackpotAccount;
    let userAccount;

    try {
      [userPda, userBump] = await PublicKey.findProgramAddress(
        [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
      userAccount = await program.account.user.fetch(userPda);
    } catch (err) {
      console.error("Fetch Error before 'Play against current slot until jackpot is 0':", err);
      console.error("Problematic Accounts:");
      console.error(`Jackpot Account: ${jackpotPda.toBase58()}`);
      console.error(`User Account: ${userPda ? userPda.toBase58() : 'undefined'}`);
      throw new Error("Fetch failed. Exiting tests.");
    }

    let counter = 0;
    while (jackpotAccount.amount.toNumber() > -1 && counter < 50) {
      try {
        counter++;
        const tx = await program.methods
          .checkSlot(userBump)
          .accounts({
            user: userPda,
            jackpot: jackpotPda,
            treasury: treasuryPda,
            playerList: playerListPda,
            leaderboard: leaderboardPda,
            payer: provider.wallet.publicKey,
          })
          .rpc();

        console.log("Transaction signature:", tx);
      } catch (err) {
        console.error("Transaction failed or timed out in iteration", counter, ":", err);
      }

      try {
        jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
        userAccount = await program.account.user.fetch(userPda);

        const payerBalance = await provider.connection.getBalance(provider.wallet.publicKey);
        const treasuryBalance = await provider.connection.getBalance(treasuryPda);

        console.log('Updated Jackpot Points:', jackpotAccount.amount.toNumber());
        console.log('Updated User Points:', userAccount.points.toNumber());
        console.log('Updated User Won Points:', userAccount.wonPoints ? userAccount.wonPoints.toNumber() : 0);
        console.log('Jackpot Winner Pubkey:', jackpotAccount.winner.toBase58());
        console.log('Payer Balance:', payerBalance / 1000000000 + " SOL");
        console.log('Treasury Balance:', treasuryBalance / 1000000000 + " SOL");
      } catch (err) {
        console.error("Fetch Error in iteration", counter, ":", err);
        console.error("Problematic Accounts:");
        console.error(`Jackpot Account: ${jackpotPda.toBase58()}`);
        console.error(`User Account: ${userPda.toBase58()}`);
        throw new Error("Fetch failed during iterations. Exiting tests.");
      }
    }

    try {
      const leaderboardAccount = await program.account.leaderboard.fetch(leaderboardPda);
      console.log('Leaderboard:', leaderboardAccount.users.map(userEntry => ({
        user: userEntry.user.toBase58(),
        points: userEntry.points.toNumber(),
      })));

      const treasuryBalance = await provider.connection.getBalance(treasuryPda);
      console.log('Treasury Balance:', treasuryBalance / 1000000000 + " SOL");
    } catch (err) {
      console.error("Fetch Error for leaderboard or treasury balance:", err);
      console.error("Problematic Accounts:");
      console.error(`Leaderboard Account: ${leaderboardPda.toBase58()}`);
      console.error(`Treasury Account: ${treasuryPda.toBase58()}`);
      throw new Error("Fetch failed for leaderboard or treasury balance. Exiting tests.");
    }
  });
});

