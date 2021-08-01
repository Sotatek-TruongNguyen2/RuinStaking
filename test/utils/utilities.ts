import { ethers } from 'ethers';

export function expandTo18Decimals(n: number,p = 18): any {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(p)).toString()
}