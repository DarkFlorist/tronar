import * as funtypes from 'funtypes'
import { serialize } from '../types/wire-types.js'
import { EthereumJsonRpcRequest } from '../types/jsonRpcTypes.js'
import { JsonRpcResponseError } from '../utils/errors.js'

type JsonRpcSuccessResponse = funtypes.Static<typeof JsonRpcSuccessResponse>
const JsonRpcSuccessResponse = funtypes.ReadonlyObject({
	jsonrpc: funtypes.Literal('2.0'),
	id: funtypes.Union(funtypes.String, funtypes.Number),
	result: funtypes.Unknown,
}).asReadonly()

export type JsonRpcErrorResponse = funtypes.Static<typeof JsonRpcErrorResponse>
export const JsonRpcErrorResponse = funtypes.ReadonlyObject({
	jsonrpc: funtypes.Literal('2.0'),
	id: funtypes.Union(funtypes.String, funtypes.Number),
	error: funtypes.ReadonlyObject({
		code: funtypes.Number,
		message: funtypes.String,
		data: funtypes.Unknown,
	}).asReadonly(),
}).asReadonly()

export type JsonRpcResponse = funtypes.Static<typeof JsonRpcResponse>
export const JsonRpcResponse = funtypes.Union(JsonRpcErrorResponse, JsonRpcSuccessResponse)

export const jsonRpcRequest = async (url: string, rpcRequest: EthereumJsonRpcRequest) => {
	const serialized = serialize(EthereumJsonRpcRequest, rpcRequest)
	const payload = {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...serialized })
	}
	const response = await fetch(url, payload)
	const responseObject = response.ok ? { responseState: 'success' as const, response: await response.json() } : { responseState: 'failed' as const, response }
	if (responseObject.responseState === 'failed') {
		throw new Error(`Query to RPC server failed with error code: ${ responseObject.response.status } while quering for ${ rpcRequest.method }.`)
	}
	const jsonRpcResponse = JsonRpcResponse.parse(responseObject.response)
	if ('error' in jsonRpcResponse) throw new JsonRpcResponseError(jsonRpcResponse)
	return jsonRpcResponse.result
}
