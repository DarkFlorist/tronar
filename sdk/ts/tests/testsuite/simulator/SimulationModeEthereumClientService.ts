import { EthereumClientService } from './EthereumClientService.js'
import { EthereumUnsignedTransaction, EthereumSignedTransactionWithBlockData, EthereumBlockTag, EthereumAddress, EthereumBlockHeader, EthereumBlockHeaderWithTransactionHashes, EthereumData, EthereumQuantity, EthereumBytes32, EthereumSendableSignedTransaction } from './wire-types.js'
import { addressString, bigintToUint8Array, bytes32String, calculateWeightedPercentile, dataString, dataStringWith0xStart, max, min, stringToUint8Array } from './bigint.js'
import { CANNOT_SIMULATE_OFF_LEGACY_BLOCK, ERROR_INTERCEPTOR_GAS_ESTIMATION_FAILED, ETHEREUM_EIP1559_BASEFEECHANGEDENOMINATOR, ETHEREUM_EIP1559_ELASTICITY_MULTIPLIER, MOCK_ADDRESS, DEFAULT_CALL_ADDRESS, GAS_PER_BLOB } from './constants.js'
import { SimulatedTransaction, SimulationState, EstimateGasError, TransactionStack } from './visualizer-types.js'
import { EthereumUnsignedTransactionToUnsignedTransaction, IUnsignedTransaction1559, rlpEncode, serializeSignedTransactionToBytes } from './ethereum.js'
import { EthGetLogsResponse, EthGetLogsRequest, EthTransactionReceiptResponse, DappRequestTransaction, EthGetFeeHistoryResponse, FeeHistory } from './JsonRpc-types.js'
import { assertNever, modifyObject } from './typescript.js'
import { SignMessageParams } from './jsonRpc-signing-types.js'
import { StateOverrides } from './ethSimulate-types.js'
import { getCodeByteCode } from './ethereumByteCodes.js'
import { stripLeadingZeros } from './typed-arrays.js'
import { JsonRpcResponseError } from './errors.js'
import { decodeFunctionResult, encodeFunctionData, hashMessage, hashTypedData, keccak256 } from 'viem'
import { sign, signMessage } from 'viem/accounts'

const MOCK_PUBLIC_PRIVATE_KEY = 0x1n // key used to sign mock transactions
const MOCK_SIMULATION_PRIVATE_KEY = 0x2n // key used to sign simulated transatons
const ADDRESS_FOR_PRIVATE_KEY_ONE = 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdfn
const GET_CODE_CONTRACT = 0x1ce438391307f908756fefe0fe220c0f0d51508an

export const copySimulationState = (simulationState: SimulationState): SimulationState => {
	return { ...simulationState, simulatedTransactions: [...simulationState.simulatedTransactions] }
}

const transactionQueueTotalGasLimit = (simulationState: SimulationState) => {
	return simulationState.simulatedTransactions.reduce((a, b) => a + b.preSimulationTransaction.gas, 0n)
}

export const simulationGasLeft = (simulationState: SimulationState | undefined, blockHeader: EthereumBlockHeader) => {
	if (blockHeader === null) throw new Error('The latest block is null')
	if (simulationState === undefined) return blockHeader.gasLimit * 1023n / 1024n
	return max(blockHeader.gasLimit * 1023n / 1024n - transactionQueueTotalGasLimit(simulationState), 0n)
}

export function getInputFieldFromDataOrInput(request: { input?: Uint8Array} | { data?: Uint8Array } | {}) {
	if ('data' in request && request.data !== undefined) return request.data
	if ('input' in request && request.input !== undefined) return request.input
	return new Uint8Array()
}

export const simulateEstimateGas = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, data: DappRequestTransaction): Promise<EstimateGasError | { gas: bigint }> => {
	// commented out because of nethermind not estimating gas correctly https://github.com/NethermindEth/nethermind/issues/5946
	//if (simulationState === undefined) return { gas: await ethereumClientService.estimateGas(data) }
	const sendAddress = data.from !== undefined ? data.from : MOCK_ADDRESS
	const transactionCount = getSimulatedTransactionCount(ethereumClientService, requestAbortController, simulationState, sendAddress)
	const block = await ethereumClientService.getBlock(requestAbortController)
	if (block === null) throw new Error('The latest block is null')
	const maxGas = simulationGasLeft(simulationState, block)

	const getGasPriceFields = (data: DappRequestTransaction) => {
		if (data.gasPrice !== undefined) return { maxFeePerGas: data.gasPrice, maxPriorityFeePerGas: data.gasPrice }
		if (data.maxPriorityFeePerGas !== undefined && data.maxPriorityFeePerGas !== null && data.maxFeePerGas !== undefined && data.maxFeePerGas !== null) {
			return { maxFeePerGas: data.maxFeePerGas, maxPriorityFeePerGas: data.maxPriorityFeePerGas }
		}
		return { maxFeePerGas: 0n, maxPriorityFeePerGas: 0n }
	}

	const tmp = {
		type: '1559' as const,
		from: sendAddress,
		chainId: ethereumClientService.getChainId(),
		nonce: await transactionCount,
		...getGasPriceFields(data),
		gas: data.gas === undefined ? maxGas : data.gas,
		to: data.to === undefined ? null : data.to,
		value: data.value === undefined ? 0n : data.value,
		input: getInputFieldFromDataOrInput(data),
		accessList: []
	}
	try {
		const multiCall = (await simulatedMulticall(ethereumClientService, requestAbortController, simulationState, [tmp], block.number))[0]
		if (multiCall === undefined) return { error: { code: ERROR_INTERCEPTOR_GAS_ESTIMATION_FAILED, message: 'ETH Simulate Failed to estimate gas', data: '' } }
		const lastResult = multiCall.calls[multiCall.calls.length - 1]
		if (lastResult === undefined) return { error: { code: ERROR_INTERCEPTOR_GAS_ESTIMATION_FAILED, message: 'ETH Simulate Failed to estimate gas', data: '' } }
		if (lastResult.status === 'failure') return { error: { ...lastResult.error, data: dataStringWith0xStart(lastResult.returnData) } }
		const gasSpent = lastResult.gasUsed * 125n * 64n / (100n * 63n) // add 25% * 64 / 63 extra  to account for gas savings <https://eips.ethereum.org/EIPS/eip-3529>
		return { gas: gasSpent < maxGas ? gasSpent : maxGas }
	} catch (error: unknown) {
		if (error instanceof JsonRpcResponseError) {
			const safeParsedData = EthereumData.safeParse(error.data)
			return { error: { code: error.code, message: error.message, data: safeParsedData.success ? dataStringWith0xStart(safeParsedData.value) : '0x' } }
		}
		throw error
	}
}

// calculates gas price for receipts
export const calculateRealizedEffectiveGasPrice = (transaction: EthereumUnsignedTransaction, blocksBaseFeePerGas: bigint) => {
	if ('gasPrice' in transaction) return transaction.gasPrice
	return min(blocksBaseFeePerGas + transaction.maxPriorityFeePerGas, transaction.maxFeePerGas)
}

export const mockSignTransaction = (transaction: EthereumUnsignedTransaction) : EthereumSendableSignedTransaction => {
	const unsignedTransaction = EthereumUnsignedTransactionToUnsignedTransaction(transaction)
	if (unsignedTransaction.type === 'legacy') {
		const signatureParams = { r: 0n, s: 0n, v: 0n }
		const hash = EthereumQuantity.parse(keccak256(serializeSignedTransactionToBytes({ ...unsignedTransaction, ...signatureParams })))
		if (transaction.type !== 'legacy') throw new Error('types do not match')
		return { ...transaction, ...signatureParams, hash }
	}

	const signatureParams = { r: 0n, s: 0n, yParity: 'even' as const }
	const hash = EthereumQuantity.parse(keccak256(serializeSignedTransactionToBytes({ ...unsignedTransaction, ...signatureParams })))
	if (transaction.type === 'legacy') throw new Error('types do not match')
	return { ...transaction, ...signatureParams, hash }
}

export const appendTransaction = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, transaction: EthereumUnsignedTransaction, temporaryAccountOverrides: StateOverrides = {}): Promise<SimulationState> => {
	const getSignedTransactions = () => {
		const signed = mockSignTransaction(transaction)
		return simulationState === undefined ? [signed] : simulationState.simulatedTransactions.map((x) => x.preSimulationTransaction).concat([signed])
	}

	const parentBlock = await ethereumClientService.getBlock(requestAbortController)
	if (parentBlock === null) throw new Error('The latest block is null')
	const parentBaseFeePerGas = parentBlock.baseFeePerGas
	if (parentBaseFeePerGas === undefined) throw new Error(CANNOT_SIMULATE_OFF_LEGACY_BLOCK)
	const signedMessages = getSignedMessagesWithFakeSigner(simulationState)
	const signedTxs = getSignedTransactions()
	const extraAccountOverrides = { ...simulationState?.stateOverrides, ...temporaryAccountOverrides }
	const ethSimulateV1CallResult = (await ethereumClientService.simulateTransactionsAndSignatures([signedTxs], signedMessages, parentBlock.number, requestAbortController, extraAccountOverrides))[0]
	if (ethSimulateV1CallResult === undefined) throw new Error('multicall length does not match in appendTransaction')
	if (ethSimulateV1CallResult.calls.length !== signedTxs.length) throw Error('multicall length does not match in appendTransaction')

	return {
		simulatedTransactions: ethSimulateV1CallResult.calls.map((singleResult, index) => {
			const signedTx = signedTxs[index]
			if (signedTx === undefined) throw Error('invalid transaction index')
			return {
				type: 'transaction',
				ethSimulateV1CallResult: singleResult,
				realizedGasPrice: calculateRealizedEffectiveGasPrice(signedTx, ethSimulateV1CallResult.baseFeePerGas),
				preSimulationTransaction: signedTx,
			}
		} ),
		blockNumber: parentBlock.number,
		blockTimestamp: parentBlock.timestamp,
		baseFeePerGas: ethSimulateV1CallResult.baseFeePerGas,
		simulationConductedTimestamp: new Date(),
		signedMessages: simulationState === undefined ? [] : simulationState.signedMessages,
		stateOverrides: simulationState?.stateOverrides || {},
	}
}

export const setSimulationTransactionsAndSignedMessages = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, newestBlockNumber: bigint, transactionStack: TransactionStack, stateOverrides: StateOverrides): Promise<SimulationState>  => {
	if (transactionStack.transactions.length === 0) {
		return {
			simulatedTransactions: [],
			blockNumber: newestBlockNumber,
			blockTimestamp: new Date(),
			simulationConductedTimestamp: new Date(),
			signedMessages: transactionStack.signedMessages,
			baseFeePerGas: 0n,
			stateOverrides,
		}
	}
	const parentBlock = await ethereumClientService.getBlock(requestAbortController)
	if (parentBlock === null) throw new Error('The latest block is null')
	const parentBaseFeePerGas = parentBlock.baseFeePerGas
	if (parentBaseFeePerGas === undefined) throw new Error(CANNOT_SIMULATE_OFF_LEGACY_BLOCK)
	const multicallResult = (await ethereumClientService.simulateTransactionsAndSignatures([transactionStack.transactions], transactionStack.signedMessages, parentBlock.number, requestAbortController, stateOverrides))[0]
	if (multicallResult === undefined || multicallResult.calls.length !== transactionStack.transactions.length) throw new Error('Multicall length does not match in setSimulationTransactions')

	return {
		simulatedTransactions: await Promise.all(multicallResult.calls.map(async(singleResult, index) => {
			const newTransaction = transactionStack.transactions[index]
			if (newTransaction === undefined) throw new Error('undefined transaction to simulate')
			return {
				preSimulationTransaction: newTransaction,
				ethSimulateV1CallResult: singleResult,
				realizedGasPrice: calculateRealizedEffectiveGasPrice(newTransaction, multicallResult.baseFeePerGas)
			}
		})),
		blockNumber: parentBlock.number,
		blockTimestamp: parentBlock.timestamp,
		baseFeePerGas: multicallResult.baseFeePerGas,
		simulationConductedTimestamp: new Date(),
		signedMessages: transactionStack.signedMessages,
		stateOverrides,
	}
}

const getTransactionQueue = (simulationState: SimulationState | undefined) => {
	if (simulationState === undefined) return []
	return simulationState.simulatedTransactions.map((x) => x.preSimulationTransaction)
}

export const getNonceFixedSimulatedTransactions = async(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulatedTransactions: readonly SimulatedTransaction[]) => {
	const isFixableNonceError = (transaction: SimulatedTransaction) => {
		return transaction.ethSimulateV1CallResult.status === 'failure'
		&& transaction.ethSimulateV1CallResult.error.message === 'wrong transaction nonce' //TODO, change to error code
	}
	if (simulatedTransactions.find((transaction) => isFixableNonceError(transaction)) === undefined) return 'NoNonceErrors' as const
	const nonceFixedTransactions: SimulatedTransaction[] = []
	const knownPreviousNonce = new Map<string, bigint>()
	for (const transaction of simulatedTransactions) {
		const preSimulationTransaction = transaction.preSimulationTransaction
		const fromString = addressString(preSimulationTransaction.from)
		if (isFixableNonceError(transaction)) {
			const getNewNonce = async () => {
				const prevNonce = knownPreviousNonce.get(fromString)
				if (prevNonce === undefined) return await ethereumClientService.getTransactionCount(preSimulationTransaction.from, 'latest', requestAbortController)
				return prevNonce + 1n
			}
			const presigned = modifyObject(preSimulationTransaction, modifyObject(transaction.preSimulationTransaction, { nonce: await getNewNonce() }))
			nonceFixedTransactions.push(modifyObject(transaction, { preSimulationTransaction: presigned }))
		} else {
			nonceFixedTransactions.push(transaction)
		}
		const lastTransaction = nonceFixedTransactions[nonceFixedTransactions.length - 1]
		if (lastTransaction === undefined) throw new Error('last transction did not exist')
		knownPreviousNonce.set(fromString, lastTransaction.preSimulationTransaction.nonce)
	}
	return nonceFixedTransactions
}

export const getBaseFeeAdjustedTransactions = (parentBlock: EthereumBlockHeader, unsignedTxts: readonly EthereumSendableSignedTransaction[]): readonly EthereumSendableSignedTransaction[] => {
	if (parentBlock === null) return unsignedTxts
	const parentBaseFeePerGas = parentBlock.baseFeePerGas
	if (parentBaseFeePerGas === undefined) return unsignedTxts
	return unsignedTxts.map((transaction) => {
		if (transaction.type !== '1559') return transaction
		return modifyObject(transaction, modifyObject(transaction, { maxFeePerGas: parentBaseFeePerGas * 2n + transaction.maxPriorityFeePerGas }))
	})
}

export const fixNonceErrorsIfNeeded = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState): Promise<{ nonceFixed: true, transactions: readonly EthereumSendableSignedTransaction[] } | { nonceFixed: false }> => {
	const nonceFixedTransactions = await getNonceFixedSimulatedTransactions(ethereumClientService, requestAbortController, simulationState.simulatedTransactions)
	if (nonceFixedTransactions === 'NoNonceErrors') return { nonceFixed: false }
	return { nonceFixed: true, transactions: nonceFixedTransactions.map((x) => x.preSimulationTransaction) }
}

const canQueryNodeDirectly = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState, blockTag: EthereumBlockTag = 'latest') => {
	if (simulationState === undefined
		|| (simulationState.simulatedTransactions.length === 0 && Object.keys(simulationState.stateOverrides).length === 0)
		|| (typeof blockTag === 'bigint' && blockTag <= await ethereumClientService.getBlockNumber(requestAbortController))
	){
		return true
	}
	return false
}

export const getSimulatedTransactionCount = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, address: bigint, blockTag: EthereumBlockTag = 'latest') => {
	const currentBlock = await ethereumClientService.getBlockNumber(requestAbortController)
	const blockNumToUse = blockTag === 'latest' || blockTag === 'pending' ? currentBlock : min(blockTag, currentBlock)
	let addedTransactions = 0n
	if (simulationState !== undefined && (blockTag === 'latest' || blockTag === 'pending' || blockTag > currentBlock)) {
		// if we are on our simulated block, just count how many transactions we have sent in the simulation to increment transaction count
		for (const signed of simulationState.simulatedTransactions) {
			if (signed.preSimulationTransaction.from === address) addedTransactions += 1n
		}
	}
	return (await ethereumClientService.getTransactionCount(address, blockNumToUse, requestAbortController)) + addedTransactions
}

export const getDeployedContractAddress = (from: EthereumAddress, nonce: EthereumQuantity): EthereumAddress => {
	return BigInt(`0x${ keccak256(rlpEncode([stripLeadingZeros(bigintToUint8Array(from, 20)), stripLeadingZeros(bigintToUint8Array(nonce, 32))])).slice(26) }`)
}

export const getSimulatedTransactionReceipt = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, hash: bigint): Promise<EthTransactionReceiptResponse> => {
	let cumGas = 0n
	let currentLogIndex = 0
	if (simulationState === undefined) { return await ethereumClientService.getTransactionReceipt(hash, requestAbortController) }
	for (const [index, simulatedTransaction] of simulationState.simulatedTransactions.entries()) {
		cumGas += simulatedTransaction.ethSimulateV1CallResult.gasUsed
		if(hash === simulatedTransaction.preSimulationTransaction.hash) {
			const blockNum = await ethereumClientService.getBlockNumber(requestAbortController)
			return {
				...simulatedTransaction.preSimulationTransaction.type === '4844' ? {
					type: simulatedTransaction.preSimulationTransaction.type,
					blobGasUsed: GAS_PER_BLOB * BigInt(simulatedTransaction.preSimulationTransaction.blobVersionedHashes.length),
					blobGasPrice: simulatedTransaction.preSimulationTransaction.maxFeePerBlobGas,
				} : {
					type: simulatedTransaction.preSimulationTransaction.type,
				},
				blockHash: getHashOfSimulatedBlock(simulationState),
				blockNumber: blockNum,
				transactionHash: simulatedTransaction.preSimulationTransaction.hash,
				transactionIndex: BigInt(index),
				contractAddress: simulatedTransaction.preSimulationTransaction.to !== null ? null : getDeployedContractAddress(simulatedTransaction.preSimulationTransaction.from, simulatedTransaction.preSimulationTransaction.nonce),
				cumulativeGasUsed: cumGas,
				gasUsed: simulatedTransaction.ethSimulateV1CallResult.gasUsed,
				effectiveGasPrice: calculateRealizedEffectiveGasPrice(simulatedTransaction.preSimulationTransaction, simulationState.baseFeePerGas),
				from: simulatedTransaction.preSimulationTransaction.from,
				to: simulatedTransaction.preSimulationTransaction.to,
				logs: simulatedTransaction.ethSimulateV1CallResult.status === 'success'
					? simulatedTransaction.ethSimulateV1CallResult.logs.map((x, logIndex) => ({
						removed: false,
						blockHash: getHashOfSimulatedBlock(simulationState),
						address: x.address,
						logIndex: BigInt(currentLogIndex + logIndex),
						data: x.data,
						topics: x.topics,
						blockNumber: blockNum,
						transactionIndex: BigInt(index),
						transactionHash: simulatedTransaction.preSimulationTransaction.hash
					}))
					: [],
				logsBloom: 0x0n, //TODO: what should this be?
				status: simulatedTransaction.ethSimulateV1CallResult.status
			}
		}
		currentLogIndex += simulatedTransaction.ethSimulateV1CallResult.status === 'success' ? simulatedTransaction.ethSimulateV1CallResult.logs.length : 0
	}
	return await ethereumClientService.getTransactionReceipt(hash, requestAbortController)
}

export const getSimulatedBalance = async (_ethereumClientService: EthereumClientService, _requestAbortController: AbortController | undefined, _simulationState: SimulationState | undefined, _address: bigint, _blockTag: EthereumBlockTag = 'latest'): Promise<bigint> => {
	throw new Error('eth_getBalance not implemented')
}

const AT_ABI = [{
	"inputs": [
		{
			"internalType": "address",
			"name": "address",
			"type": "address"
		}
	],
	"name": "at",
	"outputs": [
		{
			"internalType": "bytes",
			"name": "",
			"type": "bytes"
		}
	],
	"stateMutability": "nonpayable",
	"type": "function"
}]
export const getSimulatedCode = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, address: bigint, blockTag: EthereumBlockTag = 'latest') => {
	if (simulationState === undefined || await canQueryNodeDirectly(ethereumClientService, requestAbortController, simulationState, blockTag)) {
		return {
			statusCode: 'success',
			getCodeReturn: await ethereumClientService.getCode(address, blockTag, requestAbortController)
		} as const
	}
	const block = await ethereumClientService.getBlock(requestAbortController)
	if (block === null) throw new Error('The latest block is null')

	const input = stringToUint8Array(encodeFunctionData({ abi: AT_ABI, functionName: 'at', args: [addressString(address)] }))

	const getCodeTransaction = {
		type: '1559',
		from: MOCK_ADDRESS,
		chainId: ethereumClientService.getChainId(),
		nonce: await ethereumClientService.getTransactionCount(MOCK_ADDRESS, 'latest', requestAbortController),
		maxFeePerGas: 0n,
		maxPriorityFeePerGas: 0n,
		gas: block.gasLimit,
		to: GET_CODE_CONTRACT,
		value: 0n,
		input: input,
		accessList: []
	} as const
	const multiCall = await simulatedMulticall(ethereumClientService, requestAbortController, simulationState, [getCodeTransaction], block.number, { [addressString(GET_CODE_CONTRACT)]: { code: getCodeByteCode() } }, true)
	const lastBlock = multiCall[multiCall.length - 1]
	if (lastBlock === undefined) throw new Error('last block did not exist in multicall')
	const lastResult = lastBlock.calls[lastBlock.calls.length - 1]
	if (lastResult === undefined) throw new Error('last result did not exist in multicall')
	if (lastResult.status === 'failure') return { statusCode: 'failure' } as const
	const parsed = decodeFunctionResult({ abi: AT_ABI, functionName: 'at', data: dataStringWith0xStart(lastResult.returnData) })
	return {
		statusCode: lastResult.status,
		getCodeReturn: EthereumData.parse(parsed)
	} as const
}

// ported from: https://github.com/ethereum/go-ethereum/blob/509a64ffb9405942396276ae111d06f9bded9221/consensus/misc/eip1559/eip1559.go#L55
const getNextBaseFeePerGas = (parentGasUsed: bigint, parentGasLimit: bigint, parentBaseFeePerGas: bigint) => {
	const parentGasTarget = parentGasLimit / ETHEREUM_EIP1559_ELASTICITY_MULTIPLIER
	if (parentGasUsed === parentGasTarget) return parentBaseFeePerGas
	if (parentGasUsed > parentGasTarget) return parentBaseFeePerGas + max(1n, parentBaseFeePerGas * (parentGasUsed - parentGasTarget) / parentGasTarget / ETHEREUM_EIP1559_BASEFEECHANGEDENOMINATOR)
	return max(0n, parentBaseFeePerGas - parentBaseFeePerGas * (parentGasTarget - parentGasUsed) / parentGasTarget / ETHEREUM_EIP1559_BASEFEECHANGEDENOMINATOR)
}

async function getSimulatedMockBlock(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState) {
	// make a mock block based on the previous block
	const parentBlock = await ethereumClientService.getBlock(requestAbortController)
	if (parentBlock === null) throw new Error('The latest block is null')
	if (parentBlock.baseFeePerGas === undefined) throw new Error(CANNOT_SIMULATE_OFF_LEGACY_BLOCK)
	return {
		author: parentBlock.miner,
		difficulty: parentBlock.difficulty,
		extraData: parentBlock.extraData,
		gasLimit: parentBlock.gasLimit,
		gasUsed: transactionQueueTotalGasLimit(simulationState),
		hash: getHashOfSimulatedBlock(simulationState),
		logsBloom: parentBlock.logsBloom, // TODO: this is wrong
		miner: parentBlock.miner,
		mixHash: parentBlock.mixHash, // TODO: this is wrong
		nonce: parentBlock.nonce,
		number: parentBlock.number + 1n,
		parentHash: parentBlock.hash,
		receiptsRoot: parentBlock.receiptsRoot, // TODO: this is wrong
		sha3Uncles: parentBlock.sha3Uncles, // TODO: this is wrong
		stateRoot: parentBlock.stateRoot, // TODO: this is wrong
		timestamp: new Date(parentBlock.timestamp.getTime() + 12 * 1000), // estimate that the next block is after 12 secs
		size: parentBlock.size, // TODO: this is wrong
		totalDifficulty: (parentBlock.totalDifficulty ?? 0n) + parentBlock.difficulty, // The difficulty increases about the same amount as previously
		uncles: [],
		baseFeePerGas: getNextBaseFeePerGas(parentBlock.gasUsed, parentBlock.gasLimit, parentBlock.baseFeePerGas),
		transactionsRoot: parentBlock.transactionsRoot, // TODO: this is wrong
		transactions: simulationState.simulatedTransactions.map((simulatedTransaction) => simulatedTransaction.preSimulationTransaction),
		withdrawals: [],
		withdrawalsRoot: 0n, // TODO: this is wrong
	} as const
}

export async function getSimulatedBlockByHash(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, blockHash: EthereumBytes32, fullObjects: boolean): Promise<EthereumBlockHeader | EthereumBlockHeaderWithTransactionHashes> {
	if (simulationState !== undefined && getHashOfSimulatedBlock(simulationState) === blockHash) {
		const block = await getSimulatedMockBlock(ethereumClientService, requestAbortController, simulationState)
		if (fullObjects) return block
		return { ...block, transactions: block.transactions.map((transaction) => transaction.hash) }
	}
	return await ethereumClientService.getBlockByHash(blockHash, requestAbortController, fullObjects)
}

export async function getSimulatedBlock(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, blockTag?: EthereumBlockTag, fullObjects?: true): Promise<EthereumBlockHeader>
export async function getSimulatedBlock(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, blockTag: EthereumBlockTag, fullObjects: boolean): Promise<EthereumBlockHeader | EthereumBlockHeaderWithTransactionHashes>
export async function getSimulatedBlock(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, blockTag: EthereumBlockTag, fullObjects: false): Promise<EthereumBlockHeaderWithTransactionHashes>
export async function getSimulatedBlock(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, blockTag: EthereumBlockTag = 'latest', fullObjects = true): Promise<EthereumBlockHeader | EthereumBlockHeaderWithTransactionHashes>  {
	if (simulationState === undefined || await canQueryNodeDirectly(ethereumClientService, requestAbortController, simulationState, blockTag)) {
		return await ethereumClientService.getBlock(requestAbortController, blockTag, fullObjects)
	}
	const block = await getSimulatedMockBlock(ethereumClientService, requestAbortController, simulationState)
	if (fullObjects) return block
	return { ...block, transactions: block.transactions.map((transaction) => transaction.hash) }
}

const getLogsOfSimulatedBlock = (simulationState: SimulationState, logFilter: EthGetLogsRequest): EthGetLogsResponse => {
	const events: EthGetLogsResponse = simulationState?.simulatedTransactions.reduce((acc, sim, transactionIndex) => {
		if (sim.ethSimulateV1CallResult.status === 'failure') return acc
		return [
			...acc,
			...sim.ethSimulateV1CallResult.logs.map((event, logIndex) => ({
				removed: false,
				logIndex: BigInt(acc.length + logIndex),
				transactionIndex: BigInt(transactionIndex),
				transactionHash: sim.preSimulationTransaction.hash,
				blockHash: getHashOfSimulatedBlock(simulationState),
				blockNumber: simulationState.blockNumber,
				address: event.address,
				data: event.data,
				topics: event.topics
			}))
		]
	}, [] as EthGetLogsResponse) || []

	const includeLogByTopic = (logsTopics: readonly bigint[], filtersTopics: readonly (bigint | readonly bigint[] | null)[] | undefined) => {
		if (filtersTopics === undefined || filtersTopics.length === 0) return true
		if (logsTopics.length < filtersTopics.length) return false
		for (const [index, filter] of filtersTopics.entries()) {
			if (filter === null) continue
			if (!Array.isArray(filter) && filter !== logsTopics[index]) return false
			if (Array.isArray(filter) && !filter.includes(logsTopics[index])) return false
		}
		return true
	}

	return events.filter((x) =>
		(logFilter.address === undefined
			|| x.address === logFilter.address
			|| (Array.isArray(logFilter.address) && logFilter.address.includes(x.address))
		)
		&& includeLogByTopic(x.topics, logFilter.topics)
	)
}

export const getSimulatedLogs = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, logFilter: EthGetLogsRequest): Promise<EthGetLogsResponse> => {
	if (simulationState === undefined) return await ethereumClientService.getLogs(logFilter, requestAbortController)
	const toBlock = 'toBlock' in logFilter && logFilter.toBlock !== undefined ? logFilter.toBlock : 'latest'
	const fromBlock = 'fromBlock' in logFilter && logFilter.fromBlock !== undefined ? logFilter.fromBlock : 'latest'
	if (toBlock === 'pending' || fromBlock === 'pending') return await ethereumClientService.getLogs(logFilter, requestAbortController)
	if ((fromBlock === 'latest' && toBlock !== 'latest') || (fromBlock !== 'latest' && toBlock !== 'latest' && fromBlock > toBlock )) throw new Error(`From block '${ fromBlock }' is later than to block '${ toBlock }' `)
	if ('blockHash' in logFilter && logFilter.blockHash === getHashOfSimulatedBlock(simulationState)) return getLogsOfSimulatedBlock(simulationState, logFilter)
	if (simulationState && (toBlock === 'latest' || toBlock >= simulationState.blockNumber)) {
		const logParamsToNode = fromBlock !== 'latest' && fromBlock >= simulationState.blockNumber ? { ...logFilter, fromBlock: simulationState.blockNumber - 1n, toBlock: simulationState.blockNumber - 1n } : { ...logFilter, toBlock: simulationState.blockNumber - 1n }
		return [...await ethereumClientService.getLogs(logParamsToNode, requestAbortController), ...getLogsOfSimulatedBlock(simulationState, logFilter)]
	}
	return await ethereumClientService.getLogs(logFilter, requestAbortController)
}

export const getSimulatedBlockNumber = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined) => {
	if (simulationState !== undefined) return (await ethereumClientService.getBlockNumber(requestAbortController)) + 1n
	return await ethereumClientService.getBlockNumber(requestAbortController)
}

export const getSimulatedTransactionByHash = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, hash: bigint): Promise<EthereumSignedTransactionWithBlockData | null> => {
	// try to see if the transaction is in our queue
	if (simulationState === undefined) return await ethereumClientService.getTransactionByHash(hash, requestAbortController)
	for (const [index, simulatedTransaction] of simulationState.simulatedTransactions.entries()) {
		if (hash === simulatedTransaction.preSimulationTransaction.hash) {
			const v = 'v' in simulatedTransaction.preSimulationTransaction ? simulatedTransaction.preSimulationTransaction.v : (simulatedTransaction.preSimulationTransaction.yParity === 'even' ? 0n : 1n)
			const additionalParams = {
				blockHash: getHashOfSimulatedBlock(simulationState),
				blockNumber: await ethereumClientService.getBlockNumber(requestAbortController),
				transactionIndex: BigInt(index),
				data: simulatedTransaction.preSimulationTransaction.input,
				v : v,
			}
			if ('gasPrice' in simulatedTransaction.preSimulationTransaction) {
				return {
					...simulatedTransaction.preSimulationTransaction,
					...additionalParams,
				}
			}
			return {
				...simulatedTransaction.preSimulationTransaction,
				...additionalParams,
				gasPrice: simulatedTransaction.realizedGasPrice,
			}
		}
	}

	// it was not in the queue, so we can just try to ask the chain for it
	return await ethereumClientService.getTransactionByHash(hash, requestAbortController)
}

export const simulatedCall = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, params: Pick<IUnsignedTransaction1559, 'to' | 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'input' | 'value'> & Partial<Pick<IUnsignedTransaction1559, 'from' | 'gasLimit'>>, blockTag: EthereumBlockTag = 'latest') => {
	const currentBlock = await ethereumClientService.getBlock(requestAbortController)
	if (currentBlock === null) throw new Error('cannot perform call on top of missing block')
	const blockNumToUse = blockTag === 'latest' || blockTag === 'pending' ? currentBlock.number : min(blockTag, currentBlock.number)
	const simulationStateToUse = blockNumToUse >= currentBlock.number ? simulationState : undefined
	const from = params.from ?? DEFAULT_CALL_ADDRESS
	const transaction = {
		...params,
		type: '1559',
		gas: params.gasLimit,
		from,
		nonce: await getSimulatedTransactionCount(ethereumClientService, requestAbortController, simulationStateToUse, from, blockTag),
		chainId: ethereumClientService.getChainId(),
	} as const

	//todo, we can optimize this by leaving nonce out
	const multicallResult = await simulatedMulticall(ethereumClientService, requestAbortController, simulationStateToUse, [{ ...transaction, gas: params.gasLimit === undefined ? currentBlock.gasLimit : params.gasLimit }], blockNumToUse, {}, true)
	const lastBlockResult = multicallResult[multicallResult.length - 1]
	if (lastBlockResult === undefined) throw new Error('failed to get last block in eth simulate')
	const callResult = lastBlockResult.calls[lastBlockResult.calls.length - 1]
	if (callResult === undefined) throw new Error('failed to get last call in eth simulate')
	if (callResult?.status === 'failure') return { error: callResult.error }
	return { result: callResult.returnData }
}

const getSignedMessagesWithFakeSigner = (simulationState: SimulationState | undefined) => {
	return simulationState === undefined ? [] : simulationState.signedMessages.map((x) => ({ fakeSignedFor: x.fakeSignedFor, originalRequestParameters: x.originalRequestParameters }))
}

const simulatedMulticall = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, transactions: EthereumUnsignedTransaction[], blockNumber: bigint, extraAccountOverrides: StateOverrides = {}, simulateOnBlockAboveExistingSimulationStack = false) => {
	const mergedTxs: readonly EthereumUnsignedTransaction[] = getTransactionQueue(simulationState)
	const transactionsInBlocks = simulateOnBlockAboveExistingSimulationStack ? [mergedTxs, transactions] : [mergedTxs.concat(transactions)]
	return await ethereumClientService.simulateTransactionsAndSignatures(transactionsInBlocks, getSignedMessagesWithFakeSigner(simulationState), blockNumber, requestAbortController, { ...simulationState?.stateOverrides, ...extraAccountOverrides })
}

// use time as block hash as that makes it so that updated simulations with different states are different, but requires no additional calculation
const getHashOfSimulatedBlock = (simulationState: SimulationState) => BigInt(simulationState.simulationConductedTimestamp.getTime())

export type SignatureWithFakeSignerAddress = { originalRequestParameters: SignMessageParams, fakeSignedFor: EthereumAddress }
export type MessageHashAndSignature = { signature: string, messageHash: string }

export const isValidMessage = (params: SignMessageParams, signingAddress: EthereumAddress) => {
	try {
		simulatePersonalSign(params, signingAddress)
		return true
	} catch(e) {
		console.error(e)
		return false
	}
}

export const simulatePersonalSign = async (params: SignMessageParams, signingAddress: EthereumAddress) => {
	const privateKey = bytes32String(signingAddress === ADDRESS_FOR_PRIVATE_KEY_ONE ? MOCK_PUBLIC_PRIVATE_KEY : MOCK_SIMULATION_PRIVATE_KEY)
	switch (params.method) {
		case 'eth_signTypedData': throw new Error('No support for eth_signTypedData')
		case 'eth_signTypedData_v1':
		case 'eth_signTypedData_v2':
		case 'eth_signTypedData_v3':
		case 'eth_signTypedData_v4': {
			const messageHash = hashTypedData(params.params[1])
			const signature = await sign({ hash: messageHash, privateKey, to: 'hex' })
			return { signature, messageHash }
		}
		case 'personal_sign': return {
			signature: await signMessage({ message: dataString(stringToUint8Array(params.params[0])), privateKey }),
			messageHash: hashMessage(params.params[0])
		}
		default: assertNever(params)
	}
}

// takes the most recent block that the application is querying and does the calculation based on that
export const getSimulatedFeeHistory = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, request: FeeHistory): Promise<EthGetFeeHistoryResponse> => {
	//const numberOfBlocks = Number(request.params[0]) // number of blocks, not used atm as we just return one block
	const blockTag = request.params[1]
	const rewardPercentiles = request.params[2]
	const currentRealBlockNumber = await ethereumClientService.getBlockNumber(requestAbortController)
	const clampedBlockTag = typeof blockTag === 'bigint' && blockTag > currentRealBlockNumber ? currentRealBlockNumber : blockTag
	const newestBlock = await ethereumClientService.getBlock(requestAbortController, clampedBlockTag, true)
	if (newestBlock === null) throw new Error('The latest block is null')
	const newestBlockBaseFeePerGas = newestBlock.baseFeePerGas
	if (newestBlockBaseFeePerGas === undefined) throw new Error(`base fee per gas is missing for the block (it's too old)`)
	return {
		baseFeePerGas: [newestBlockBaseFeePerGas, getNextBaseFeePerGas(newestBlock.gasUsed, newestBlock.gasLimit, newestBlockBaseFeePerGas)],
		gasUsedRatio: [Number(newestBlock.gasUsed) / Number(newestBlock.gasLimit)],
		oldestBlock: newestBlock.number,
		...rewardPercentiles === undefined ? {} : {
			reward: [rewardPercentiles.map((percentile) => {
				// we are using transaction.gas as a weighting factor while this should be `gasUsed`. Getting `gasUsed` requires getting transaction receipts, which we don't want to be doing
				const effectivePriorityAndGasWeights = newestBlock.transactions.map((tx) => tx.type === '1559' || tx.type === '4844' ?
					{ dataPoint: min(tx.maxPriorityFeePerGas, tx.maxFeePerGas - (newestBlockBaseFeePerGas ?? 0n)), weight: tx.gas }
					: { dataPoint: tx.gasPrice - (newestBlockBaseFeePerGas ?? 0n), weight: tx.gas })

				// we can have negative values here, as The Interceptor creates maxFeePerGas = 0 transactions that are intended to have zero base fee, which is not possible in reality
				const zeroOutNegativeValues = effectivePriorityAndGasWeights.map((point) => modifyObject(point, { dataPoint: max(0n, point.dataPoint) }))
				return calculateWeightedPercentile(zeroOutNegativeValues, BigInt(percentile))
			})]
		}
	}
}
