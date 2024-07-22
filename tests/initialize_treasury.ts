import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('prime_slot_checker - Initialize Treasury', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrimeSlotChecker as anchor.Program<any>;

  let treasuryPda: PublicKey;
  let treasuryBump: number;

  before(async () => {
    await initializeTreasury();
  });

  async function initializeTreasury() {
    [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury")],
      program.programId
    );

    try {
      await program.account.treasury.fetch(treasuryPda);
      console.log("Treasury account already exists.");
    } catch (err) {
      if (err.message.includes("Account does not exist")) {
        console.log("Treasury account does not exist. Initializing...");

        const tx = await program.methods.initializeTreasury(treasuryBump).accounts({
          treasury: treasuryPda,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc();

        console.log("Initialization transaction signature:", tx);
        const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
        if (treasuryAccount.amount.toNumber() !== 0) {
          throw new Error('Treasury account amount is not 0');
        }
      } else {
        throw err;
      }
    }
  }

  it('Treasury is initialized', async () => {
    const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
    console.log('Treasury Points:', treasuryAccount.amount.toNumber());
  });
});

