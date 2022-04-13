/**
 * getting data from webservices 
 * and processing it (e.g. to fit a chart's data input and/or to aggregate stuff)
 * 
 * 2 main ideas here:
 * - pipeline: input -> processing -> output
 * - keep functions pure
 */


// the actual implementation which wires the pipeline together
export function run(processingCfg, callback) {
    let output = {}
    Promise
    .all( processingCfg.map(el => { return fetch(el.input) }) )     // fetch data; only continue happy path when all requests are successfully finished
    .then(responses => {
        Promise
        .all( responses.map(response => { return response.json() }) )   // get json from it
        .then(jsonObjs => { 
            // let a chain of functions do sth with it (i.e. "process" it).
            // this follows a cumulative fashion, meaning each processor
            // has access to the cumulated results of the previous processors.
            jsonObjs.map( (jsonObj,i) => {
                processingCfg[i].processors.forEach( function(processor){
                    processor(jsonObj, output)
                })
            } )
            // finally, let the module user do sth with the completely processed output.
            callback(output)
        })
    })
    .catch( e => console.log(e.message) )
}


/*
example for processingCfg:


const processingCfg = [
    {
        input : "https://someWebApi",
        processors : [extractSomeData, mergeSomeData]
    },
    {
        input : "https://anotherWebApi",
        processors : [extractSomeDataDifferently]
    }
]


function extractSomeData(inputData, output) {
    ...
    output["bla"] = inputData["here"]
}

function mergeSomeData(inputData, output) {
    output["bla"] = { ...output["bla"], ...inputData["there"] }
}

function extractSomeDataDifferently(inputData, output) {
    ...
    output["bla2"] = ...
}


get data from "input" source.
then give that input and an initially blank "output" object to each of a list of "processors".
every processor is supposed to take the "input" and modify the "output" in a cumulative fashion.

order of processors matters - within the processingCfg array as well as within the processors arrays.

*/