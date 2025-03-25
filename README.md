# SuiSweeper - Sui Wallet Monitor

A Node.js application that monitors a Sui wallet and automatically transfers tokens to a specified destination address.

## Features

- Real-time wallet balance monitoring
- Automatic token transfer when balance exceeds threshold
- Support for both hex and base58-encoded private keys
- Configurable RPC endpoint and minimum gas settings
- Detailed logging with Explorer links

## Prerequisites

- Node.js >= 16
- npm or yarn
- A Sui wallet private key
- A destination wallet address

## Installation

1. Clone the repository

```bash
https://github.com/mesamirh/SuiSweeper.git
cd SuiSweeper
```

2. Install dependencies:

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with:

```properties
RPC_URL=https://fullnode.mainnet.sui.io:443
PRIVATE_KEY=your_private_key
DESTINATION_ADDRESS=your_destination_address
```

## Usage

Start the monitor:

```bash
npm start
```

## Dependencies

- @mysten/sui.js: ^0.54.1
- bs58: ^5.0.0
- dotenv: ^16.4.7
