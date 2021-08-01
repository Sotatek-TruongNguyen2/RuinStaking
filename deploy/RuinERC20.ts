import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import { expandTo18Decimals } from '../test/utils/utilities';

const deployRuinERC20: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    
    const deployArgs = ["Super Ruin Token", "RUIN", 18, expandTo18Decimals(21000000, 18)];

    const { address: contractAddress } = await deploy('Ruin', {
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
            constructorArguments: deployArgs,
          })
        )
      }, 25000);
    })
};

deployRuinERC20.tags = ["RuinERC20"];

export default deployRuinERC20;