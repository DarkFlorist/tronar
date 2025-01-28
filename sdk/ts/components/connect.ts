import { EthereumAddress } from '../types/types.js'
import 'viem/window'

export const requestAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_requestAccounts', params: undefined })
	return reply[0]
}

export const getAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_accounts', params: undefined })
	return reply[0]
}

export function jsonStringify(value: unknown, space?: string | number | undefined): string {
    return JSON.stringify(value, (_, value) => {
		if (typeof value === 'bigint') return `0x${ value.toString(16) }n`
		if (value instanceof Uint8Array) return `b'${ Array.from(value).map(x => x.toString(16).padStart(2, '0')).join('') }'`
		// cast works around https://github.com/uhyo/better-typescript-lib/issues/36
		return value
    }, space)
}

export const connectToWallet = async (onAccountChange: (address: EthereumAddress | undefined) => void, onAccountChangeError: (error: string) => void) => {
	if (window.ethereum === undefined) return onAccountChangeError('no window.ethereum detected')
	window.ethereum.on('accountsChanged', (accounts) => { onAccountChange?.(EthereumAddress.parse(accounts[0])) })
	window.ethereum.on('chainChanged', async () => { console.log('chain changed!') })
	const fetchedAccount = await getAccounts()
	if (fetchedAccount) {
		onAccountChange?.(EthereumAddress.parse(fetchedAccount))
	} else {
		onAccountChange(undefined)
	}
}
