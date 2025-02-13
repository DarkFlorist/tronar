import { EthSimulateV1Result } from './simulator/types/ethSimulateTypes.js'

const printResults = (result: EthSimulateV1Result) => {
	console.log(JSON.stringify(EthSimulateV1Result.serialize(result)))
}

export const checkSuccess = (result: EthSimulateV1Result) => {
	if (allSuccess(result)) return
	printResults(result)
	throw new Error('transaction failed')
}

export const allSuccess = (result: EthSimulateV1Result) => {
	return result.flatMap((x) => x.calls.map((x) => x.status === 'success')).every((a) => a === true)
}

const countFalses = (arr: boolean[]): number => {
	return arr.filter(value => value === false).length
}

type Test = [string, () => Promise<void>, boolean | undefined]
export const runTestsSequentially = async (tests: Test[]) => {
	console.log(`Running ${ tests.length } tests`)
	const successes = []
	for (const [testName, testFunc, ignore] of tests) {
		try {
			if (ignore === true) {
				console.log(`TEST "${ testName }" IGNORED!`)
				successes.push(true)
				continue
			}
			await testFunc()
			successes.push(true)
			console.log(`TEST "${ testName }" SUCCESS!`)
		} catch(e) {
			console.log(`TEST "${ testName }" FAILED!`)
			console.error(e)
			successes.push(false)
		}
	}
	if (successes.length !== tests.length) throw new Error('successes and tests array length mismatch')
	const failures = countFalses(successes)
	if (failures) return console.error(`Tests failed: ${ failures }`)
	return console.log('All tests SUCCEEDED!')
}
