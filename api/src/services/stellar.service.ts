import {
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Account,
  BASE_FEE,
  Contract,
  xdr,
  Address,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { InternalServerError } from '../utils/errors';
import {
  TransactionResponse,
  TransactionStatus,
  AmmEventDecodeResult,
  AmmEventKind,
  AmmEventTopic,
  AmmEventV1,
  AMM_EVENT_TOPIC_MODULE,
  AMM_EVENT_TOPIC_VERSION,
} from '../types';

export class StellarService {
  private horizonUrl: string;
  private sorobanRpcUrl: string;
  private networkPassphrase: string;
  private contractId: string;
  private sorobanServer: SorobanServer;

  constructor() {
    this.horizonUrl = config.stellar.horizonUrl;
    this.sorobanRpcUrl = config.stellar.sorobanRpcUrl;
    this.networkPassphrase = config.stellar.networkPassphrase;
    this.contractId = config.stellar.contractId;
    this.sorobanServer = new SorobanServer(this.sorobanRpcUrl);
  }

  async getAccount(address: string): Promise<Account> {
    try {
      const response = await axios.get(`${this.horizonUrl}/accounts/${address}`);
      return new Account(response.data.id, response.data.sequence);
    } catch (error) {
      logger.error('Failed to fetch account:', error);
      throw new InternalServerError('Failed to fetch account information');
    }
  }

  async submitTransaction(txXdr: string): Promise<TransactionResponse> {
    try {
      const response = await axios.post(`${this.horizonUrl}/transactions`, {
        tx: txXdr,
      });

      return {
        success: true,
        transactionHash: response.data.hash,
        status: 'success',
        ledger: response.data.ledger,
      };
    } catch (error: any) {
      logger.error('Transaction submission failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error.response?.data?.extras?.result_codes || error.message,
      };
    }
  }

  async buildDepositTransaction(
    userAddress: string,
    assetAddress: string | undefined,
    amount: string,
    userSecret: string
  ): Promise<string> {
    try {
      const sourceKeypair = Keypair.fromSecret(userSecret);
      const account = await this.getAccount(userAddress);

      const contract = new Contract(this.contractId);
      
      const params = [
        new Address(userAddress).toScVal(),
        assetAddress ? new Address(assetAddress).toScVal() : xdr.ScVal.scvVoid(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      ];

      const operation = contract.call('deposit_collateral', ...params);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTx = await this.sorobanServer.prepareTransaction(transaction);
      preparedTx.sign(sourceKeypair);

      return preparedTx.toXDR();
    } catch (error) {
      logger.error('Failed to build deposit transaction:', error);
      throw new InternalServerError('Failed to build deposit transaction');
    }
  }

  async buildBorrowTransaction(
    userAddress: string,
    assetAddress: string | undefined,
    amount: string,
    userSecret: string
  ): Promise<string> {
    try {
      const sourceKeypair = Keypair.fromSecret(userSecret);
      const account = await this.getAccount(userAddress);

      const contract = new Contract(this.contractId);
      
      const params = [
        new Address(userAddress).toScVal(),
        assetAddress ? new Address(assetAddress).toScVal() : xdr.ScVal.scvVoid(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      ];

      const operation = contract.call('borrow_asset', ...params);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTx = await this.sorobanServer.prepareTransaction(transaction);
      preparedTx.sign(sourceKeypair);

      return preparedTx.toXDR();
    } catch (error) {
      logger.error('Failed to build borrow transaction:', error);
      throw new InternalServerError('Failed to build borrow transaction');
    }
  }

  async buildRepayTransaction(
    userAddress: string,
    assetAddress: string | undefined,
    amount: string,
    userSecret: string
  ): Promise<string> {
    try {
      const sourceKeypair = Keypair.fromSecret(userSecret);
      const account = await this.getAccount(userAddress);

      const contract = new Contract(this.contractId);
      
      const params = [
        new Address(userAddress).toScVal(),
        assetAddress ? new Address(assetAddress).toScVal() : xdr.ScVal.scvVoid(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      ];

      const operation = contract.call('repay_debt', ...params);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTx = await this.sorobanServer.prepareTransaction(transaction);
      preparedTx.sign(sourceKeypair);

      return preparedTx.toXDR();
    } catch (error) {
      logger.error('Failed to build repay transaction:', error);
      throw new InternalServerError('Failed to build repay transaction');
    }
  }

  async buildWithdrawTransaction(
    userAddress: string,
    assetAddress: string | undefined,
    amount: string,
    userSecret: string
  ): Promise<string> {
    try {
      const sourceKeypair = Keypair.fromSecret(userSecret);
      const account = await this.getAccount(userAddress);

      const contract = new Contract(this.contractId);
      
      const params = [
        new Address(userAddress).toScVal(),
        assetAddress ? new Address(assetAddress).toScVal() : xdr.ScVal.scvVoid(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      ];

      const operation = contract.call('withdraw_collateral', ...params);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTx = await this.sorobanServer.prepareTransaction(transaction);
      preparedTx.sign(sourceKeypair);

      return preparedTx.toXDR();
    } catch (error) {
      logger.error('Failed to build withdraw transaction:', error);
      throw new InternalServerError('Failed to build withdraw transaction');
    }
  }

  async monitorTransaction(txHash: string, timeoutMs = 30000): Promise<TransactionResponse> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await axios.get(`${this.horizonUrl}/transactions/${txHash}`);
        
        if (response.data.successful) {
          return {
            success: true,
            transactionHash: txHash,
            status: 'success',
            ledger: response.data.ledger,
          };
        } else {
          return {
            success: false,
            transactionHash: txHash,
            status: 'failed',
            error: 'Transaction failed',
          };
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        
        logger.error('Error monitoring transaction:', error);
        throw new InternalServerError('Failed to monitor transaction');
      }
    }

    return {
      success: false,
      transactionHash: txHash,
      status: 'pending',
      message: 'Transaction monitoring timeout',
    };
  }

  public parseAmmEventTopic(topics: unknown): AmmEventTopic | null {
    if (!Array.isArray(topics) || topics.length !== 3) {
      return null;
    }

    const [module, version, kind] = topics;
    if (
      module !== AMM_EVENT_TOPIC_MODULE ||
      version !== AMM_EVENT_TOPIC_VERSION ||
      typeof kind !== 'string'
    ) {
      return null;
    }

    const eventKind = kind as AmmEventKind;
    if (!['swap', 'add_liquidity', 'remove_liquidity'].includes(eventKind)) {
      return null;
    }

    return {
      module: AMM_EVENT_TOPIC_MODULE,
      version: AMM_EVENT_TOPIC_VERSION,
      kind: eventKind,
    };
  }

  public decodeAmmEvent(rawEvent: unknown): AmmEventDecodeResult | null {
    if (!rawEvent || typeof rawEvent !== 'object') {
      return null;
    }

    const event = rawEvent as { topics?: unknown; data?: unknown };
    const topic = this.parseAmmEventTopic(event.topics);
    if (!topic) {
      return null;
    }

    if (!event.data || typeof event.data !== 'object') {
      return null;
    }

    const data = event.data as unknown as AmmEventV1;
    if (data.schema_version !== 1 || data.event !== topic.kind) {
      return null;
    }

    return {
      topic,
      data,
    };
  }

  public extractAmmEventsFromTransactionResult(txResult: any): AmmEventDecodeResult[] {
    if (!txResult || !Array.isArray(txResult.events)) {
      return [];
    }

    return txResult.events
      .map((event: unknown): AmmEventDecodeResult | null => this.decodeAmmEvent(event))
      .filter(
        (decoded: AmmEventDecodeResult | null): decoded is AmmEventDecodeResult =>
          decoded !== null
      );
  }

  async healthCheck(): Promise<{ horizon: boolean; sorobanRpc: boolean }> {
    const results = {
      horizon: false,
      sorobanRpc: false,
    };

    try {
      await axios.get(`${this.horizonUrl}/`);
      results.horizon = true;
    } catch (error) {
      logger.error('Horizon health check failed:', error);
    }

    try {
      await this.sorobanServer.getHealth();
      results.sorobanRpc = true;
    } catch (error) {
      logger.error('Soroban RPC health check failed:', error);
    }

    return results;
  }
}
