import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import { expandTo18Decimals } from '../test/utils/utilities';

const deployRuinNFTToken: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const {deployments, getNamedAccounts, network} = hre;
    const {deploy} = deployments;
    const {deployer, dev} = await getNamedAccounts();
    
    const currentBlockNumber = await network.provider.send("eth_blockNumber");
    console.log(currentBlockNumber);

    const ruinAddress = (await deployments.get("Ruin")).address;
    const ruinNFTAddress = (await deployments.get("RuinNFT")).address;

    const deployArgs = [currentBlockNumber, Number(currentBlockNumber) + 1000, expandTo18Decimals(10, 18), ruinAddress, dev, dev, ruinNFTAddress];

    const { address: contractAddress } = await deploy('RuinStaking', {
      from: deployer,
      args: deployArgs,
      log: true,
      deterministicDeployment: false,
    });

    await new Promise((res, rej) => {
      setTimeout(async () => {
        res(
          await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: deployArgs
          })
        )
      }, 25000);
    })
};

deployRuinNFTToken.tags = ["RuinStaking"];
deployRuinNFTToken.dependencies = ["RuinNFT", "RuinERC20"];

export default deployRuinNFTToken;