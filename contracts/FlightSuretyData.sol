pragma solidity ^0.4.25;
pragma experimental ABIEncoderV2;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    //CONTRACT HANDLING
    address contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    

    //AIRLINE HANDLING
    uint airlineId = 1;
    

    struct Airline{
        address airline;
        uint id;
        bool status;
        bool paidFee;
    }

    mapping(address => Airline) private airlines;

    event AirlineAdded(address candidate, uint id,  uint256 timestamp);
    event AirlineActive(address caller, uint256 valueSent, bool paid);


    //ELECTIONS HANDLING
    struct Vote{
        address voter;
        uint voterNum;
    }
    //contains all votes for a specific candidate
    mapping(address => Vote[]) private elections;

    event VotePlacedFor(address candidate, uint id, uint256 timestamp);
    


//FLIGHT HANDLING

    //flight ID
    uint flightId = 1;
    string[] flightList;

    struct Flight {
        string name;
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }

    //Flight availability check
    mapping(string => bool)flightAvailability;
    //Flights Info Statuses
    mapping(bytes32 => Flight) private flights;
    //Passenger Accounts by Flight
    mapping(address => mapping(string => uint256)) private passengerAccounts;
    //ADD MAPPING FLIGHT => PASSENGERS
    mapping(string => address[]) passengersOnFlight;
    //then take that array of addresses, and pay out to all of them using a loop

    event FlightRegistered(string flightName, uint flightId, address airline, uint8 statusCode, uint256 timestamp, bool flightAvailability);
    event InsurancePurchased(address passenger, string flightName, uint amount);
    event AccountsCredited(string flight, uint8 flightStatus);
    event WithdrawalMade(address payee, string flight, uint amount);
    
    



    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                () 
                                public 
    {
        contractOwner = msg.sender;
        airlines[contractOwner] = Airline({
            airline: contractOwner,
            id: airlineId, 
            status: true,
            paidFee: false
        });
        emit AirlineAdded(contractOwner, airlines[contractOwner].id, block.timestamp);
        airlineId = airlineId.add(1);


    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }


    //Requires registered airlines to have paid the registration fee
    //in order to participate in the contract
    modifier registryFeePaid(address caller){
        require(airlines[caller].paidFee == true, "You must pay registration fee to do that");
        _;
    }

    

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                             
    {
        operational = mode;
    }

    //Returns owner of contract

    function getOwner() external view returns(address){
        return contractOwner;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    //GET REGISTERED AIRLINE CALLER

    function verifyRegisteredAirline(address caller) view external requireIsOperational returns(bool){
        if(airlines[caller].status == true){
            return true;
        }
    }


   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (address candidate, address voter)
                            external registryFeePaid(voter) requireIsOperational
                            
    {
        //check to see if candidate is already registered
        require(airlines[candidate].status != true, "This candidate is already a registered airline");
        uint256 timestamp = now;
        //When there are less than 4 total registered airlines:
        if(airlineId <= 4){
            //register airline 
            airlines[candidate] = Airline({
                airline: candidate,
                id: airlineId,
                status: true,
                paidFee: false
            });
            //increase airline ID number
            airlineId = airlineId.add(1);
            //emit 'Airline has been added'
            emit AirlineAdded(candidate, airlines[candidate].id, timestamp);

        //When there are 4 or more registered airlines:
        }else if(airlineId >= 5){
            //Make sure candidate has not already been elected to the airlines registry
            require(airlines[candidate].status != true, "This candidate is already a registered airline");
            //check to see if this voter has already voted for this candidate
            bool isDuplicate = false;
            for(uint a = 0; a < elections[candidate].length; a++){
                if(elections[candidate][a].voter == voter){
                    isDuplicate = true;
                    break;
                }
            }
            require(isDuplicate == false, "You have already voted for this candidate");


            //get the 'electNum' from this particular candidate's mapping
            uint electNum;
            if(elections[candidate].length > 0){
                electNum = elections[candidate].length.add(1);
            }else{
                electNum = 1;
            }
           
            //Get the number of votes that you need in order to elect candidate:
            // (50% of all registered airlines must vote for the candidate)
            uint totalRegistered = airlineId.sub(1);
            uint votesRequired = totalRegistered.mul(5).div(10);
            //Add vote to the candidate's election
            elections[candidate].push(Vote(voter, electNum));
            //Once vote is made
            //if enough votes to elect have been reached
            if(electNum >= votesRequired){
                airlines[candidate] = Airline(candidate, airlineId, true, false);
                // emit "Airline has been added"
                emit AirlineAdded(candidate, airlines[candidate].id, timestamp);
                //increase global airlineId variable
                airlineId = airlineId.add(1);
           // else if msg.sender is not the final vote required to elect...
            }else{
                //emit "Vote has been placed for..."
                 emit VotePlacedFor(candidate, airlineId, timestamp);
            }

        }
    }



    //REGISTER FLIGHT
    function registerFlight(address airline, string flight) external registryFeePaid(airline){
        uint256 savedTime = block.timestamp;
        bytes32 flightKey = getFlightKey(airline,flight, savedTime);
        flights[flightKey] = Flight(flight, true, 0, savedTime, airline);
        flightAvailability[flight] = true;
        //add flight to list
        flightList.push(flight);
        
        emit FlightRegistered(flight, flightId, airline, 0, flights[flightKey].updatedTimestamp, flightAvailability[flight]);
        flightId = flightId.add(1);
    }


    //GET FLIGHT LIST
    function getFlightList() external view returns(string[] memory){
        return flightList;
    }



   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address passenger, string flight)
                            external
                            payable
    {
        require(flightAvailability[flight] == true, "Could not locate that flight");
        require(msg.value > 0 ether, "You must send Ethers");
        require(msg.value <= 1 ether, "Max amount is 1 ETH");
        passengerAccounts[passenger][flight] = passengerAccounts[passenger][flight].add(msg.value);
        passengersOnFlight[flight].push(passenger);
        emit InsurancePurchased(passenger, flight, msg.value);
    }

    //PASSENGER CAN CHECK THEIR ACCOUNT BALANCE FOR A FLIGHT
    function getAccountBalance(address passenger, string flight) external view returns(uint256){
        return passengerAccounts[passenger][flight];
    }

    /**
     *  @dev Credits payouts to insurees
    */


    function creditInsurees(string flight, uint8 status)
                                external
                                
    {
        //require that the flight exists
        require(flightAvailability[flight]==true, "Could not locate that flight");
        uint256 creditAmount;

        //check if flight is late, add credit to all those who hold 
        //an account for that flight
        if(status >= 20 && status <= 50){
            //loop through all account holders for the given flight
            for(uint a = 0; a < passengersOnFlight[flight].length; a++){
                //passengersOnFlight[flight][a] //this equals an address

                //add credit to each of these accounts
                passengerAccounts[passengersOnFlight[flight][a]][flight] = passengerAccounts[passengersOnFlight[flight][a]][flight].mul(15).div(10);

            }

            emit AccountsCredited(flight, status);
        }

    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address payee, string flight)
                            external payable
                            
    {
       
        //require that the caller (payee) has previously bought insurance
        require(passengerAccounts[payee][flight] > 0,"You do not have an account for this flight");
        //payout amount
      uint256 payout = passengerAccounts[payee][flight];
        //change account to 0 after ethers are paid out
      passengerAccounts[payee][flight] = 0;
        //send ethers to customer 
        payee.transfer(payout);

        emit WithdrawalMade(payee, flight, payout);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(address caller)
                            external
                            payable requireIsOperational
    {
        //if the caller of this function is registered, but has not paid their fee
        
            require(airlines[caller].paidFee != true, "You have already paid the registration fee");
            require(msg.value >= 10 ether, "Please pay at least 10 ETH");
           require(caller == tx.origin, "Contracts are not allowed");
            uint256 cost = 10 ether;
            //changing statemachine ring addict bulb infant local year traffic candy wealth visual sand
            airlines[caller].paidFee = true;
            //state should be changed:
            bool collectAnswer = airlines[caller].paidFee;
            //return extra ethers
            caller.transfer(msg.value.sub(cost));
            //emit event
            emit AirlineActive(caller, msg.value, collectAnswer);
        
    
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        //fund();
    }


}

