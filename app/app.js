document.addEventListener("DOMContentLoaded", async function () {
    // Create a connection to the cluster using the specified RPC endpoint
    const connection = new solanaWeb3.Connection('https://xolana.xen.network', 'confirmed');

    let userWallet;
    let userPublicKey;
    let userPda;
    let userBump;

    // Address of the deployed program
    const programId = new solanaWeb3.PublicKey("6CqxdcbWwvkHiNFuYQndvuuwXBm9x9AcQedFGGLkZv6Z");

    // Get the buttons and divs
    const generateWalletButton = document.getElementById("generateWalletButton");
    const walletPublicKeyDiv = document.getElementById("walletPublicKey");
    const payForPointsButton = document.getElementById("payForPointsButton");
    const userPointsDiv = document.getElementById("userPoints");

    // Function to generate a new wallet
    const generateWallet = () => {
        userWallet = solanaWeb3.Keypair.generate();
        userPublicKey = userWallet.publicKey;
        walletPublicKeyDiv.textContent = `Wallet Public Key: ${userPublicKey.toBase58()}`;
        payForPointsButton.disabled = false;
    };

    // Create a function to pay for points
    const payForPoints = async () => {
        try {
            // Find the user PDA
            [userPda, userBump] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("user"), userPublicKey.toBuffer()],
                programId
            );

            // Initialize the user account
            let transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.createAccount({
                    fromPubkey: userWallet.publicKey,
                    newAccountPubkey: userPda,
                    lamports: await connection.getMinimumBalanceForRentExemption(8 + 8 + 8),
                    space: 8 + 8 + 8,
                    programId: programId,
                })
            );

            // Sign and send the transaction
            let signature = await solanaWeb3.sendAndConfirmTransaction(
                connection,
                transaction,
                [userWallet]
            );

            console.log("Initialization Transaction signature:", signature);

            // Pay for points (assuming the logic is implemented in the program)
            transaction = new solanaWeb3.Transaction().add(
                // Add instruction to pay for points here
                {
                    keys: [
                        { pubkey: userPda, isSigner: false, isWritable: true },
                        { pubkey: new solanaWeb3.PublicKey("treasuryPda"), isSigner: false, isWritable: true },
                        { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
                        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                    ],
                    programId: programId,
                    data: Buffer.from([/* add your instruction data here */])
                }
            );

            signature = await solanaWeb3.sendAndConfirmTransaction(
                connection,
                transaction,
                [userWallet]
            );

            console.log("Paid for points Transaction signature:", signature);

            // Fetch and display the user's points
            const userAccountInfo = await connection.getAccountInfo(userPda);
            const userPoints = userAccountInfo.data.readUInt32LE(0); // Adjust based on your program's account structure
            userPointsDiv.textContent = `User Points: ${userPoints}`;
        } catch (err) {
            console.error("Error in 'Pay for Points' operation:", err);
        }
    };

    // Event listener for the generate wallet button
    generateWalletButton.addEventListener("click", generateWallet);

    // Event listener for the pay for points button
    payForPointsButton.addEventListener("click", payForPoints);
});

