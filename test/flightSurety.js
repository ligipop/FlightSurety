
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
   // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    
    assert.equal(status, true, "Incorrect initial operating status value");

  });

 it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyApp.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });


 it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied;
      try 
      {
          await config.flightSuretyApp.setOperatingStatus(false);
          accessDenied = await config.flightSuretyApp.isOperational.call();
      }
      catch(e) {
          console.log(e);
      }
      //resetting to true for the rest of testing
      await config.flightSuretyApp.isOperational.call();
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

 it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
      let errorMessage;
      //turn operating status off
      await config.flightSuretyData.setOperatingStatus(false);

      try 
      {   //non-contract Owner airline attempts to access any function
          await config.flightSuretyApp.fund({from: config.accounts[2], value: web3.utils.toWei(web3.utils.toBN(10),"ether")});
      }
      catch(e) {
          if(e){
            // unable to access "fund" function
            errorMessage = e.reason;
          }
      }
      //ASSERT
      assert.equal("Contract is currently not operational", errorMessage, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);
  });


  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let errorMessage;
    let newAirline = config.accounts[5];
    //first airline registered, but still has not paid its fee
    let unfundedAirline = config.accounts[0];

    // ACT
    try {
        //unfunded airline attempts to register a second airlne
        await config.flightSuretyApp.registerAirline(newAirline, {from: unfundedAirline}).then((res)=>{console.log(res);});
    }
    catch(e) {
      if(e){
        //unable to access "registerAirline" function
        errorMessage = e.reason;

      }
    }

    // ASSERT
    assert.equal("You must pay registration fee to do that", errorMessage, "Airline should not be able to register another airline if it hasn't provided funding");

  });


  it(`allows contract participation only after registration fee payment`, async function(){
    let firstAirline = config.firstAirline;
    let airlineNoFund = config.accounts[1];
    let success;
    //firstAirline pays its fee
    await config.flightSuretyApp.fund({from: firstAirline, value: web3.utils.toWei(web3.utils.toBN(10),"ether")}).then((res)=>{
      console.log(res.receipt.rawLogs[0]);
    });
    
    //firstAirline can now successfully registers a second airline
    await config.flightSuretyData.registerAirline(config.accounts[1], firstAirline).then((result)=>{
      success = result.logs[0].event;
    });

    assert.equal("AirlineAdded", success, "Cannot access 'paying member' functions")

 });
 
 it(`registers a new airline candidate by 50% vote`, async function(){
      //variable to assert
      let candidateElected;

      //2 addresses are already registered. Register two more:
      await config.flightSuretyData.registerAirline(config.accounts[2], config.firstAirline);
      await config.flightSuretyData.registerAirline(config.accounts[3], config.firstAirline);
     
      //Voting to registrar begins after 4 airlines are registered:
       await config.flightSuretyData.registerAirline(config.accounts[4], config.firstAirline).then((result)=>{
        truffleAssert.eventEmitted(result, "VotePlacedFor");
      });
       //making sure all voters in this test election have paid their registration fee
       await config.flightSuretyApp.fund({from:config.accounts[1], value:web3.utils.toWei(web3.utils.toBN(10),"ether")});
       // candidate is elected after 50% (2 in this test) registered airlines vote them in:
        await config.flightSuretyData.registerAirline(config.accounts[4], config.accounts[1],{from:"0x845f7432659FA0232755F260080A72Ff489FccA4"}).then((result)=>{
          truffleAssert.eventEmitted(result, "AirlineAdded");
          candidateElected = result.logs[0].args.candidate;
        });
       assert.equal(candidateElected, config.accounts[4], "The candidate was not registered"); 
 });



 it(`(an active airline) can register a flight`, async ()=>{

    let flight = "ND0303";
    //an airline that has already registered and paid participation fund
    let airline = config.accounts[0];
    let flightAvailability;
    //register the flight
    await config.flightSuretyData.registerFlight(airline, flight, {from:airline}).then((result)=>{
     // console.log(result.logs[0].args);
     flightAvailability = result.logs[0].args.flightAvailability;
      
     //ASSERT
      assert.equal(true, flightAvailability, "Flight has not been registered");
    });
 });



it(`gets a list of registered flights`, async ()=>{
  //returns array of all registered flights
  let listArray = await config.flightSuretyApp.getFlightList();
  //get the one registered flight currently in the array
  let listedFlight = listArray[0];

  //ASSERT
  assert.equal("ND0303", listedFlight, "The list of flights was not returned");
});



 it(`(a passenger) can buy insurance for a flight`, async()=>{
    let passenger = config.accounts[20];
    let flight = "ND0303";
    let accountBalance;
    //buys insurance (with 1 ETH)
    await config.flightSuretyData.buy(passenger, flight,{from:passenger, value:web3.utils.toWei(web3.utils.toBN(1),"ether")}).then((result)=>{
      //console.log(result.logs[0].args);
    });

    await config.flightSuretyData.getAccountBalance.call(passenger, flight,{from:passenger}).then((result)=>{
      accountBalance = result;
    });

    //ASSERT 
    assert.equal(web3.utils.toWei(web3.utils.toBN(1),"ether").toString(),accountBalance.toString(), "There is no Ethers listed in the passenger's account" );

 });


 it(`credits passenger accounts 1.5x if flight status is late`, async()=>{
  let passenger = config.accounts[20];
  let airline = config.accounts[0];
  let timestamp = Math.floor(Date.now() / 1000);
  let flight = "ND0303";
  let statusCode = 20; //'Late' status
  let totalExtraCreditAmt = web3.utils.toWei(web3.utils.toBN(1),"ether") * 1.5;
  //console.log("EXTRA CREDIT PAYOUT AMOUNT IS: "+ totalExtraCreditAmt);


  let accountBalanceBefore;
  let accountBalanceAfter;

  //get account balance before
  await config.flightSuretyData.getAccountBalance.call(passenger,flight, {from:passenger}).then((result)=>{
    accountBalanceBefore = result;
  });

   //info sent from processed flight status
   await config.flightSuretyData.creditInsurees(flight,statusCode);

    //passenger's account should equal 1.5x of 1ETH
    await config.flightSuretyData.getAccountBalance.call(passenger, flight,{from:passenger}).then((result)=>{
      accountBalanceAfter = result;
    });

    //ASSERT
    assert.equal(totalExtraCreditAmt, accountBalanceAfter, "The passenger's account was not credited extra");
 });



 it(`(passenger) withdraws money from passenger's account`, async()=>{
    let passenger = config.accounts[20];
    let flight = "ND0303";
    let zero = 0;
    let accountBalanceAfterWithdraw;

    //passenger withdraws their funds
    await config.flightSuretyData.pay(passenger, flight);

    //get passenger's account balance after their withdrawal
    await config.flightSuretyData.getAccountBalance.call(passenger, flight,{from:passenger}).then((result)=>{
      accountBalanceAfterWithdraw = result;
    });

    //ASSERT
    assert.equal(zero.toString(), accountBalanceAfterWithdraw.toString(), "Account's ethers have not been withdrawn");

 });

//end
});
