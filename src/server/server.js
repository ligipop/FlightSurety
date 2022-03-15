import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let oracles = [];
//authorize app contract to call the data contract
(async() => {
  let accounts = await web3.eth.getAccounts();
  try {
      await flightSuretyData.methods.authorizeCaller(config.appAddress).send({from: accounts[0]});
    } 
    catch(e) {
      console.log(e);
    }

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call()

//register as many oracles as there are accounts (oracle addresses are account addresses)
  accounts.forEach( async(oracleAddress) => {
    try {                                                                                         
      await flightSuretyApp.methods.registerOracle().send({from: oracleAddress, value: fee, gas : 4712388, gasPrice: 100000000000 });
      let indexesResult = await flightSuretyApp.methods.getMyIndexes().call({from: oracleAddress});
      oracles.push({
        address: oracleAddress,
        indexes: indexesResult
      });
    } catch(e) {
      console.log(e);
    }
  });
});

//log each Oracle registration in the terminal, wait for Oracle Request event to submit.
//This event will submit when the fetch Flight Status method is called.
console.log("Registering Oracles.\n");
setTimeout(() => {
  oracles.forEach(oracle => {
    console.log(`Oracle: address[${oracle.address}], indexes[${oracle.indexes}]`);
  })

//listen to the OracleRequest event,
  console.log("Start watching for event OracleRequest to submit responses.")
}, 25000)

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) {
      console.log(error)
    } else {
      // REQ: Server will loop through all registered oracles,
      // identify those oracles for which the OracleRequest event applies,
      // and respond by calling into FlightSuretyApp contract with random status code of Unknown (0),
      // On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
      let statusCode = Math.floor(Math.random() * 6) * 10;
      let result = event.returnValues;
      console.log(`OracleRequest: [${result.index}] for ${result.flight} ${result.timestamp}`);

      oracles.forEach((oracle) => {
      oracle.indexes.forEach((index) => {
        flightSuretyApp.methods.submitOracleResponse(
          result.index,
          result.airline,
          result.flight,
          statusCode
          ).send(
          { from: oracle.address, gas: 4712388, gasPrice: 100000000000 }
          ).then(res => {
            console.log(`OracleResponse: address(${oracle.address}) index(${index}) accepted[${statusCode}]`)
          }).catch(err => {
            console.log(`OracleResponse: address(${oracle.address}) index(${index}) rejected[${statusCode}]`)
          });
        });
      });
    }

});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;