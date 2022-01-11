const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");

const BN = require("bn.js");

const main = async () => {
  var args = process.argv.slice(2);
  const programId = new PublicKey(args[0]);
  const echo = args[1];

  const connection = new Connection("http://127.0.0.1:8899");

  const feePayer = new Keypair();
  const echoBuffer = new Keypair();

  // for Instruction 1

  const authorizedBuffer = new Keypair();

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");

  let createIx = SystemProgram.createAccount({
    fromPubkey: feePayer.publicKey,
    newAccountPubkey: echoBuffer.publicKey,
    /** Amount of lamports to transfer to the created account */
    lamports: await connection.getMinimumBalanceForRentExemption(echo.length),
    /** Amount of space in bytes to allocate to the created account */
    space: echo.length,
    /** Public key of the program to assign as the owner of the created account */
    programId: programId,
  });

  const idx = Buffer.from(new Uint8Array([1]));
  const messageLen = Buffer.from(
    new Uint8Array(new BN(echo.length).toArray("le", 4))
  );
  const message = Buffer.from(echo, "ascii");

  let echoIx = new TransactionInstruction({
    keys: [
      {
        pubkey: echoBuffer.publicKey,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx, messageLen, message]),
  });

  const authBuffSize = Buffer.from(
    new Uint8Array(new BN(echo.length).toArray("le", 9))
  );

  let programBuff = Buffer.from(
    new Uint8Array(["authority", feePayer.publicKey, authBuffSize])
  );

  let(auth_key, bump_seed) = PublicKey.findProgramAddress(
    programBuff,
    programId
  );

  let initializeBufferIx = new TransactionInstruction({
    keys: [
      { pubkey: authorizedBuffer.publicKey, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: true, isWriteable: false }, // The authority here can be anyone! in this case I'm just initializing it to feePayer.
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: programId,
    data: Buffer.concat([idx, messageLen, authBuffSize]),
  });

  let tx = new Transaction();
  tx.add(createIx).add(echoIx);
  tx.add(initializeBufferIx);

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, echoBuffer],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  data = (await connection.getAccountInfo(echoBuffer.publicKey)).data;
  console.log("Echo Buffer Text:", data.toString());
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
