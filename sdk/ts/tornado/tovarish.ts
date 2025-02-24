import { fetchWithTimeout } from '../testsuite/simulator/utils/requests.js'
import { TovarishQueryInput, TovarishQueryOutput } from '../types/tovarishTypes.js'
import { serialize } from '../utils/utils.js'

export const queryTovarish = async (url: string, request: TovarishQueryInput, requestId: number, timeoutMs: number, requestAbortController: AbortController | undefined = undefined) => {
	const serialized = serialize(TovarishQueryInput, request)
	const payload = {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: requestId, ...serialized })
	}
	const response = await fetchWithTimeout(url, payload, timeoutMs, requestAbortController)
	const responseObject = response.ok ? { responseState: 'success' as const, response: TovarishQueryOutput.parse(await response.json()) } : { responseState: 'failed' as const }
	return responseObject
}
