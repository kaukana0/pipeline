
# example for processingCfg


	const processingCfg = [
		{
			input : "https://someWebApi",
			processors : [extractSomeData, mergeSomeData]
		},
		{
			input : "someLocalFile.csv",
			processors : [extractSomeDataDifferently]
		},
		{
			// input:...  only accessed if restore() returns a truthy value
			cache: {
				store: (data, key) => ... ,
				restore: (id) => "{some: 'data not retrieved via fetch'}"
			},
			processors : [doSomething]
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

	function doSomething(inputData, output) {...}

# usage

	pipeline.run(
		processingCfg,
		(data) => {
			// do something with data 
			// (data is actually "output" from above 
			// after the whole pipeline of processors ran through)
			let a = data.bla
			let b = data.bla2
	})


# explanation

- get data from "input" source.
- then give that input + an initially blank "output" object to each of a list of "processors".
- every processor is supposed to take the "input" and modify the "output" in a cumulative fashion.

## note

order of processors matters - within the processingCfg array as well as within the processors arrays.
The changes on output object are available in subsequent processors.