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
  // const connection = new Connection("https://api.devnet.solana.com");

  const feePayer = new Keypair();
  const echoBuffer = new Keypair();

  console.log("The EchoBuffer Key: ", echoBuffer.publicKey.toBase58());
  // for Instruction 1

  console.log("Requesting Airdrop of 1 SOL...");
  let placeholder = await connection.requestAirdrop(feePayer.publicKey, 2e9);
  await connection.confirmTransaction(placeholder);
  console.log("Airdrop received");

  console.log();
  let createIx = SystemProgram.createAccount({
    fromPubkey: feePayer.publicKey,
    newAccountPubkey: echoBuffer.publicKey,
    /** Amount of lamports to transfer to the created account */
    lamports: await connection.getMinimumBalanceForRentExemption(echo.length),
    /** Amount of space in bytes to allocate to the created account */
    space: echo.length + 9, // account for padding in initializeAuthorizedEcho
    /** Public key of the program to assign as the owner of the created account */
    programId: programId,
  });

  const idx1 = Buffer.from(new Uint8Array([0]));
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
    data: Buffer.concat([idx1, messageLen, message]),
  });

  const authBuffSize = Buffer.from(
    new Uint8Array(new BN(echo.length + 9).toArray("le", 8))
  );

  const buffSeed = 10;
  // random hardcoded to 10
  const authBuffSeed = Buffer.from(
    new Uint8Array(new BN(buffSeed).toArray("le", 8))
  );

  let [buffer_seed, bump_seed] = await PublicKey.findProgramAddress(
    [feePayer.publicKey.toBuffer(), authBuffSeed],
    programId
  );

  let initializeBufferIx = new TransactionInstruction({
    keys: [
      { pubkey: buffer_seed, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: true, isWriteable: false }, // The authority here can be anyone! in this case I'm just initializing it to feePayer.
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: programId,
    data: Buffer.concat([idx1, authBuffSeed, authBuffSize]),
  });

  // Authorize Echo
  const idx2 = Buffer.from(new Uint8Array([2]));

  let authEchoIx = new TransactionInstruction({
    keys: [
      {
        pubkey: buffer_seed,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: feePayer.publicKey, isSigner: true, isWriteable: false },
    ],
    programId: programId,
    data: Buffer.concat([idx2, messageLen, message]),
  });

  let tx = new Transaction();
  tx.add(createIx).add(echoIx);

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, echoBuffer],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    }
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  data = (await connection.getAccountInfo(echoBuffer.publicKey, "confirmed"))
    .data;
  console.log("Echo Buffer Text:", data.toString());

  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////
  // for instruction 2
  const authorizedEcho = async () => {
    var args = process.argv.slice(2);
    const programId = new PublicKey(args[0]);
    const echo = args[1];

    const connection = new Connection("http://127.0.0.1:8899");
    // const connection = new Connection("https://api.devnet.solana.com");

    const feePayer = new Keypair();
    const echoBuffer = new Keypair();

    console.log("Requesting Airdrop of 1 SOL...");
    let placeholder = await connection.requestAirdrop(feePayer.publicKey, 2e9);
    await connection.confirmTransaction(placeholder);
    console.log("Airdrop received");

    const idx = Buffer.from(new Uint8Array([2]));
    const messageLen = Buffer.from(
      new Uint8Array(new BN(echo.length).toArray("le", 4))
    );
    const message = Buffer.from(echo, "ascii");

    const authBuffSize = Buffer.from(
      new Uint8Array(new BN(echo.length + 9).toArray("le", 8))
    );

    const buffSeed = 10;
    // random hardcoded to 10
    const authBuffSeed = Buffer.from(
      new Uint8Array(new BN(buffSeed).toArray("le", 8))
    );

    let [pda_key, bump_seed] = await PublicKey.findProgramAddress(
      [feePayer.publicKey.toBuffer(), authBuffSeed],
      programId
    );

    let initializeBufferIx = new TransactionInstruction({
      keys: [
        { pubkey: pda_key, isSigner: false, isWritable: true },
        { pubkey: feePayer.publicKey, isSigner: true, isWriteable: false }, // The authority here can be anyone! in this case I'm just initializing it to feePayer.
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.concat([idx, authBuffSeed, authBuffSize]),
    });

    let authEchoIx = new TransactionInstruction({
      keys: [
        {
          pubkey: pda_key,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: feePayer.publicKey, isSigner: true, isWriteable: false },
      ],
      programId: programId,
      data: Buffer.concat([idx, messageLen, message]),
    });

    let tx = new Transaction();
    tx.add(initializeBufferIx);

    let txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
      commitment: "confirmed",
    });
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

    data = (await connection.getAccountInfo(pda_key, "confirmed")).data;
    console.log("Echo Buffer Text:", data.toString());
  };
};

// authorizedEcho()
//   .then(() => console.log("Success"))
//   .catch((err) => console.log(err));

main()
  .then(() => console.log("Success"))
  .catch((err) => console.log(err));
