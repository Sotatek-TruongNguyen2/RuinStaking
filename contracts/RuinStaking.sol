// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./tokens/ERC20/Ruin.sol";
import "./tokens/ERC721/RuinNFT.sol";
import "./interfaces/IERC20.sol";
import "./access/AccessControl.sol";
import "./utils/Context.sol";
import "./libraries/TransferHelper.sol";
import "./libraries/SafeMath.sol";

import "hardhat/console.sol";

contract RuinStaking is AccessControl, Context {
    using SafeMath for uint;

    uint256 public ruinPerBlock;
    uint256 public totalAllocPoint;
    uint256 public startBlock;
    uint256 public rewardEndBlock;
    uint256 public constant MINIMUM_DAYS_LOCK = 3 days;
    address public dev;
    address public penaltyReceiver;
    RuinNFT public ruinNFT;
    Ruin public ruinToken;
    uint8 public constant BONUS_MULTIPLIER = 10;
    uint8 public constant FEE_PENALTY_PERCENT = 3;
    bool public allowEmergencyWithdraw;

    struct UserInfo {
        uint256 amount; 
        uint256 rewardDebt;
        uint256 rewardAmount;
        uint256 lastTimeDeposited;
    }

    struct Pool {
        IERC20 lpToken;
        uint256 accRuinPerShare;
        uint256 allocPoint;
        uint256 lastRewardBlock;
    }

    Pool[] pools;
    mapping(uint => mapping(address => UserInfo)) public userInfos;
    mapping(uint => mapping(address => bool)) public nftClaimed;

    event PoolCreated(address lpToken, uint256 allocPoint, uint256 accRuinPerShare, uint256 lastRewardBlock);
    event PoolAllocPointChanged(uint256 poolId, uint256 newAllocPoint);
    event PoolDeposited(uint256 poolId, uint256 amount);
    event PoolWithdraw(uint256 poolId, uint256 amount);
    event PoolHarvested(uint256 poolId, uint256 amount, address receiver);
    event PoolInterestChanged(uint256 newInterest);
    event PoolPenaltyReceiverChanged(address newPenaltyReceiver);
    event PoolEmergencyWithdrawStatus(bool status);
    event PoolEmergencyWithdraw(uint256 poolId, uint256 amount, address receiver);

    constructor(uint256 _startBlock, uint256 _rewardEndBlock, uint _ruinPerBlock, Ruin _ruinToken, address _dev, address _penaltyReceiver, RuinNFT _ruinNFT) {
        startBlock = _startBlock;
        rewardEndBlock = _rewardEndBlock;
        ruinPerBlock = _ruinPerBlock;
        ruinToken = _ruinToken;
        dev = _dev;
        penaltyReceiver = _penaltyReceiver;
        ruinNFT = _ruinNFT;

        _setupRole(_msgSender(), getAdminRole());
    }

    modifier PoolExist(uint256 _poolId) {
        require(_poolId < pools.length, "RuinStaking::Pool id is not legit!");
        _;
    }

    function changeEmergencyWithdrawStatus(bool _status) public onlyRole(getAdminRole()) {
        require(_status != allowEmergencyWithdraw, "RuinStaking::Emergency withdraw status is identical!");
        allowEmergencyWithdraw = _status;
        
        emit PoolEmergencyWithdrawStatus(_status);
    }

    function getPoolById(uint256 _poolId) public view returns(Pool memory) {
        return pools[_poolId];
    }

    function changeInterestPerBlock(uint256 _ruinPerBlock) public onlyRole(getAdminRole()) {
        require(_ruinPerBlock != ruinPerBlock, "RuinStaking::Ruin per block is identical");
        ruinPerBlock = _ruinPerBlock;

        emit PoolInterestChanged(ruinPerBlock);
    }

    function changePenaltyReceiver(address _penaltyReceiver) public onlyRole(getAdminRole()) {
        require(_penaltyReceiver != address(0), "RuinStaking::Penalty Receiver is illegal");
        require(_penaltyReceiver != penaltyReceiver, "RuinStaking::Penalty Receiver is identical");
    
        penaltyReceiver = _penaltyReceiver;
        emit PoolPenaltyReceiverChanged(penaltyReceiver);
    }

    function addPool(address _lpToken, uint256 _allocPoint) public onlyRole(getAdminRole())  {
        uint256 lastRewardBlock = block.number > startBlock ? block.number: startBlock; 

        pools.push(Pool({
            lpToken: IERC20(_lpToken),
            accRuinPerShare: 0,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock 
        }));

        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        emit PoolCreated(_lpToken, _allocPoint, 0, lastRewardBlock);
    }

    function getMultiplier(uint256 _startBlock, uint256 _endBlock) public view returns(uint256) {
        if (_endBlock <= rewardEndBlock) {
            return _endBlock.sub(_startBlock).mul(BONUS_MULTIPLIER);
        }

        if (_startBlock >= rewardEndBlock) {
            return _endBlock.sub(_startBlock);
        }

        return _endBlock.sub(rewardEndBlock).add(rewardEndBlock.sub(_startBlock).mul(BONUS_MULTIPLIER));
    }

    function _getPoolWithUserInfo(uint256 _poolId, address _userAddress) private view returns(Pool storage, UserInfo storage) {
        Pool storage pool = pools[_poolId];
        UserInfo storage user = userInfos[_poolId][_userAddress];

        return (pool, user);
    }

    function _calculatePenaltyFee(uint256 _amount, uint256 _lastTimeDeposited) private view returns(uint256) {
        if (block.timestamp < _lastTimeDeposited.add(MINIMUM_DAYS_LOCK)) {
            return _amount.mul(FEE_PENALTY_PERCENT).div(100);
        }

        return 0;
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = pools.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            _updatePool(pid);
        }
    }

    function updateSinglePool(uint256 _poolId) public {
        _updatePool(_poolId);
    }

    function _updatePool(uint256 _poolId) private {
        Pool storage pool = pools[_poolId];
        
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 totalSupply = IERC20(pool.lpToken).balanceOf(address(this));

        if (totalSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 reward = multiplier.mul(ruinPerBlock).mul(pool.allocPoint).div(totalAllocPoint);

        ruinToken.mint(dev, reward.div(10));
        ruinToken.mint(address(this), reward);

        pool.accRuinPerShare = pool.accRuinPerShare.add(reward.mul(1e12).div(totalSupply));
        pool.lastRewardBlock = block.number;
    }

    function _auditUser(uint256 _poolId, address _userAddress) private {
        (Pool storage pool, UserInfo storage user) = _getPoolWithUserInfo(_poolId, _userAddress);

        if (user.amount > 0) {
            uint pendingReward = user.amount.mul(pool.accRuinPerShare).div(1e12).sub(user.rewardDebt);
            user.rewardAmount = user.rewardAmount.add(pendingReward);
            user.rewardDebt = user.amount.mul(pool.accRuinPerShare).div(1e12);
        }
    }

    function set(uint256 _poolId, uint256 _allocPoint, bool _withUpdate) public onlyRole(getAdminRole()) {
        if (_withUpdate) {
            massUpdatePools();
        }
        Pool storage pool = pools[_poolId];

        totalAllocPoint = totalAllocPoint.sub(pool.allocPoint).add(_allocPoint);
        pool.allocPoint = _allocPoint;

        emit PoolAllocPointChanged(_poolId, _allocPoint);
    }

    function deposit(uint256 _poolId, uint256 _amount) public PoolExist(_poolId) {
        require(_amount > 0, "RuinStaking::LP Token amount deposit is not legit!");

        (Pool storage pool, UserInfo storage user) = _getPoolWithUserInfo(_poolId, _msgSender());

        _updatePool(_poolId);
        _auditUser(_poolId, _msgSender());

        TransferHelper.safeTransferFrom(address(pool.lpToken),  _msgSender(), address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.lastTimeDeposited = block.timestamp;

        emit PoolDeposited(_poolId, _amount);
    }

    function withdraw(uint256 _poolId, uint256 _amount) public PoolExist(_poolId) {
        (Pool storage pool, UserInfo storage user) = _getPoolWithUserInfo(_poolId, _msgSender());

        require(_amount <= user.amount, "RuinStaking::LP Token amount withdraw is not legit!");

        _updatePool(_poolId);
        _auditUser(_poolId, _msgSender());

        user.amount = user.amount.sub(_amount);

        uint256 toPunish = _calculatePenaltyFee(_amount, user.lastTimeDeposited);

        TransferHelper.safeTransfer(address(pool.lpToken), penaltyReceiver, toPunish);
        TransferHelper.safeTransfer(address(pool.lpToken), _msgSender(), _amount.sub(toPunish));

        emit PoolWithdraw(_poolId, _amount.sub(toPunish));
    }

    function harvest(uint256 _poolId, address _to) public PoolExist(_poolId) {
        (, UserInfo storage user) = _getPoolWithUserInfo(_poolId, _msgSender());

        _updatePool(_poolId); 
        _auditUser(_poolId, _msgSender());

        require(user.rewardAmount > 0, "RuinStaking::NOTHING TO HARVEST");

        uint256 rewardAmount = user.rewardAmount;
        safeRuinTransfer(_to, rewardAmount);

        user.rewardAmount = 0;

        if (!nftClaimed[_poolId][_msgSender()] && user.lastTimeDeposited.add(MINIMUM_DAYS_LOCK) <= block.timestamp) {
            ruinNFT.mint(_to);
            nftClaimed[_poolId][_msgSender()] = true;
        }

        emit PoolHarvested(_poolId, rewardAmount, _to);
    }

    function emergencyWithdraw(uint256 _poolId) public {
        require(allowEmergencyWithdraw, "RuinStaking::NOT ALLOW TO EMERGENCY WITHDRAW");
        (Pool storage pool, UserInfo storage user) = _getPoolWithUserInfo(_poolId, _msgSender());
        uint256 amount = user.amount;
        pool.lpToken.transfer(_msgSender(), amount);

        user.rewardDebt = 0;
        user.amount = 0;

        emit PoolEmergencyWithdraw(_poolId, amount, _msgSender());
    }

    function queryReward(uint256 _poolId, address _userAddress) internal view PoolExist(_poolId) returns(uint256) {
        (Pool storage pool, UserInfo storage user) = _getPoolWithUserInfo(_poolId, _userAddress);

        uint256 accRuinPerShare = pool.accRuinPerShare;
        uint256 totalSupply = IERC20(pool.lpToken).balanceOf(address(this));
        if (totalSupply > 0 && block.number > pool.lastRewardBlock) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 reward = multiplier.mul(ruinPerBlock).mul(pool.allocPoint).div(totalAllocPoint);

            accRuinPerShare = accRuinPerShare.add(reward.mul(1e12).div(totalSupply));
        }

        return user.amount.mul(accRuinPerShare).div(1e12).sub(user.rewardDebt).add(user.rewardAmount);
    }

    function take(uint256 _poolId) public view returns(uint256) {
        return queryReward(_poolId, _msgSender());
    }

    function takeWithBlock(uint256 _poolId) public view returns(uint256, uint256) {
        uint256 earn = queryReward(_poolId, _msgSender());
        return (earn, block.number);
    }

     // Safe Ruin transfer function, just in case if rounding error causes pool to not have enough SUSHIs.
    function safeRuinTransfer(address _to, uint256 _amount) internal {
        uint256 ruinBal = ruinToken.balanceOf(address(this));
        if (_amount > ruinBal) {
            ruinToken.transfer(_to, ruinBal);
        } else {
            ruinToken.transfer(_to, _amount);
        }
    }
}