import { randomUUID } from "node:crypto";
import {
  initiateDeveloperControlledWalletsClient,
  type CircleDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import { circleConfigured, config } from "../config.js";
import { logger } from "../logger.js";

export interface WalletInfo {
  id: string;
  address: string;
  blockchain: string;
}

export interface NanopaymentResult {
  tx_hash: string;
  explorer_url: string;
  amount_usdc: number;
  from: string;
  to: string;
  memo?: string;
  settled_at: string;
  mock?: boolean;
  tx_id?: string;
  state?: string;
}

// Circle's v8.4.1 type enum doesn't include "ARC-TESTNET" yet, but the live
// sandbox API accepts it (we confirmed this during wallet provisioning). We
// cast to bypass the stale type.
const ARC_BLOCKCHAIN = "ARC-TESTNET" as never;

const SUCCESS_STATES = new Set(["CONFIRMED", "COMPLETE", "CLEARED", "SENT"]);
const FAILURE_STATES = new Set(["FAILED", "CANCELLED", "DENIED"]);
const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

class CircleClient {
  private _real: CircleDeveloperControlledWalletsClient | null = null;

  private real(): CircleDeveloperControlledWalletsClient {
    if (!this._real) {
      this._real = initiateDeveloperControlledWalletsClient({
        apiKey: config.circle.apiKey,
        entitySecret: config.circle.entitySecret,
      });
    }
    return this._real;
  }

  /**
   * Send a USDC nanopayment on Arc Testnet. Real mode uses Circle's
   * Developer-Controlled Wallets API and polls until the tx lands on chain.
   */
  async sendNanopayment(params: {
    from_wallet_id: string;
    to_wallet_id?: string;
    to_address?: string;
    amount_usdc: number;
    memo?: string;
  }): Promise<NanopaymentResult> {
    if (!circleConfigured()) return this.mockNanopayment(params);

    const destination = params.to_address;
    if (!destination) {
      logger.warn(
        { params },
        "circle.sendNanopayment: no destination address — mocking",
      );
      return this.mockNanopayment(params);
    }

    const client = this.real();
    const refId = (params.memo ?? "").slice(0, 120);

    try {
      const create = await client.createTransaction({
        idempotencyKey: randomUUID(),
        walletId: params.from_wallet_id,
        destinationAddress: destination,
        amount: [params.amount_usdc.toString()],
        tokenAddress: config.arc.usdcContract,
        blockchain: ARC_BLOCKCHAIN,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
        refId,
      });

      const txId = create.data?.id;
      if (!txId) {
        throw new Error(`no tx id in create response: ${JSON.stringify(create.data)}`);
      }

      const { txHash, state } = await this.pollTransaction(client, txId);
      return {
        tx_hash: txHash,
        explorer_url: `${config.arc.blockExplorer}/tx/${txHash}`,
        amount_usdc: params.amount_usdc,
        from: params.from_wallet_id,
        to: destination,
        memo: params.memo,
        settled_at: new Date().toISOString(),
        tx_id: txId,
        state,
        mock: false,
      };
    } catch (err) {
      logger.error({ err, params }, "circle.sendNanopayment failed — mock fallback");
      return this.mockNanopayment(params);
    }
  }

  private async pollTransaction(
    client: CircleDeveloperControlledWalletsClient,
    txId: string,
  ): Promise<{ txHash: string; state: string }> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const poll = await client.getTransaction({ id: txId });
        const tx = poll.data?.transaction;
        const state = tx?.state ?? "UNKNOWN";
        if (SUCCESS_STATES.has(state)) {
          const txHash = tx?.txHash ?? "";
          if (txHash) return { txHash, state };
        }
        if (FAILURE_STATES.has(state)) {
          const reason = (tx as { errorReason?: string } | undefined)?.errorReason;
          throw new Error(`Circle tx ${txId} ${state}${reason ? `: ${reason}` : ""}`);
        }
      } catch (err) {
        logger.debug({ err, txId }, "circle poll retry");
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new Error(`Circle tx ${txId} timed out after ${POLL_TIMEOUT_MS}ms`);
  }

  async pauseWallet(_wallet_id: string): Promise<{ supported: boolean; detail?: string }> {
    return {
      supported: true,
      detail: "AgentGuard-level pause (Circle has no native wallet freeze)",
    };
  }

  async unpauseWallet(_wallet_id: string): Promise<{ supported: boolean }> {
    return { supported: true };
  }

  async createWallet(params: { name: string }): Promise<WalletInfo> {
    if (!circleConfigured()) return this.mockCreateWallet(params.name);
    logger.warn("circle.createWallet not implemented — use scripts/provision-wallets.ts");
    return this.mockCreateWallet(params.name);
  }

  private mockNanopayment(params: {
    from_wallet_id: string;
    to_wallet_id?: string;
    to_address?: string;
    amount_usdc: number;
    memo?: string;
  }): NanopaymentResult {
    const tx_hash = "0x" + randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    return {
      tx_hash,
      explorer_url: `${config.arc.blockExplorer}/tx/${tx_hash}`,
      amount_usdc: params.amount_usdc,
      from: params.from_wallet_id,
      to: params.to_wallet_id ?? params.to_address ?? "",
      memo: params.memo,
      settled_at: new Date().toISOString(),
      mock: true,
    };
  }

  private mockCreateWallet(name: string): WalletInfo {
    const id = `wallet-${name}-${Date.now()}`;
    const address = "0x" + randomUUID().replace(/-/g, "").slice(0, 40);
    return { id, address, blockchain: "ARC-TESTNET" };
  }
}

export const circle = new CircleClient();
