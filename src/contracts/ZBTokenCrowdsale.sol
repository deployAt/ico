// pragma solidity ^0.5.0;
pragma solidity >=0.5.0 <0.6.4;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/TokenTimelock.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";


contract ZBTokenCrowdsale is
    Ownable,
    Crowdsale,
    MintedCrowdsale,
    CappedCrowdsale,
    TimedCrowdsale,
    WhitelistCrowdsale,
    RefundableCrowdsale
{
    // track investor contributions
    uint256 public _investorMinCap = 1000000000000000000; //1
    uint256 public _investorHardCap = 10000000000000000000; //10
    mapping(address => uint256) public _contributions;

    // crowdsale stages
    enum CrowdsaleStage {PreICO, ICO}
    CrowdsaleStage public _stage = CrowdsaleStage.PreICO;

    // token distribution
    uint256 public _tokenSalePercentage = 70;
    uint256 public _foundersPercentage = 10;
    uint256 public _fundationPercentage = 10;
    uint256 public _partnersPercentage = 10;

    // token reserve funds
    address public _foundersFund;
    address public _foundationFund;
    address public _partnersFund;

    // token time lock
    uint256 public _releaseTime;
    address public _foundersTimeLock;
    address public _foundationTimeLock;
    address public _partnersTimeLock;

    constructor(
        uint256 rate,
        address payable wallet,
        IERC20 token,
        uint256 cap,
        uint256 openingTime,
        uint256 closingTime,
        uint256 goal,
        address foundersFund,
        address foundationFund,
        address partnersFund,
        uint256 releaseTime
    )
        public
        Crowdsale(rate, wallet, token)
        CappedCrowdsale(cap)
        TimedCrowdsale(openingTime, closingTime)
        RefundableCrowdsale(goal)
    {
        require(goal <= cap, "Goal cant be grater than cap");
        _foundersFund = foundersFund;
        _foundationFund = foundationFund;
        _partnersFund = partnersFund;
        _releaseTime = releaseTime;
    }

    function getUserContribution(address beneficiary) public view returns (uint256) {
        return _contributions[beneficiary];
    }

    function setCrowdsaleStage(uint256 stage) public onlyOwner {
        if (uint256(CrowdsaleStage.PreICO) == stage) {
            _stage = CrowdsaleStage.PreICO;
            _rate = 500;
        } else if (uint256(CrowdsaleStage.ICO) == stage) {
            _stage = CrowdsaleStage.ICO;
            _rate = 250;
        }
    }

    /**
     * @dev forwards funds to the wallet during the PreICO stage, then the refund vault during ICO stage.
     */
    function _forwardFunds() internal {
        if (CrowdsaleStage.PreICO == _stage) {
            wallet().transfer(msg.value);
        } else if (CrowdsaleStage.ICO == _stage) {
            super._forwardFunds();
            // _escrow.deposit.value(msg.value)(_msgSender());
        }
    }

    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        super._preValidatePurchase(beneficiary, weiAmount);
        uint256 existingContribution = _contributions[beneficiary];
        uint256 newContribution = existingContribution.add(weiAmount);
        require(newContribution >= _investorMinCap && newContribution <= _investorHardCap, "Beneficiary cap exceeded");
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        super._updatePurchasingState(beneficiary, weiAmount);
        uint256 existingContribution = _contributions[beneficiary];
        uint256 newContribution = existingContribution.add(weiAmount);
        _contributions[beneficiary] = newContribution;
    }

    function _finalization() internal {
        if (goalReached()) {
            ERC20Mintable mintableToken = ERC20Mintable(address(token()));

            uint256 alreadyMinted = mintableToken.totalSupply();

            uint256 fintalTotalSupply = alreadyMinted.div(_tokenSalePercentage).mul(100);

            _foundersTimeLock = address(new TokenTimelock(token(), _foundersFund, _releaseTime));
            _foundationTimeLock = address(new TokenTimelock(token(), _foundationFund, _releaseTime));
            _partnersTimeLock = address(new TokenTimelock(token(), _partnersFund, _releaseTime));

            mintableToken.mint(_foundersTimeLock, fintalTotalSupply.div(_foundersPercentage));
            mintableToken.mint(_foundationTimeLock, fintalTotalSupply.div(_fundationPercentage));
            mintableToken.mint(_partnersTimeLock, fintalTotalSupply.div(_partnersPercentage));

            // stop minting
            MinterRole(address(token())).renounceMinter();
            // unpause the token
            ERC20Pausable(address(token())).unpause();
            // token._transferOwnerhship(wallet) ???

            // _escrow.close();
            // _escrow.beneficiaryWithdraw();
        }

        // } else {
        //     // _escrow.enableRefunds();
        // }

        super._finalization();
    }
}
