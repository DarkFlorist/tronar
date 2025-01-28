import { useSignal } from '@preact/signals'
import { useOptionalSignal } from '../utils/OptionalSignal.js'
import 'viem/window'
import { connectToWallet } from '@tronar/components/connect.js'
import { GovernanceVote, GovernanceVotes, Proposal, ProposalEvent, ProposalEvents, Proposals } from '@tronar/types/types.js'
import { getProposalEvents, getProposals, getGovernanceListVotes } from '@tronar/governance.js'
import { createReadClient } from '@tronar/wallet.js'

export type AccountAddress = `0x${ string }`

interface WalletComponentProps {
	onAccountChange: (address: AccountAddress | undefined) => void
	onError: (error: string | undefined) => void
}

const WalletComponent = ({ onAccountChange }: WalletComponentProps) => {
	const loadingAccount = useSignal<boolean>(false)
	const error = useSignal<string | undefined>(undefined)
	const maybeAccountAddress = useOptionalSignal<AccountAddress>(undefined)

	const onAccountChangeCallBack = (address: AccountAddress | undefined) => {
		if (address !== maybeAccountAddress.deepValue) onAccountChange(address)
		loadingAccount.value = false
	}
	const onAccountChangeError = (reason: string) => {
		error.value = reason
		loadingAccount.value = false
	}

	const connect = async () => {
		loadingAccount.value = true
		await connectToWallet(onAccountChangeCallBack, onAccountChangeError)
	}

	if (error.value !== undefined) return <p class = 'paragraph'> { error.value }</p>
	if (loadingAccount.value) return <></>

	return maybeAccountAddress.value !== undefined ? (
		<p style = 'color: gray; justify-self: right;'>{ `Connected with ${ maybeAccountAddress.value }` }</p>
	) : (
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { connect }>
			{ `Connect wallet` }
		</button>
	)
}

const ProposalEvents = () => {
	const proposalEvents = useSignal<ProposalEvents>(false)

	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = client.getBlockNumber()
		proposalEvents.value = await getProposalEvents(client, blockNum)
	}

	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `getProposalEvents` }
		</button>
		<title>ProposalEvents</title>
		<table>
			<tr>
				<th>Block Number</th>
				<th>Proposal ID</th>
				<th>Proposer</th>
				<th>Description</th>
				<th>Start Time</th>
				<th>End Time</th>
				<th>Target</th>
			</tr>
			{ proposalEvents.value.map((proposal: ProposalEvent) => <tr>
				<td>{ proposal.blockNumber }</td>
				<td>{ proposal.proposalId }</td>
				<td>{ proposal.proposer }</td>
				<td>{ proposal.description }</td>
				<td>{ proposal.startTime }</td>
				<td>{ proposal.endTime }</td>
				<td>{ proposal.target }</td>
			</tr>) }
		</table>
	</div>
}

const Proposals = () => {
	const proposals = useSignal<Proposals>(false)

	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = client.getBlockNumber()
		proposals.value = await getProposals(client, blockNum)
	}

	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `getProposals` }
		</button>
		<title>Proposals</title>
		<table>
			<tr>
				<th>Proposer</th>
				<th>Target</th>
				<th>Start Time</th>
				<th>End Time</th>
				<th>For Votes</th>
				<th>Against Votes</th>
				<th>Executed</th>
				<th>Extended</th>
			</tr>
			{ proposals.value.map((proposal: Proposal) => <tr>
				<td>{ proposal.proposer }</td>
				<td>{ proposal.target }</td>
				<td>{ proposal.startTime }</td>
				<td>{ proposal.endTime }</td>
				<td>{ proposal.forVotes }</td>
				<td>{ proposal.againstVotes }</td>
				<td>{ proposal.executed }</td>
				<td>{ proposal.extended }</td>
			</tr>) }
		</table>
	</div>
}

const Votes = () => {
	const votes = useSignal<GovernanceVotes>(false)
	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = client.getBlockNumber()
		votes.value = await getGovernanceListVotes(client, blockNum)
	}
	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `getGovernanceListVotes` }
		</button>
		<title>Votes</title>
		<table>
			<tr>
				<th>Block Number</th>
				<th>Proposal ID</th>
				<th>Voter</th>
				<th>Support</th>
				<th>Votes</th>
				<th>Transaction Hash</th>
			</tr>
			{ votes.value.map((vote: GovernanceVote) => <tr>
				<td>{ vote.blockNumber }</td>
				<td>{ vote.proposalId }</td>
				<td>{ vote.voter }</td>
				<td>{ vote.support }</td>
				<td>{ vote.votes }</td>
				<td>{ vote.transactionHash }</td>
			</tr>) }
		</table>
	</div>
}

export function App() {
	const handleAccountChange = (address: AccountAddress | undefined) => {
		console.log('Account changed:', address)
	}

	const handleError = (error: string | undefined) => {
		console.error('Error:', error)
	}

	return <main style = 'overflow: auto;'>
		<WalletComponent onAccountChange = { handleAccountChange } onError = { handleError } />
		<ProposalEvents/>
		<Proposals/>
		<Votes/>
	</main>
}
