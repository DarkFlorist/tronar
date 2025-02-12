
export const addressString = (address: bigint) => `0x${ address.toString(16).padStart(40, '0') }`
export const addressStringWithout0x = (address: bigint) => address.toString(16).padStart(40, '0')

export const bytes32String = (bytes32: bigint) => `0x${ bytes32.toString(16).padStart(64, '0') }`

export function stringToUint8Array(data: string) {
	const dataLength = (data.length - 2) / 2
	if (dataLength === 0) return new Uint8Array()
	return bigintToUint8Array(BigInt(data), dataLength)
}

export function dataString(data: Uint8Array | null) {
	if (data === null) return ''
	return Array.from(data).map(x => x.toString(16).padStart(2, '0')).join('')
}

export function dataStringWith0xStart(data: Uint8Array | null): `0x${ string }` {
	return `0x${ dataString(data) }`
}

export function bigintToUint8Array(value: bigint, numberOfBytes: number) {
	if (typeof value === 'number') value = BigInt(value)
	if (value >= 2n ** BigInt(numberOfBytes * 8) || value < 0n) throw new Error(`Cannot fit ${ value } into a ${ numberOfBytes }-byte unsigned integer.`)
	const result = new Uint8Array(numberOfBytes)
	for (let i = 0; i < result.length; ++i) {
		result[i] = Number((value >> BigInt(numberOfBytes - i - 1) * 8n) & 0xffn)
	}
	return result
}

// biome-ignore lint/suspicious/noExplicitAny: matches JSON.stringify signature
export function stringifyJSONWithBigInts(value: any, space?: string | number | undefined): string {
	return JSON.stringify(value, (_key, value) => { return typeof value === 'bigint' ? `0x${ value.toString(16) }` : value }, space)
}

export function bytesToUnsigned(bytes: Uint8Array): bigint {
	let value = 0n
	for (const byte of bytes) {
		value = (value << 8n) + BigInt(byte)
	}
	return value
}

export const min = (left: bigint, right: bigint) => left < right ? left : right
export const max = (left: bigint, right: bigint) => left > right ? left : right
export const abs = (x: bigint) => (x < 0n) ? -1n * x : x
export const bigIntMax = (args: bigint[]) => args.reduce((m, e) => e > m ? e : m)
export const bigIntMin = (args: bigint[]) => args.reduce((m, e) => e < m ? e : m)

export function isHexEncodedNumber(input: string): boolean {
	const hexNumberRegex = /^(0x)?[0-9a-fA-F]+$/
	return hexNumberRegex.test(input)
}

export function calculateWeightedPercentile(data: readonly { dataPoint: bigint, weight: bigint }[], percentile: bigint): bigint {
	if (data.length === 0) return 0n
	if (percentile < 0 || percentile > 100 || data.map((point) => point.weight).some((weight) => weight < 0)) throw new Error('Invalid input')
	const sortedData = [...data].sort((a, b) => a.dataPoint < b.dataPoint ? -1 : a.dataPoint > b.dataPoint ? 1 : 0)
	const cumulativeWeights = sortedData.map((point) => point.weight).reduce((acc, w, i) => [...acc, (acc[i] ?? 0n) + w], [0n])
	const totalWeight = cumulativeWeights[cumulativeWeights.length - 1]
	if (totalWeight === undefined) throw new Error('Invalid input')

	const targetIndex = percentile * totalWeight / 100n

	const index = cumulativeWeights.findIndex(w => w >= targetIndex)

	if (index === -1) throw new Error('Invalid input')

	const lowerIndex = index === 0 ? 0 : index - 1
	const upperIndex = index

	const lowerValue = sortedData[lowerIndex]
	const upperValue = sortedData[upperIndex]
	const lowerWeight = cumulativeWeights[lowerIndex]
	const upperWeight = cumulativeWeights[upperIndex]

	if (lowerWeight === undefined || upperWeight === undefined || lowerValue === undefined || upperValue === undefined) throw new Error('weights were undefined')
	if (lowerIndex === upperIndex) return lowerValue.dataPoint

	const interpolation = (targetIndex - lowerWeight) / (upperWeight - lowerWeight)
	return lowerValue.dataPoint + (upperValue.dataPoint - lowerValue.dataPoint) * interpolation
}
