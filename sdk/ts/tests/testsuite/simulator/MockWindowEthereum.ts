import { EIP1193Provider } from 'viem'
import { CANNOT_SIMULATE_OFF_LEGACY_BLOCK, DEFAULT_CALL_ADDRESS } from './constants.js'
import { EthereumClientService } from './EthereumClientService.js'
import { EthCallParams, EthereumJsonRpcRequest, EthGetLogsRequest, EthGetLogsResponse, SendTransactionParams } from './JsonRpc-types.js'
import { appendTransaction, getInputFieldFromDataOrInput, getSimulatedBlockNumber, getSimulatedLogs, getSimulatedTransactionByHash, getSimulatedTransactionCountOverStack, mockSignTransaction, simulatedCall, simulateEstimateGas } from './SimulationModeEthereumClientService.js'
import { SimulationState } from './visualizer-types.js'
import { StateOverrides } from './ethSimulate-types.js'
import { EthereumJSONRpcRequestHandler } from './EthereumJSONRpcRequestHandler.js'
import { EthereumBytes32, EthereumData, EthereumQuantity, EthereumSignedTransactionWithBlockData } from '../wire-types.js'
import { JsonRpcResponseError, printError } from './errors.js'
import * as funtypes from 'funtypes'

async function singleCallWithFromOverride(ethereumClientService: EthereumClientService, simulationState: SimulationState | undefined, request: EthCallParams, from: bigint) {
	const callParams = request.params[0]
	const blockTag = request.params.length > 1 ? request.params[1] : 'latest' as const
	const gasPrice = callParams.gasPrice !== undefined ? callParams.gasPrice : 0n
	const value = callParams.value !== undefined ? callParams.value : 0n

	const callTransaction = {
		type: '1559' as const,
		from,
		chainId: ethereumClientService.getChainId(),
		nonce: await getSimulatedTransactionCountOverStack(ethereumClientService, undefined, simulationState, from),
		maxFeePerGas: gasPrice,
		maxPriorityFeePerGas: 0n,
		to: callParams.to === undefined ? null : callParams.to,
		value,
		input: getInputFieldFromDataOrInput(callParams),
		accessList: [],
	}

	return await simulatedCall(ethereumClientService, undefined, simulationState, callTransaction, blockTag)
}

export async function call(ethereumClientService: EthereumClientService, simulationState: SimulationState | undefined, request: EthCallParams) {
	const callParams = request.params[0]
	const from = callParams.from !== undefined ? callParams.from : DEFAULT_CALL_ADDRESS
	const callResult = await singleCallWithFromOverride(ethereumClientService, simulationState, request, from)
	return { type: 'result' as const, method: request.method, ...callResult }
}

export async function binarySearchLogs(ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, logFilter: EthGetLogsRequest): Promise<EthGetLogsResponse> {
	const getLastBlock = async () => {
		if ('toBlock' in logFilter) {
			if (typeof logFilter.toBlock === 'bigint') return logFilter.toBlock
			if (logFilter.toBlock === 'latest') return await getSimulatedBlockNumber(ethereumClientService, requestAbortController, simulationState)
		}
		return await getSimulatedBlockNumber(ethereumClientService, requestAbortController, simulationState)
	}

	const logsSoFar: EthGetLogsResponse[] = []

	const fetchLogs = async (fromBlock: bigint, toBlock: bigint): Promise<void> => {
		console.log(`getting logs: ${ fromBlock } -> ${ toBlock }`)
		if (toBlock < fromBlock) return
		try {
			const result = await getSimulatedLogs(ethereumClientService, undefined, simulationState, { ...logFilter, fromBlock, toBlock })
			logsSoFar.push(result)
			console.log(`got logs: ${ fromBlock } -> ${ toBlock }: ${ result.length }. Have ${logsSoFar.flat().length} logs so far`)
		} catch (error: unknown) {
			if (error instanceof JsonRpcResponseError) {
				const midBlock = fromBlock + ((toBlock - fromBlock) / 2n)
				await fetchLogs(fromBlock, midBlock)
				await fetchLogs(midBlock + 1n, toBlock)
			} else {
				throw error
			}
		}
	}

	const lastBlock = await getLastBlock()
	const firstBlock = 'fromBlock' in logFilter && typeof logFilter.fromBlock === 'bigint' ? logFilter.fromBlock : 0n
	await fetchLogs(firstBlock, lastBlock)
	console.log(`got logs: ${logsSoFar.flat().length}`)
	return logsSoFar.flat()
}

export const formEthSendTransaction = async (ethereumClientService: EthereumClientService, requestAbortController: AbortController | undefined, simulationState: SimulationState | undefined, blockDelta: number, activeAddress: bigint | undefined, sendTransactionParams: SendTransactionParams) => {
	const parentBlockPromise = ethereumClientService.getBlock(requestAbortController) // we are getting the real block here, as we are not interested in the current block where this is going to be included, but the parent
	const transactionDetails = sendTransactionParams.params[0]
	if (activeAddress === undefined) throw new Error('Access to active address is denied')
	const from = transactionDetails.from !== undefined ? transactionDetails.from : activeAddress
	const transactionCountPromise = getSimulatedTransactionCountOverStack(ethereumClientService, requestAbortController, simulationState, from)
	const parentBlock = await parentBlockPromise
	if (parentBlock === null) throw new Error('The latest block is null')
	if (parentBlock.baseFeePerGas === undefined) throw new Error(CANNOT_SIMULATE_OFF_LEGACY_BLOCK)
	const maxPriorityFeePerGas = transactionDetails.maxPriorityFeePerGas !== undefined && transactionDetails.maxPriorityFeePerGas !== null ? transactionDetails.maxPriorityFeePerGas : 10n**8n // 0.1 nanoEth/gas
	const transactionWithoutGas = {
		type: '1559' as const,
		from,
		chainId: ethereumClientService.getChainId(),
		nonce: await transactionCountPromise,
		maxFeePerGas: transactionDetails.maxFeePerGas !== undefined && transactionDetails.maxFeePerGas !== null ? transactionDetails.maxFeePerGas : parentBlock.baseFeePerGas * 2n + maxPriorityFeePerGas,
		maxPriorityFeePerGas,
		to: transactionDetails.to === undefined ? null : transactionDetails.to,
		value: transactionDetails.value !== undefined  ? transactionDetails.value : 0n,
		input: getInputFieldFromDataOrInput(transactionDetails),
		accessList: [],
	} as const
	const extraParams = {
		originalRequestParameters: sendTransactionParams,
		error: undefined,
	}
	if (transactionDetails.gas === undefined) {
		try {
			const estimateGas = await simulateEstimateGas(ethereumClientService, requestAbortController, simulationState, transactionWithoutGas, blockDelta)
			if ('error' in estimateGas) return { ...extraParams, ...estimateGas, success: false } as const
			return { transaction: { ...transactionWithoutGas, gas: estimateGas.gas }, ...extraParams, success: true } as const
		} catch(error: unknown) {
			if (error instanceof JsonRpcResponseError) return { ...extraParams, error: { code: error.code, message: error.message, data: typeof error.data === 'string' ? error.data : '0x' }, success: false } as const
			printError(error)
			if (error instanceof Error) return { ...extraParams, error: { code: 123456, message: error.message, data: 'data' in error && typeof error.data === 'string' ? error.data : '0x' }, success: false } as const
			return { ...extraParams, error: { code: 123456, message: 'Unknown Error', data: '0x' }, success: false } as const
		}
	}
	return { transaction: { ...transactionWithoutGas, gas: transactionDetails.gas }, ...extraParams, success: true } as const
}

export type MockWindowEthereum = EIP1193Provider & {
	addStateOverrides: (stateOverrides: StateOverrides) => Promise<void>
	advanceTime: (amountInSeconds: EthereumQuantity) => Promise<void>
}
export const getMockedEthSimulateWindowEthereum = (): MockWindowEthereum => {
	const httpsRpc = 'https://ethereum.dark.florist'
	const ethereumClientService = new EthereumClientService(
		new EthereumJSONRpcRequestHandler(httpsRpc, false),
		async () => {},
		async () => {},
		{ name: 'Ethereum', chainId: 1n, httpsRpc }
	)
	let simulationState: SimulationState | undefined = undefined
	const activeAddress = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045n

	return {
		request: async (unknownArgs: unknown): Promise<any> => {
			const args = EthereumJsonRpcRequest.parse(unknownArgs)
			switch(args.method) {
				case 'eth_call': {
					const result = await call(ethereumClientService, simulationState, args)
					if (result.error !== undefined) throw new Error(result.error.message)
					return EthereumData.serialize(result.result)
				}
				case 'eth_getLogs': {
					const result = await binarySearchLogs(ethereumClientService, undefined, simulationState, args.params[0])
					return EthGetLogsResponse.serialize(result)
				}
				case 'eth_getTransactionByHash': {
					const result = await getSimulatedTransactionByHash(ethereumClientService, undefined, simulationState, args.params[0])
					return funtypes.Union(EthereumSignedTransactionWithBlockData, funtypes.Null).serialize(result)
				}
				case 'eth_chainId': {
					const result = ethereumClientService.getChainId()
					return EthereumQuantity.serialize(result)
				}
				case 'eth_sendTransaction': {
					//TODO, only one transaction should be included at once
					const blockDelta = simulationState?.blocks.length || 0 // always create new block to add transactions to
					const transaction = await formEthSendTransaction(ethereumClientService, undefined, simulationState, blockDelta, activeAddress, args)
					if (transaction.success === false) throw new Error(transaction.error?.message)
					const signed = mockSignTransaction(transaction.transaction)
					simulationState = await appendTransaction(ethereumClientService, undefined, simulationState, [transaction.transaction], blockDelta)
					return EthereumBytes32.serialize(signed.hash)
				}
				default: {
					console.log(args)
					throw new ErrorEvent(`unknown method: ${ args.method }`)
				}
			}
		},
		on: () => {
			console.log('on called')
		},
		removeListener: () => {
			console.log('removeListener')
		},
		addStateOverrides: async (stateOverrides: StateOverrides) => {
			const newBlock = { simulatedTransactions: [], signedMessages: [], stateOverrides, timeIncreaseDelta: 12n }
			if (simulationState === undefined) {
				simulationState = {
					blocks: [newBlock],
					blockNumber: await ethereumClientService.getBlockNumber(undefined),
					blockTimestamp: new Date(),
					simulationConductedTimestamp: new Date(),
					baseFeePerGas: 0n,
				}
			} else {
				simulationState = { ...simulationState, blocks: [...simulationState.blocks, newBlock] }
			}
		},
		advanceTime: async (amountInSeconds: EthereumQuantity) => {
			const newBlock = { simulatedTransactions: [], signedMessages: [], stateOverrides: {}, timeIncreaseDelta: amountInSeconds }
			if (simulationState === undefined) {
				simulationState = {
					blocks: [newBlock],
					blockNumber: await ethereumClientService.getBlockNumber(undefined),
					blockTimestamp: new Date(),
					simulationConductedTimestamp: new Date(),
					baseFeePerGas: 0n,
				}
			} else {
				simulationState = { ...simulationState, blocks: [...simulationState.blocks, newBlock] }
			}
		}
	}
}
