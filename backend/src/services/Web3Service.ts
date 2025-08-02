import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';
import CampaignManagerABI from '../../dist/contracts/SqudyCampaignManager.json';
import SqudyTokenABI from '../../dist/contracts/ISqudyToken.json';

class Web3Service {
  private static instance: Web3Service;
  public static provider: ethers.JsonRpcProvider;
  public static campaignManagerContract: ethers.Contract;
  public static squdyTokenContract: ethers.Contract;

  private constructor() {
    // Empty constructor
  }

  public static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  public static init() {
    try {
      Web3Service.provider = new ethers.JsonRpcProvider(config.ethRpcUrl);
      Web3Service.campaignManagerContract = new ethers.Contract(config.campaignManagerAddress, CampaignManagerABI.abi, Web3Service.provider);
      Web3Service.squdyTokenContract = new ethers.Contract(config.squdyTokenAddress, SqudyTokenABI.abi, Web3Service.provider);
      logger.info('Web3Service initialized');
    } catch (error) {
      logger.error('Web3Service initialization failed:', error);
    }
  }

  public static async getCampaign(campaignId: number) {
    return Web3Service.campaignManagerContract.getCampaign(campaignId);
  }

  public static async getParticipant(campaignId: number, walletAddress: string) {
    return Web3Service.campaignManagerContract.getParticipant(campaignId, walletAddress);
  }

  public static async getTokenBalance(walletAddress: string): Promise<string> {
    const balance = await Web3Service.squdyTokenContract.balanceOf(walletAddress);
    return ethers.formatEther(balance);
  }

  public static async getTokenAllowance(owner: string, spender: string): Promise<string> {
    const allowance = await Web3Service.squdyTokenContract.allowance(owner, spender);
    return ethers.formatEther(allowance);
  }

  public static async validateWalletSignature(message: string, signature: string, walletAddress: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      logger.error('Error validating wallet signature:', error);
      return false;
    }
  }
}

export default Web3Service;