import { ethers, network } from 'hardhat';
import { expect } from "chai";
import { Signer } from "ethers";
import { RuinStaking } from '../types/RuinStaking';
import { RuinStaking__factory } from '../types/factories/RuinStaking__factory';
import { RuinNFT } from '../types/RuinNFT';
import { RuinNFT__factory } from '../types/factories/RuinNFT__factory';
import { Ruin } from '../types/Ruin';
import { Ruin__factory } from '../types/factories/Ruin__factory';
import { ERC20__factory } from '../types/factories/ERC20__factory';
import { WHALE_ADDRESS, USDC_ADDRESS } from './config';
import { expandTo18Decimals } from './utils/utilities';

describe("Ruin Staking", function () {
    let ruinStakingContract: RuinStaking | undefined;
    let ruinNFTContract: RuinNFT | undefined;
    let ruinContract: Ruin | undefined;
    let owner: Signer | undefined;
    let lpProvider: Signer | undefined;
    let dev: Signer | undefined;
    let penaltyReceiver: Signer | undefined;
    let MINTER_ROLE: string = "";
    let BURNER_ROLE: string = "";

    const increaseBlockNumber = async (blockNumber: Number = 5) => {
        for(let i = 0; i < blockNumber; i++) {
            owner && ruinStakingContract && await new ERC20__factory(owner).attach(USDC_ADDRESS).approve(ruinStakingContract.address, "10000000");
        }
    }

    beforeEach(async function () {
        try {
            [lpProvider, dev, penaltyReceiver] = await ethers.getSigners();

            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [WHALE_ADDRESS],
              });
          
            owner = await ethers.provider.getSigner(WHALE_ADDRESS);

            const devAddress = await dev.getAddress();
            const penaltyReceiverAddress = await penaltyReceiver.getAddress();

            ruinNFTContract = await new RuinNFT__factory(owner).deploy();
            ruinContract = await new Ruin__factory(owner).deploy("Super Ruin Token", "RUIN", 18, expandTo18Decimals(21000000, 18));

            MINTER_ROLE = await ruinContract.MINTER_ROLE();
            
            ruinStakingContract = await new RuinStaking__factory(owner)
                .deploy(
                    "12618875", 
                    "12619900", 
                    expandTo18Decimals(10, 18), 
                    ruinContract.address, 
                    devAddress, 
                    penaltyReceiverAddress, 
                    ruinNFTContract.address
                );

            await ruinContract.grantRole(ruinStakingContract.address, MINTER_ROLE);
            await ruinNFTContract.grantRole(ruinStakingContract.address, MINTER_ROLE);
        } catch (err) {
            console.log(err.message);
        }
    });

    describe("Ruin Staking Owner", async () => {
        it("Owner able to add a new pool", async () => {
            if (owner && dev && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await expect(ruinStakingContract.connect(owner).addPool(mockToken.address, "100"))
                .to.emit(ruinStakingContract, "PoolCreated");
            }
        });

        it("Others not be able to add a new pool", async () => {
            if (owner && dev && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await expect(ruinStakingContract.connect(dev).addPool(mockToken.address, "100"))
                .to.be.revertedWith("AccessControl::Your role is not able to do this");
            }
        });

        it("Owner able to set allocation to a new pool", async () => {
            if (owner && dev && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");

                await expect(ruinStakingContract.connect(owner).set(0, "50", false))
                .to.emit(ruinStakingContract, "PoolAllocPointChanged")
                .withArgs("0", "50");

                const totalAllocPoint = await ruinStakingContract.connect(owner).totalAllocPoint();
                expect(totalAllocPoint.toString()).to.equals("250");
            }
        });

        it("Others not be able to set allocation to a new pool", async () => {
            if (owner && dev && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");

                await expect(ruinStakingContract.connect(dev).set(0, "50", false))
                .to.be.revertedWith("AccessControl::Your role is not able to do this");
            }
        });
    });


    describe("Ruin Staking Deposit", async () => {
        it("Everyone not able to deposit LP token into a non-existed pool", async () => {
            if (owner && lpProvider && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));
   
                await expect(ruinStakingContract.connect(lpProvider).deposit("6", expandTo18Decimals(100, 6)))
                .to.be.revertedWith("RuinStaking::Pool id is not legit!");
            }
        });

        it("Everyone able to deposit LP token into a pool", async () => {
            if (owner && lpProvider && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await expect(ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6)))
                .to.emit(ruinStakingContract, "PoolDeposited")
                .withArgs("0", expandTo18Decimals(100, 6));


                const balanceOf = await USDCContract.balanceOf(ruinStakingContract.address);
                await expect(balanceOf.toString()).to.be.equals(expandTo18Decimals(100, 6));
            }
        });

        it("Pool able to increase accRuinPerShare with extra multiplier after 5 blocks", async () => {
            if (owner && lpProvider && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                // const usdcPool = await ruinStakingContract.getPoolById("0");

                // console.log(`Last reward block: ${usdcPool.lastRewardBlock.toString()}`);

                await increaseBlockNumber(5);
                
                await ruinStakingContract.updateSinglePool("0");
                // const blockNumber = await network.provider.send("eth_blockNumber");  
                
                // console.log(`Current Block Number after update pool share: ${Number(blockNumber)}`);
                
                const usdcPoolAfterUpdate = await ruinStakingContract.getPoolById("0");

                expect(usdcPoolAfterUpdate.accRuinPerShare.toString()).to.be.equals("4000000000000000000000000");
            }
        });


        it("Pool able to increase accRuinPerShare with no extra multiplier after 6 blocks", async () => {
            if (owner && lpProvider && dev && ruinNFTContract && ruinContract && penaltyReceiver && ruinStakingContract) {
                const devAddress = await dev.getAddress();
                const penaltyReceiverAddress = await penaltyReceiver.getAddress();
    
                ruinStakingContract = await new RuinStaking__factory(owner)
                .deploy(
                    "12618875", 
                    "12618876", 
                    expandTo18Decimals(10, 18), 
                    ruinContract.address, 
                    devAddress, 
                    penaltyReceiverAddress, 
                    ruinNFTContract.address
                );
                await ruinContract.grantRole(ruinStakingContract.address, MINTER_ROLE);

                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                // const usdcPool = await ruinStakingContract.getPoolById("0");

                // console.log(`Last reward block: ${usdcPool.lastRewardBlock.toString()}`);

                await increaseBlockNumber(5);
                
                await ruinStakingContract.updateSinglePool("0");
                // const blockNumber = await network.provider.send("eth_blockNumber");  
                
                // console.log(`Current Block Number after update pool share: ${Number(blockNumber)}`);
                
                const usdcPoolAfterUpdate = await ruinStakingContract.getPoolById("0");

                expect(usdcPoolAfterUpdate.accRuinPerShare.toString()).to.be.equals("400000000000000000000000");
            }
        });


        it("Pool able to increase accRuinPerShare with extra multiplier from start block to reward end block after 6 blocks", async () => {
            if (owner && lpProvider && dev && ruinNFTContract && ruinContract && penaltyReceiver && ruinStakingContract) {
                const devAddress = await dev.getAddress();
                const penaltyReceiverAddress = await penaltyReceiver.getAddress();
    
                const blockStart = await network.provider.send("eth_blockNumber");  
                
                // console.log(`Block start: ${Number(blockStart)}`);

                ruinStakingContract = await new RuinStaking__factory(owner)
                .deploy(
                    Number(blockStart), 
                    Number(blockStart) + 8 + 2, 
                    expandTo18Decimals(10, 18), 
                    ruinContract.address, 
                    devAddress, 
                    penaltyReceiverAddress, 
                    ruinNFTContract.address
                );
                await ruinContract.grantRole(ruinStakingContract.address, MINTER_ROLE);

                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                // const usdcPool = await ruinStakingContract.getPoolById("0");

                // console.log(`Last reward block: ${usdcPool.lastRewardBlock.toString()}`);

                await increaseBlockNumber(5);
                
                await ruinStakingContract.updateSinglePool("0");
                // const blockNumber = await network.provider.send("eth_blockNumber");  
                
                // console.log(`Current Block Number after update pool share: ${Number(blockNumber)}`);
                
                const usdcPoolAfterUpdate = await ruinStakingContract.getPoolById("0");

                expect(usdcPoolAfterUpdate.accRuinPerShare.toString()).to.be.equals(expandTo18Decimals(1600000000000, 12));
            }
        });
    });

    describe("Ruin Staking Withdraw", async () => {
        it("Everyone not able to withdraw LP token greater than staked amount", async () => {
            if (owner && lpProvider && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));
   
                await expect(ruinStakingContract.connect(lpProvider).withdraw("0", expandTo18Decimals(100, 7)))
                .to.be.revertedWith("RuinStaking::LP Token amount withdraw is not legit!");
            }
        });

        it("Everyone not able to withdraw LP token into a non-existed pool", async () => {
            if (owner && lpProvider && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));
   
                await expect(ruinStakingContract.connect(lpProvider).withdraw("6", expandTo18Decimals(100, 6)))
                .to.be.revertedWith("RuinStaking::Pool id is not legit!");
            }
        });

        it("Everyone able to withdraw LP token from specific pool", async () => {
            if (owner && lpProvider && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");
               
                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await expect(ruinStakingContract.connect(lpProvider).withdraw("0", expandTo18Decimals(100, 6)))
                .to.emit(ruinStakingContract, "PoolWithdraw");
            }
        });

        it("Everyone suffers penalty if withdraw lp tokens before 3 days", async () => {
            if (owner && lpProvider && penaltyReceiver && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                const penaltyReceiverAddress = await penaltyReceiver.getAddress();
                const usdtBalancePenaltyReceiver = await USDCContract.balanceOf(penaltyReceiverAddress);

                await expect(ruinStakingContract.connect(lpProvider).withdraw("0", expandTo18Decimals(100, 6)))
                .to.emit(ruinStakingContract, "PoolWithdraw")
                .withArgs("0", "97000000");
                
                const penaltyReceiverAddressAfterWithdraw = await USDCContract.balanceOf(penaltyReceiverAddress);
            
                expect(penaltyReceiverAddressAfterWithdraw).to.equals(usdtBalancePenaltyReceiver.add("3000000").toString());
            }
        });

        it("Everyone won't suffers penalty if withdraw lp tokens after 3 days", async () => {
            if (owner && lpProvider && penaltyReceiver && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
                
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                const penaltyReceiverAddress = await penaltyReceiver.getAddress();
                const usdtBalancePenaltyReceiver = await USDCContract.balanceOf(penaltyReceiverAddress);

                await network.provider.send("evm_increaseTime", [259200]);

                await expect(ruinStakingContract.connect(lpProvider).withdraw("0", expandTo18Decimals(100, 6)))
                .to.emit(ruinStakingContract, "PoolWithdraw")
                .withArgs("0", expandTo18Decimals(100, 6));

                const penaltyReceiverAddressAfterWithdraw = await USDCContract.balanceOf(penaltyReceiverAddress);
            
                expect(penaltyReceiverAddressAfterWithdraw).to.equals(usdtBalancePenaltyReceiver.toString());
            }
        });
    });

    describe("Ruin Staking Harvest", async () => {
        it("Everyone not able to harvest Ruin token if they're not eligible", async () => {
            if (owner && lpProvider && ruinContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await increaseBlockNumber(5);

                await expect(ruinStakingContract.connect(lpProvider).harvest("0", lpProviderAddress))
                .to.revertedWith("RuinStaking::NOTHING TO HARVEST")
            }
        });

        it("Everyone not able to harvest exceeds Ruin token left in the pool", async () => {
            if (owner && lpProvider && ruinContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(200000, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(1000000, 18));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100000, 6));

                await increaseBlockNumber(5);

                await ruinStakingContract.connect(lpProvider).harvest("0", lpProviderAddress);

                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100000, 6));
            
                await increaseBlockNumber(5);

                const balanceOf = await ruinContract.balanceOf(ruinStakingContract.address);

                const reward = await ruinStakingContract.connect(lpProvider).take("0"); 

                expect(balanceOf.lte(reward)).to.equals(true);
                }
        });

        it("Everyone able to harvest Ruin token if they're eligible", async () => {
            if (owner && lpProvider && ruinContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                const ruinBalanceProvider = await ruinContract.balanceOf(lpProviderAddress);

                await expect(ruinStakingContract.connect(lpProvider).harvest("0", lpProviderAddress))
                .to.emit(ruinStakingContract, "PoolHarvested")
                .withArgs("0", "400000000000000000000", lpProviderAddress);

                const ruinBalanceProviderAfterHarvest = await ruinContract.balanceOf(lpProviderAddress);

                expect(ruinBalanceProviderAfterHarvest.toString()).to.equals(ruinBalanceProvider.add("400000000000000000000").toString());
            }
        });


        it("Everyone able to harvest Ruin token with additional RuinNFT if they're holding LP tokens in 3 days", async () => {
            if (owner && lpProvider && ruinContract && ruinNFTContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                const ruinBalanceProvider = await ruinContract.balanceOf(lpProviderAddress);

                await network.provider.send("evm_increaseTime", [259200]);

                await expect(ruinStakingContract.connect(lpProvider).harvest("0", lpProviderAddress))
                .to.emit(ruinStakingContract, "PoolHarvested")
                .withArgs("0", "400000000000000000000", lpProviderAddress);

                const ruinNFTBalanceOf = await ruinNFTContract.balanceOf(lpProviderAddress);
                const ruinBalanceProviderAfterHarvest = await ruinContract.balanceOf(lpProviderAddress);

                expect(ruinBalanceProviderAfterHarvest.toString()).to.equals(ruinBalanceProvider.add("400000000000000000000").toString());
                expect(ruinNFTBalanceOf.toString()).to.equals("1");
            }
        });

        it("Everyone not able to get additional RuinNFT more than one time if they're holding LP tokens in 3 days", async () => {
            if (owner && lpProvider && ruinContract && ruinNFTContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                await network.provider.send("evm_increaseTime", [259200]);

                await ruinStakingContract.connect(lpProvider).harvest("0", lpProviderAddress);
              
                await increaseBlockNumber(5);

                await ruinStakingContract.connect(lpProvider).harvest("0", lpProviderAddress);

                const ruinNFTBalanceOf = await ruinNFTContract.balanceOf(lpProviderAddress);

                expect(ruinNFTBalanceOf.toString()).to.equals("1");
            }
        });
    });

    describe("Ruin Staking Emergency Withdraw", async () => {
        it("Everyone not able to do emergency withdraw if owner do not allow", async () => {
            if (owner && lpProvider && ruinContract && ruinNFTContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                await expect(ruinStakingContract.connect(lpProvider).emergencyWithdraw("0")).to.be.revertedWith("RuinStaking::NOT ALLOW TO EMERGENCY WITHDRAW");
            }
        });

        it("Everyone able to do emergency withdraw if owner allowed", async () => {
            if (owner && lpProvider && ruinContract && ruinNFTContract && ruinStakingContract) {
                let mockToken = await new Ruin__factory(owner).deploy("Mock Token", "MOCK", 18, "100000000");
            
                await ruinStakingContract.connect(owner).addPool(USDC_ADDRESS, "200");
                await ruinStakingContract.connect(owner).addPool(mockToken.address, "100");

                const USDCContract = new ERC20__factory(owner).attach(USDC_ADDRESS);
                const lpProviderAddress = await lpProvider.getAddress();

                await USDCContract.transfer(lpProviderAddress, expandTo18Decimals(100, 6));
                await USDCContract.connect(lpProvider).approve(ruinStakingContract.address, expandTo18Decimals(100, 6));
                
                await ruinStakingContract.connect(lpProvider).deposit("0", expandTo18Decimals(100, 6));

                await increaseBlockNumber(5);

                const beforeEmergencyWithdraw = await USDCContract.balanceOf(lpProviderAddress);

                await ruinStakingContract.changeEmergencyWithdrawStatus(true);

                await expect(ruinStakingContract.connect(lpProvider).emergencyWithdraw("0")).to.emit(ruinStakingContract, "PoolEmergencyWithdraw");

                const afterEmergencyWithdraw = await USDCContract.balanceOf(lpProviderAddress);

                expect(afterEmergencyWithdraw).to.be.equals(beforeEmergencyWithdraw.add(expandTo18Decimals(100, 6)));
            }
        });
    });
});