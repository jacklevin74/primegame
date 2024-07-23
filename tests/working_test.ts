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

    try {
      await program.account.jackpot.fetch(jackpotPda);
      await program.account.treasury.fetch(treasuryPda);
      await program.account.playerList.fetch(playerListPda);
      await program.account.leaderboard.fetch(leaderboardPda);
    } catch (err) {
      console.log("Some accounts do not exist. Initializing...");

      await program.methods
        .initialize(jackpotBump)
        .accounts({
          jackpot: jackpotPda,
          treasury: treasuryPda,
          playerList: playerListPda,
          leaderboard: leaderboardPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Wait for 3 seconds after initialization
    sleep(3000);
  });

  it('User pays 1 SOL to receive 1000 points', async () => {
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

  it('Play against current slot until jackpot is 0', async () => {
    let jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
    let userAccount = await program.account.user.fetch(userPda);

    let counter = 0;
    while (jackpotAccount.amount.toNumber() > -1 && counter < 10)  {
      try {
        sleep(500);
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
        console.log("Transaction failed or timed out. Continuing to next iteration. " + err);
      }

      jackpotAccount = await program.account.jackpot.fetch(jackpotPda);
      userAccount = await program.account.user.fetch(userPda);

      console.log('Updated Jackpot Points:', jackpotAccount.amount.toNumber());
      console.log('Updated User Points:', userAccount.points.toNumber());
      console.log('Jackpot Winner Pubkey:', jackpotAccount.winner.toBase58());
    }

    // Fetch and display the leaderboard
    const leaderboardAccount = await program.account.leaderboard.fetch(leaderboardPda);
    console.log('Leaderboard:', leaderboardAccount.users);
  });
});
