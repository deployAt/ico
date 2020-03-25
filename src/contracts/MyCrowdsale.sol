pragma solidity ^0.5.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";

contract MyCrowdsale is Crowdsale, TimedCrowdsale, RefundableCrowdsale {

    constructor(
        uint256 rate,
        address payable wallet,
        IERC20 token,
        uint256 openingTime,
        uint256 closingTime,
        uint256 goal
    )
        Crowdsale(rate, wallet, token)
        TimedCrowdsale(openingTime, closingTime)
        RefundableCrowdsale(goal)
        public
    {

    }
}
