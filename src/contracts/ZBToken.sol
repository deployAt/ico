pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract ZBToken is ERC20Mintable, ERC20Pausable, ERC20Detailed {
    constructor(string memory _name, string memory _symbol, uint8 _decimals)
        public
        ERC20Detailed(_name, _symbol, _decimals)
    {}

}
