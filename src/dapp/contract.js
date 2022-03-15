import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

window.addEventListener('load', async () => {
    // Modern dapp browsers...
    if (window.ethereum) {
        window.web3 = new Web3(ethereum);
        try {
            // Request account access if needed
            await ethereum.enable();
            // Acccounts now exposed
            web3.eth.sendTransaction({/* ... */});
        } catch (error) {
            // User denied account access...
        }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
        window.web3 = new Web3(web3.currentProvider);
        // Acccounts always exposed
        web3.eth.sendTransaction({/* ... */});
    }
    // Non-dapp browsers...
    else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
});

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = [];

    }

    getMetaskAccountID() {
        // Retrieving metamask accounts
        this.web3.eth.getAccounts(function (err, res) {
            if (err) {
                console.log('Error:', err)
                return
            }
            //this.metamaskAccountID = res[0]
            this.owner = res[0];
        })
      }

    initialize(callback) {
        this.getMetaskAccountID()

        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    getFlightList(callback){
        let self = this;
        self.flightSuretyApp.methods
            .getFlightList()
            .call({from:self.owner}, callback);
    }


    //pay airline registration fee
    fund(callback){
        let self = this;
        let airline = self.owner;
        let amount = web3.utils.toWei(web3.utils.toBN(10),"ether");
        self.flightSuretyApp.methods
            .fund()
            .send({from: airline, value: amount, gasPrice: 100000000000, gas: 4712388},(error, result)=>{
                let confirm = "Your registration fee has been paid";
                callback(error, confirm);
            });
    }
    
    registerFlight(flight, callback){
        let self = this;
        let airline = self.owner;
        self.flightSuretyApp.methods
            .registerFlight(flight)
            .send({from: airline,gasPrice: 100000000000, gas: 4712388},(error, result)=>{
                let confirm = `The flight ${flight} has been registered by airline ${airline}`;
                callback(error, confirm);
            });

    }



    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner, gasPrice: 100000000000, gas: 4712388}, (error, result) => {
                callback(error, payload);
                console.log(result);
            });
    }
//buy passenger insurance
    buy(flight, amount, callback){
        let self = this;
        let passenger = self.passengers[0];
        let amt = web3.utils.toWei(web3.utils.toBN(amount), "ether");
        self.flightSuretyApp.methods
            .buy(flight)
            .send({from: passenger, value: amt, gasPrice: 100000000000, gas: 4712388},(error, result) => {
                let confirm = `Your insurance has been purchased for flight ${flight}`;
                callback(error, confirm);
            });
    }

    pay(flight, callback){
        let self = this;
        let passenger = self.passengers[0];
        self.flightSuretyApp.methods
            .pay(flight)
            .send({from: passenger, gasPrice: 100000000000, gas: 100000000000}, (error, result)=>{
                let confirm = `Your money has been refunded for flight ${flight}`;
                callback(error, confirm);

            });
    }

    
}