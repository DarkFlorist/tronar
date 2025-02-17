import { ReadClient } from '../utils/wallet.js'

export const getTimestamp = async(client: ReadClient) => {
	return (await client.getBlock()).timestamp
}
