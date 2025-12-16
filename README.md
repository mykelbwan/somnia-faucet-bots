# Somnia Faucet

This project provides a faucet for the Somnia network, allowing users to claim test tokens. The faucet is accessible via a backend API, a Discord bot, and a Telegram bot.

## Architecture

The project is a monorepo with the following components:

- **`contracts`**: Contains the Solidity smart contract for the faucet.
- **`backend`**: An Express.js server that serves as the faucet's API and interacts with the smart contract.
- **`discord-bot`**: A Discord bot that allows users to claim tokens via a `/faucet` command.
- **`tg-bot`**: A Telegram bot that allows users to claim tokens via `!STT` and `!USDC` commands.

### Flow

1.  A user interacts with the Discord or Telegram bot.
2.  The bot sends a request to the `backend` API.
3.  The `backend` API validates the request, checks rate limits, and if valid, calls the `SomniaFaucet` smart contract.
4.  The `SomniaFaucet` contract transfers the tokens to the user's wallet.
5.  The `backend` returns the transaction hash to the bot.
6.  The bot displays the transaction details to the user.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/)
- [Foundry](https://getfoundry.sh/)

### Installation and Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/mykelbwan/somnia-faucet-bots.git
    cd somnia-faucet
    ```

2.  **Install dependencies for all packages:**

    From the root of the project, you can install all dependencies using `pnpm`:

    ```bash
    pnpm install -r
    ```

3.  **Set up environment variables:**

    Each package (`backend`, `discord-bot`, `tg-bot`) requires a `.env` file. Copy the `.env.example` files (if they exist) or create new `.env` files and fill in the required values.

    **`backend/.env`:**

    ```
    RPC_PROVIDER=
    PRIVATE_KEY=
    SMART_CONTRACT=
    ```

    **`discord-bot/.env`:**

    ```
    DISCORD_BOT_TOKEN=
    MAIN_ENTRY=http://localhost:3300
    BOT_ID=
    USDC=
    ```

    **`tg-bot/.env`:**

    ```
    TELEGRAM_BOT_TOKEN=
    MAIN_ENTRY=http://localhost:3300
    USDC=
    ```

### Running the Services

- **Backend:**

  ```bash
  cd backend
  pnpm dev
  ```

- **Discord Bot:**

  ```bash
  cd discord-bot
  pnpm dev
  ```

- **Telegram Bot:**

  ```bash
  cd tg-bot
  pnpm dev
  ```

## Smart Contracts

The `SomniaFaucet.sol` contract is a simple faucet that can be funded with native tokens and ERC20 tokens.

### Deployment

To deploy the contract, you can use the Foundry script in `script/SomniaFaucet.s.sol`.

1.  Navigate to the `contracts` directory:

    ```bash
    cd contracts
    ```

2.  Run the deployment script:

    ```bash
    forge script script/SomniaFaucet.s.sol --rpc-url <your-rpc-url> --private-key <your-private-key> --broadcast
    ```

After deployment, update the `SMART_CONTRACT` address in the `backend/.env` file. The owner of the contract will be the address corresponding to the private key used for deployment. The backend's `PRIVATE_KEY` in its `.env` file should correspond to the deployer of the contract to allow it to call the owner-only functions.

## API Reference

### GET /api/faucet/claim-stt

Claims native test tokens.

**Query Parameters:**

- `wallet` (required): The wallet address to receive the tokens.
- `username` (required): The username of the requester (for rate limiting).

**Example:**

```
GET /api/faucet/claim-stt?wallet=0x...&username=testuser
```

### GET /api/faucet/claim-erc20

Claims ERC20 test tokens.

**Query Parameters:**

- `wallet` (required): The wallet address to receive the tokens.
- `token` (required): The token address of the ERC20 token to claim (e.g., `USDC`).
- `username` (required): The username of the requester (for rate limiting).

**Example:**

```
GET /api/faucet/claim-erc20?wallet=0x...&token=USDC&username=testuser
```

## Bot Commands

### Discord

- `/faucet token:<STT|USDC> wallet:<your-wallet-address>`

### Telegram

- `!STT <your-wallet-address>`
- `!USDC <your-wallet-address>`

Additional ERC20 tokens will be supported in the future through updates to the bots.
