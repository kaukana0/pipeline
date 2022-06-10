/**
 * getting data from webservices 
 * and processing it (e.g. to fit a chart's data input and/or to aggregate stuff)
 * 
 * 2 main ideas here:
 * - pipeline: input -> processing -> output
 * - keep functions pure
 */


function arrayBuffer2Json(arrayBuffer) {
    var dataView = new DataView(arrayBuffer);
    var decoder = new TextDecoder('utf8');
    var obj = JSON.parse(decoder.decode(dataView));
    return obj
}

// the actual implementation which wires the pipeline together.
// the hook provides a means to manipulate raw data - it's return value doesn't neccessarily have to be a JSON object.
export function run(processingCfg, callback, hook=arrayBuffer2Json) {
    let output = {}
    Promise
    .all( processingCfg.map(el => { return fetch(el.input) }) )     // fetch data; only continue happy path when all requests are successfully finished
    .then(responses => {
        Promise
        .all( responses.map(response => { return response.arrayBuffer() }) )   // get json from it
        .then(arrBuffs => { 
            // let a chain of functions do sth with it (i.e. "process" it).
            // this follows a cumulative fashion, meaning each processor
            // has access to the cumulated results of the previous processors.
            arrBuffs.map( (arrBuff,i) => {
                const data = hook(arrBuff)
                processingCfg[i].processors.forEach( function(processor){
                    processor(data, output)
                })
            } )
            // finally, let the module user do sth with the completely processed output.
            callback(output)
        })
    })
    .catch( e => console.log(e.message) )
}
