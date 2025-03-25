const { SuiClient, getFullnodeUrl } = require("@mysten/sui.js/client");
const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
const { TransactionBlock } = require("@mysten/sui.js/transactions");
const bs58 = require("bs58");
require("dotenv").config();

class SuiWalletMonitor {
  constructor() {
    this.rpcUrl = process.env.RPC_URL || getFullnodeUrl("mainnet");
    this.destinationAddress = process.env.DESTINATION_ADDRESS;
    this.minimumGas = 10000000; // 0.01 SUI
    this.client = null;
    this.keypair = null;
    this.address = null;
  }

  formatBalance(balance) {
    return `${(balance / 1000000000).toFixed(9)} SUI`;
  }

  async initializeClient() {
    try {
      this.client = new SuiClient({ url: this.rpcUrl });
      const checkpoint = await this.client.getLatestCheckpointSequenceNumber();
      console.log(
        `🌐 Connected to SUI network! Latest checkpoint: ${checkpoint}`
      );
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to RPC: ${error.message}`);
      return false;
    }
  }

  initializeWallet() {
    try {
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) throw new Error("Private key not found in environment");

      console.log(`🔑 Loading wallet from private key...`);

      if (privateKey.startsWith("suiprivkey")) {
        const decoded = bs58.decode(privateKey.replace("suiprivkey", ""));
        const seed = decoded.slice(1, 33);
        this.keypair = Ed25519Keypair.fromSecretKey(seed);
      } else {
        const cleanKey = privateKey.replace("0x", "");
        if (cleanKey.length !== 64) {
          throw new Error(
            `Invalid private key length. Expected 64 hex chars, got ${cleanKey.length}`
          );
        }
        const keyBytes = Buffer.from(cleanKey, "hex");
        this.keypair = Ed25519Keypair.fromSecretKey(keyBytes);
      }

      this.address = this.keypair.getPublicKey().toSuiAddress();
      console.log(`✅ Wallet initialized! Address: ${this.address}`);
      console.log(
        `🔍 Check it on Sui Explorer: https://suiexplorer.com/address/${this.address}`
      );
      return true;
    } catch (error) {
      console.error(`❌ Wallet initialization error: ${error.message}`);
      return false;
    }
  }

  async checkBalanceAndTransfer() {
    try {
      const coins = await this.client.getCoins({ owner: this.address });

      if (!coins.data.length) {
        console.log(
          `💰 No coins available in wallet - ${new Date().toISOString()}`
        );
        return;
      }

      const totalBalance = coins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
        BigInt(0)
      );

      console.log(
        `💸 Current balance: ${this.formatBalance(
          totalBalance.toString()
        )} - ${new Date().toISOString()}`
      );

      const minimumGasBigInt = BigInt(this.minimumGas);

      if (totalBalance > minimumGasBigInt) {
        const amountToTransfer = totalBalance - minimumGasBigInt;
        console.log(
          `🚀 Preparing to transfer: ${this.formatBalance(
            amountToTransfer.toString()
          )}`
        );

        const txb = new TransactionBlock();
        const [coin] = txb.splitCoins(txb.gas, [
          txb.pure(amountToTransfer.toString()),
        ]);
        txb.transferObjects([coin], txb.pure(this.destinationAddress));
        txb.setGasBudget(this.minimumGas);

        const result = await this.client.signAndExecuteTransactionBlock({
          transactionBlock: txb,
          signer: this.keypair,
          options: { showEffects: true },
        });

        console.log(`🎉 Transfer successful! Digest: ${result.digest}`);
        console.log(
          `🔗 View on Sui Explorer: https://suiexplorer.com/txblock/${result.digest}`
        );
      } else {
        console.log(
          `⚠️ Balance too low for transfer (min: ${this.formatBalance(
            this.minimumGas.toString()
          )})`
        );
      }
    } catch (error) {
      console.error(
        `❌ Transfer error: ${error.message} - ${new Date().toISOString()}`
      );
      await this.sleep(5000);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async startMonitoring() {
    while (true) {
      try {
        if (!this.client) {
          const clientInitialized = await this.initializeClient();
          if (!clientInitialized) {
            console.log("🔄 Retrying connection in 5 seconds...");
            await this.sleep(5000);
            continue;
          }
        }

        if (!this.keypair || !this.address) {
          const walletInitialized = this.initializeWallet();
          if (!walletInitialized) {
            console.log("🔄 Retrying wallet initialization in 5 seconds...");
            await this.sleep(5000);
            continue;
          }
        }

        console.log("👀 Starting wallet monitoring...");
        while (true) {
          await this.checkBalanceAndTransfer();
          await this.sleep(1000);
        }
      } catch (error) {
        console.error(
          `❌ Monitoring error: ${error.message} - ${new Date().toISOString()}`
        );
        console.log("🔄 Restarting monitoring in 5 seconds...");
        await this.sleep(5000);
      }
    }
  }
}

async function main() {
  console.log("🚀 Launching Sui Wallet Monitor...");
  const monitor = new SuiWalletMonitor();
  try {
    await monitor.startMonitoring();
  } catch (error) {
    console.error(`💥 Fatal error: ${error.message}`);
  }
}

process.on("SIGINT", () => {
  console.log("\n👋 Script stopped by user. Goodbye!");
  process.exit(0);
});

main();
