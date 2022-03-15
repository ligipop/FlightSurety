import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;
    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Read transaction
        contract.getFlightList((error, result) => {
            console.log(error,result);
            display('Flight List', 'List of all registered flights', [ { label: 'Flight List', error: error, value: result} ]);
        });
    
        // Get current registered flight if any

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('pay-fee').addEventListener('click', () => {
            
            // Write transaction
            contract.fund((error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fee Payment', error: error, value: result} ]);
            });
        });

         DOM.elid('reg-flight').addEventListener('click', () => {
            
            let flight = DOM.elid('flight-to-reg').value;
            // Write transaction
            contract.registerFlight(flight,(error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Registration Results', error: error, value: result} ]);
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let flight = DOM.elid('flight-buy').value;
            let amount = DOM.elid('amount-buy').value;

            // Write transaction
            contract.buy(flight, amount,(error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Insurance Purchase', error: error, value: result} ]);
            });
        })

        DOM.elid('refund').addEventListener('click', () => {
            
            let flight = DOM.elid('flight-refund').value;
            // Write transaction
            contract.pay(flight,(error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

    });
    

})();




async function getFlightList(contract) {
    console.log("before")
    console.log(contract.getFlights())
    console.log("after")
    const flights = contract.getFlightList();
  
  
    for (const flight of flights) {
        let el = document.createElement("div");
        el.text = `${flight.flight}`;
        el.value = JSON.stringify(flight);
        parentEl.add(el);
    } 
    //return flights;
  }

  

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
} 

