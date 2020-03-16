const { accounts, contract } = require('@openzeppelin/test-environment')
const {
  BN,
  ether,
  send,
  // constants,    // Common constants, like the zero address and largest integers
  // expectEvent,  // Assertions for emitted events
  expectRevert
} = require('@openzeppelin/test-helpers')

const ZBTokenCrowdsale = contract.fromArtifact('ZBTokenCrowdsale')
const ZBToken = contract.fromArtifact('ZBToken')

describe('ZBTokenCrowdsale', () => {
  const [crowdsaleWallet, investor1, investor2] = accounts

  //token
  const name = 'ZBToken'
  const symbol = 'ZB'
  const decimals = 18

  //crowdsale
  const rate = 500
  const wallet = crowdsaleWallet
  const cap = ether('100')

  // investor caps
  const lessThanInvestorMinCap = ether('0.99')
  const investorMinCap = ether('1')
  const investorHardCap = ether('10')
  const moreThanInvestorHardCap = ether('10.01')

  beforeEach(async () => {
    // Deploy token
    this.token = await ZBToken.new(name, symbol, decimals)
    // Deploy crowdsale
    this.crowdsale = await ZBTokenCrowdsale.new(rate, wallet, this.token.address, cap)
    // Add crowdsale as a minter
    await this.token.addMinter(this.crowdsale.address)
  })

  describe('crowdsale', () => {
    it('tracks the rate', async () => {
      const result = await this.crowdsale.rate()
      result.should.be.bignumber.equal(new BN(rate))
    })

    it('tracks the wallet', async () => {
      const result = await this.crowdsale.wallet()
      result.should.equal(wallet)
    })

    it('tracks the token', async () => {
      const result = await this.crowdsale.token()
      result.should.equal(this.token.address)
    })
  })

  describe('minted crowdsale', () => {
    it('mints token after purchase', async () => {
      const originalTotalSupply = await this.token.totalSupply()
      // send.ether(investor1, this.crowdsale.address, ether('1')) // ??? gas error
      await this.crowdsale.sendTransaction({
        value: ether('1'),
        from: investor1
      })
      const newTotalSupply = await this.token.totalSupply()
      newTotalSupply.should.be.bignumber.greaterThan(originalTotalSupply)
    })
  })

  describe('capped crowdsale', () => {
    describe('accteping payments', () => {
      it('should accept payments on the caps edges', async () => {
        const purchaser1 = investor2
        const purchaser2 = investor1
        // await this.crowdsale.sendTransaction({ value, from: investor1 }) //fallback
        await this.crowdsale.buyTokens(investor1, { value: investorMinCap, from: purchaser1 })
        await this.crowdsale.buyTokens(investor2, { value: investorHardCap, from: purchaser2 })
      })

      describe('when the contribution is less than the min cap', () => {
        it('rejects the TX', async () => {
          await expectRevert(
            this.crowdsale.buyTokens(investor1, { value: lessThanInvestorMinCap }),
            'Beneficiary cap exceeded.'
          )
        })
      })

      describe('when the contribution is more than the max cap', () => {
        it('rejects the TX', async () => {
          await expectRevert(
            this.crowdsale.buyTokens(investor1, { value: moreThanInvestorHardCap }),
            'Beneficiary cap exceeded.'
          )
        })
      })
    })

    describe('when the investor has already met the min cap ', () => {
      it('allows the investor to contribute below the min cap', async () => {
        //first contribution is valid
        await this.crowdsale.buyTokens(investor1, { value: investorMinCap })
        //second contribution is less than investor cap
        const value = investorMinCap - 10 //wei
        await this.crowdsale.buyTokens(investor1, { value })
      })
    })

    describe('when the total contributions exceed the investor hard cap', () => {
      it('rejects the TX', async () => {
        //first contribution is valid
        await this.crowdsale.buyTokens(investor1, { value: ether('2') })
        //second contribution send total contributions over investor hard cap
        await expectRevert(
          this.crowdsale.buyTokens(investor1, { value: ether('9') }),
          'Beneficiary cap exceeded.'
        )
      })
    })

    describe('when the contribution is within the valid range', () => {
      it('succeeds and updates the contribution amount', async () => {
        const value = ether('2')
        await this.crowdsale.buyTokens(investor2, { value })
        //on capped
        const contribution = await this.crowdsale.getUserContribution(investor2)
        contribution.should.be.bignumber.equal(value)
        //on crowdsale
        const raised = await this.crowdsale.weiRaised()
        raised.should.be.bignumber.equal(value)
      })
    })
  })
})
