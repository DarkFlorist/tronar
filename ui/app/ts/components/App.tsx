import { useSignal } from '@preact/signals'
import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import 'viem/window'
import { bytes32String, connectToWallet, createReadClient, createWriteClient, EthereumAddress, EthereumQuantity, getOwnTornBalance, getProposalEvents, governanceCastVote, governanceCreateProposal, governanceGetProposalCount, governanceListProposals, governanceListVotes, governanceLockWithApproval, governanceUnLockStake, GovernanceVote, GovernanceVotes, Proposal, ProposalEvent, ProposalEvents, Proposals, WriteClient } from 'tronar'

export type AccountAddress = `0x${ string }`

interface ConnectWalletButtonProps {
	onAccountChange: (address: EthereumAddress | undefined) => void
	onError: (error: string | undefined) => void
}

interface WalletProps {
	writeClient: OptionalSignal<WriteClient>
}

const ConnectWalletButton = ({ onAccountChange }: ConnectWalletButtonProps) => {
	const loadingAccount = useSignal<boolean>(false)
	const error = useSignal<string | undefined>(undefined)
	const maybeAccountAddress = useOptionalSignal<EthereumAddress>(undefined)

	const onAccountChangeCallBack = (address: EthereumAddress | undefined) => {
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

	return <button class = 'button is-primary' style = 'justify-self: right;' onClick = { connect }>
		{ `Connect wallet` }
	</button>
}

const ProposalEventsComponent = () => {
	const proposalEvents = useSignal<ProposalEvents>([])

	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = await client.getBlockNumber()
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

const ProposalsComponent = () => {
	const proposals = useSignal<Proposals>([])

	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const proposalCount = await governanceGetProposalCount(client)
		proposals.value = await governanceListProposals(client, proposalCount)
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
				<td>{ proposal.executed ? 'true' : 'false' }</td>
				<td>{ proposal.extended ? 'true' : 'false' }</td>
			</tr>) }
		</table>
	</div>
}

const Votes = () => {
	const votes = useSignal<GovernanceVotes>([])
	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = await client.getBlockNumber()
		votes.value = await governanceListVotes(client, blockNum)
	}
	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `governanceListVotes` }
		</button>
		<title>Votes</title>
		<table>
			<tr>
				<th>Block Number</th>
				<th>Proposal ID</th>
				<th>Voter</th>
				<th>Support</th>
				<th>Votes</th>
				<th>Contact</th>
				<th>Message</th>
				<th>Transaction Hash</th>
			</tr>
			{ votes.value.map((vote: GovernanceVote) => <tr>
				<td>{ vote.blockNumber }</td>
				<td>{ vote.proposalId }</td>
				<td>{ vote.voter }</td>
				<td>{ vote.support ? 'true' : 'false' }</td>
				<td>{ vote.comment ? vote.comment.contact : '-' }</td>
				<td>{ vote.comment ? vote.comment.message : '-' }</td>
				<td>{ vote.votes }</td>
				<td>{ bytes32String(vote.transactionHash) }</td>
			</tr>) }
		</table>
	</div>
}

const Balance = () => {
	const balance = useSignal<EthereumQuantity | undefined>(undefined)
	const fetchBalance = async () => {
		const client = createReadClient(window.ethereum)
		balance.value = await getOwnTornBalance(client)
	}
	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchBalance }>
			{ `getGovernanceListVotes` }
		</button>
		<title>Torn Balance</title>
		<table>
			<tr>
				<th>Balance</th>
			</tr>
			<tr>
				<td>{ Balance }</td>
			</tr>
		</table>
	</div>
}

const CreateProposal = ({ writeClient }: WalletProps) => {
	const target = useSignal<string>('')
	const description = useSignal<string>('')

	const createProposal = async () => {
		if (writeClient.deepValue === undefined) return
		const targetAddr = EthereumAddress.safeParse(target.value)
		if (!targetAddr.success) return
		await governanceCreateProposal(writeClient.deepValue, targetAddr.value, description.value)
	}

	return <div>
		<title>Create proposal</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label' >Target Address</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '0x...'
				value = { target.value }
				onInput = { (e) => target.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label'>Description</label>
			<textarea
				class = 'textarea'
				placeholder = 'Proposal description'
				value = { description.value }
				onInput = { (e) => description.value = (e.target as HTMLTextAreaElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = { createProposal }
		>
			{ `Create Proposal` }
		</button>
	</div>
}

const LockTornWithApproval = ({ writeClient }: WalletProps) => {
	const tornToUse = useSignal<string>('')

	const LockTorn = async () => {
		if (writeClient.deepValue === undefined) return
		const tornBigInt = EthereumQuantity.safeParse(tornToUse.value)
		if (!tornBigInt.success) return
		await governanceLockWithApproval(writeClient.deepValue, tornBigInt.value)
	}

	return <div>
		<title>Lock Torn</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label' >Torn To use</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '0x...'
				value = { tornToUse.value }
				onInput = { (e) => tornToUse.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = { LockTorn }
		>
			{ `Lock Torn` }
		</button>
	</div>
}

const UnLockStake = ({ writeClient }: WalletProps) => {
	const tornToUse = useSignal<string>('0')

	const LockTorn = async () => {
		if (writeClient.deepValue === undefined) return
		const tornBigInt = EthereumQuantity.safeParse(tornToUse.value)
		if (!tornBigInt.success) return
		await governanceUnLockStake(writeClient.deepValue, tornBigInt.value)
	}

	return <div>
		<title>Unlock Torn</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label' >Unlock torn</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '0x...'
				value = { tornToUse.value }
				onInput = { (e) => tornToUse.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = { LockTorn }
		>
			{ `UnLock Torn` }
		</button>
	</div>
}

const CastVote = ({ writeClient }: WalletProps) => {
	const proposalId = useSignal<string>('0')
	const support = useSignal<boolean>(false)
	const contact = useSignal<string>('')
	const message = useSignal<string>('')

	const vote = async () => {
		const parsedProposalId = EthereumQuantity.safeParse(proposalId)
		if (!parsedProposalId.success) return
		if (writeClient.deepValue === undefined) return
		const contactS = contact.value
		const messageS = message.value
		await governanceCastVote(writeClient.deepValue, parsedProposalId.value, support.value, contactS.length || messageS.length ? { contact: contactS, message: messageS } : undefined)
	}

	return <div>
		<title>Cast vote</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label'>Proposal ID</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '1.'
				value = { proposalId.value }
				onInput = {(e) => proposalId.value = (e.target as HTMLInputElement).value}
			/>
		</div>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label'>Support</label>
			<select
				class = 'select'
				value = { support.value ? 'yes' : 'no' }
				onInput = { (e) => support.value = (e.target as HTMLSelectElement).value === 'yes' }
			>
				<option value = 'yes'>Yes</option>
				<option value = 'no'>No</option>
			</select>
		</div>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label'>Contact</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = ''
				value = { contact.value }
				onInput = { (e) => contact.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label'>message</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = ''
				value = { message.value }
				onInput = { (e) => message.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = {vote}
		>
			{`Vote`}
		</button>
	</div>
}

export function App() {
	const writeClient = useOptionalSignal<WriteClient>(undefined)
	const handleAccountChange = (address: EthereumAddress | undefined) => {
		if (address !== undefined) {
			writeClient.deepValue = createWriteClient(window.ethereum, address)
		} else {
			writeClient.deepValue = undefined
		}
		console.log('Account changed:', address)
	}

	const handleError = (error: string | undefined) => {
		console.error('Error:', error)
	}

	return <main style = 'overflow: auto;'>
		<p>{ writeClient.deepValue?.account.address } </p>
		<ConnectWalletButton onAccountChange = { handleAccountChange } onError = { handleError } />
		<ProposalEventsComponent/>
		<ProposalsComponent/>
		<Votes/>
		<LockTornWithApproval writeClient = { writeClient }/>
		<UnLockStake writeClient = { writeClient }/>
		<CreateProposal writeClient = { writeClient }/>
		<CastVote writeClient = { writeClient }/>
	</main>
}
