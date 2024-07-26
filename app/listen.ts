import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const provider = anchor.AnchorProvider.local();
anchor.setProvider(provider);

const programId = new PublicKey("B4FMCpibTGdZhxHHNgWWnwk5PhhKdST37uFRY6TVksaj");
const idl = await anchor.Program.fetchIdl(programId, provider);
const program = new anchor.Program(idl, programId);

const connection = new Connection(clusterApiUrl('https://xolana.xen.network'));

// Subscribe to events
const eventEmitter = program.addEventListener('PrimeFound', (event: any) => {
  console.log("Prime number found event:", event);
});

// Remove the event listener when done
program.removeEventListener(eventEmitter);

