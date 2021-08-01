// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../interfaces/IERC20.sol";
import "../../utils/Context.sol";

contract ERC20 is IERC20, Context {
    string private _name;
    string private _symbol;
    uint8 private _decimals = 18;

    uint256 private _totalSupply;
    
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => uint256) private _balances;
    
    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }
     
    function name() external view returns(string memory) {
        return _name;
    }
    
    function symbol() external view returns(string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
    
    function totalSupply() public view override returns(uint256) {
        return _totalSupply;
    }
     
     
    function balanceOf(address account) public view override returns (uint256) {
         return _balances[account];
    }

   
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
 
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];   
    }


    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "Ruin::Transfer amount exceeds allowance");
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), currentAllowance - amount);
        return true;
    }


    function _transfer(
        address _sender, 
        address _recipient, 
        uint256 _amount
    ) private {
        _beforeTokenTransfer(_sender, _recipient, _amount);
        
        require(_recipient != address(0), "Ruin::Address of recipient is ilegal");
        require(_sender != address(0), "Ruin::Address of sender is ilegal");
        require(_amount <= _balances[_sender], "Ruin::Transfer amount exceeds account balance");
        
        _balances[_sender] -= _amount;
        _balances[_recipient] += _amount;
        
        emit Transfer(_sender, _recipient, _amount);
    }
    
    function _approve(
        address _approver, 
        address _spender, 
        uint256 _amount
    ) private {
        require(_approver != address(0), "Ruin::Address of approver is illegal");
        require(_spender != address(0), "Ruin::Address of spender is illegal");
        
        _allowances[_approver][_spender] = _amount;
        
        emit Approval(_approver, _spender, _amount);
    }
    
    function _mint(address _receiver, uint256 _amount) internal virtual {
        require(_receiver != address(0), "Ruin::Address of receiver is illegal");
        
        _totalSupply += _amount;
        _balances[_receiver] += _amount;
        
        emit Transfer(address(0), _receiver, _amount);
    }
    
    function _burn(address _account, uint256 _amount) internal virtual {
        require(_account != address(0), "Ruin::Address is illegal"); 
        require(_balances[_account] >= _amount, "Ruin::Burning amount exceeds account balance");
        
        _totalSupply -= _amount;
        _balances[_account] -= _amount;
        
        emit Transfer(_account, address(0), _amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual  {
    }
}