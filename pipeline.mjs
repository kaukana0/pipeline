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
export function run(processingCfg, callback, failCallback, hook=arrayBuffer2Json) {
    let output = {}

    Promise     // get data in parallel. order is preserved.
    .all( processingCfg.map(el => {
            if(typeof el.cache !== "object") {
                return fetch(el.input)  // the usual way w/o caching behaviour
            } else {
                const data = el.cache.restore(el.input)   // let the user provide (stored or otherwise obtained) data
                if(data) {
                    return new Promise(
                        function(resolve,reject) {
                            resolve(new Response(
                                new Blob([data]),
                                {status:200})
                            )
                        }
                    )
                } else {
                    return fetch(el.input)
                }
            }
        })      // continue happy path only when all requests are successfully finished
     )

     // all data is available, go through the processors
    .then(responses => {
        Promise
        .all( responses.map(response => { 
            if(response.ok) {
                return response.arrayBuffer()       // get json from it
            } else {
                const txt = `pipeline: response is not ok (${response.statusText}).`
                // TODO: only 1 throw
                if(response.status === 400) {
                    const x = response.text().then(r=>{throw Error(txt+" Response text:\n"+r)})
                }
                throw Error(txt)
            }
        }))
        .then(arrBuffs => { 
            // let a chain of functions do sth with it (i.e. "process" it).
            // this follows a cumulative fashion, meaning each processor
            // has access to the cumulated results of the previous processors.
            arrBuffs.map( (arrBuff,i) => {
                const data = hook(arrBuff)
                processingCfg[i].processors.forEach( function(processor){
                    if(typeof processingCfg[i].cache === "object") {
                        processingCfg[i].cache.store(data)  // let the user handle storage of data
                    }
                    // inputDataFromRequest, inputDataFromCfg, output
                    processor(data, processingCfg[i].data, output)
                })
            } )
            // finally, let the module user do sth with the completely processed output.
            callback(output)
        })
    })

    .catch( e => {
        failCallback(e)
    })
}
