import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const deployRuinNFTToken: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    
    const { address: contractAddress } = await deploy('RuinNFT', {
      from: deployer,
      args: [],
      log: true,
      deterministicDeployment: false,
    });

    await new Promise((res, rej) => {
      setTimeout(async () => {
        res(
          await hre.run("verify:verify", {
            address: contractAddress
          })
        )
      }, 25000);
    })
};

deployRuinNFTToken.tags = ["RuinNFT"];

export default deployRuinNFTToken;