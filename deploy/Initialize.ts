
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const initialize: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const {deployments, getNamedAccounts} = hre;
    const {execute} = deployments;
    const {deployer, dev } = await getNamedAccounts();

    const ruinStakingAddress = (await deployments.get("RuinStaking")).address;

    await execute(
      "Ruin", 
      { 
        from: deployer, 
        gasLimit: "300000", 
        log: true 
      }, 
      "grantRole",
      ruinStakingAddress,
      "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6" 
    )

    await execute(
      "RuinNFT", 
      { 
        from: deployer, 
        gasLimit: "300000", 
        log: true 
      }, 
      "grantRole",
      ruinStakingAddress,
      "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6" 
    )
};

initialize.tags = ["Initialize"];
initialize.runAtTheEnd = true;

export default initialize;