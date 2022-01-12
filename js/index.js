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

  // for Instruction 1

  console.log("Requesting Airdrop of 1 SOL...");
  let placeholder = await connection.requestAirdrop(feePayer.publicKey, 2e9);
  await connection.confirmTransaction(placeholder);
  console.log("Airdrop received");

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
    new Uint8Array(new BN(echo.length + 9).toArray("le", 8))
  );

  const buffSeed = 10;
  // random hardcoded to 10
  const authBuffSeed = Buffer.from(
    new Uint8Array(new BN(buffSeed).toArray("le", 8))
  );

  let programBuff = Buffer.from(new Uint8Array(["authority"]));

  let [auth_key, bump_seed] = await PublicKey.findProgramAddress(
    [programBuff, feePayer.publicKey.toBuffer(), authBuffSeed],
    programId
  );

  console.log("Auth_key: ", auth_key);
  console.log("feepayer public key: ", feePayer.publicKey);
  console.log("Buffer seed: ", authBuffSeed);

  let initializeBufferIx = new TransactionInstruction({
    keys: [
      { pubkey: auth_key, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: true, isWriteable: false }, // The authority here can be anyone! in this case I'm just initializing it to feePayer.
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: programId,
    data: Buffer.concat([idx, authBuffSeed, authBuffSize]),
  });

  let tx = new Transaction();
  tx.add(initializeBufferIx);

  console.log(
    "Before sendAndConfirmTransaction: ",
    await connection.getBalance(feePayer.publicKey)
  );

  let txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
    commitment: "confirmed",
  });
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  data = (await connection.getAccountInfo(echoBuffer.publicKey, "confirmed"))
    .data;
  console.log("Echo Buffer Text:", data.toString());
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
