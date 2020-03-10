pragma solidity ^0.5.16;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";

contract ZBTokenCrowdsale is Crowdsale, MintedCrowdsale {
    constructor(uint256 _rate, address payable _wallet, IERC20 _token)
        public
        Crowdsale(_rate, _wallet, _token)
    {}
}
