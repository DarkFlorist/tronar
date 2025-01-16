import { anySignal } from './anySignal.js'

export async function fetchWithTimeout(resource: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number, requestAbortController: AbortController | undefined = undefined) {
	const timeoutAbortController = new AbortController()
	const timeoutId = setTimeout(() => timeoutAbortController.abort(new Error('Fetch request timed out.')), timeoutMs)
	const requestAndTimeoutSignal = requestAbortController === undefined ? timeoutAbortController.signal : anySignal([timeoutAbortController.signal, requestAbortController.signal])
	try {
		if (requestAndTimeoutSignal.aborted) throw requestAndTimeoutSignal.reason
		return await fetch(resource, { ...init, signal: requestAndTimeoutSignal })
	} catch(error: unknown) {
		if (error instanceof DOMException && error.message === 'The user aborted a request.') throw new Error('Fetch request timed out.')
		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}
