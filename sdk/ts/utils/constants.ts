export const CONTRACTS = {
	'mainnet': {
		'pools': {
			'pool0.1ETH': 0x12d66f87a04a9e220743712ce6d9bb1b5616b8fcn,
			'pool1ETH': 0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936n,
			'pool10ETH': 0x910cbd523d972eb0a6f4cae4618ad62622b39dbfn,
			'pool100ETH': 0xa160cdab225685da1d56aa342ad8841c3b53f291n,
			'pool100DAI': 0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3n,
			'pool1000DAI': 0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144n,
			'pool10000DAI': 0x07687e702b410Fa43f4cB4Af7FA097918ffD2730n,
			'pool100000DAI': 0x23773E65ed146A459791799d01336DB287f25334n,
			'pool5000cDAI': 0x22aaA7720ddd5388A3c0A3333430953C68f1849bn,
			'pool50000cDAI': 0x03893a7c7463AE47D46bc7f091665f1893656003n,
			'pool500000cDAI': 0x2717c5e28cf931547B621a5dddb772Ab6A35B701n,
			'pool5000000cDAI': 0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Afn,
			'pool100USDC': 0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9Dn,
			'pool1,000USDC': 0xd96f2B1c14Db8458374d9Aca76E26c3D18364307n,
			'pool100USDT': 0x169AD27A470D064DEDE56a2D3ff727986b15D52Bn,
			'pool1,000USDT': 0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872fn,
			'pool0.1WBTC': 0x178169B423a011fff22B9e3F3abeA13414dDD0F1n,
			'pool1WBTC': 0x610B717796ad172B316836AC95a2ffad065CeaB4n,
			'pool10WBTC': 0xbB93e510BbCD0B7beb5A853875f9eC60275CF498n,
		},
		'governance': {
			'Governance Contract': 0x5efda50f22d34f262c29268506c5fa42cb56a1cen,
			'Governance Vault (for locked TORN)': 0x2f50508a8a3d323b91336fa3ea6ae50e55f32185n,
			'Deployer Contract': 0xCEe71753C9820f063b38FDbE4cFDAf1d3D928A80n,
			'Governance Impl': 0xffbac21a641dcfe4552920138d90f3638b3c9fban,
			'Governance Vesting': 0x179f48c78f57a3a78f0608cc9197b8972921d1d2n,
			'Community Fund': 0xb04E030140b30C27bcdfaafFFA98C57d80eDa7B4n,
			'TORN Token': 0x77777feddddffc19ff86db637967013e6c6a116cn,
			'Voucher TORN Token': 0x3efa30704d2b8bbac821307230376556cf8cc39en,
			'Mining v2': 0x746aebc06d2ae31b71ac51429a19d54e797878e9n,
		},
		'relayerRegistry': {
			'Tornado Router': 0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31bn,
			'Proxy of feeManagerContract': 0x5f6c97C6AD7bdd0AE7E0Dd4ca33A4ED3fDabD4D7n,
			'FeeManager': 0xf4B067dD14e95Bab89Be928c07Cb22E3c94E0DAAn,
			'Proxy of relayerRegistryContract': 0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2n,
			'RelayerRegistry': 0x01e2919679362dFBC9ee1644Ba9C6da6D6245BB1n,
			'Proxy of stakingContract': 0x2FC93484614a34f26F7970CBB94615bA109BB4bfn,
			'TornadoStakingRewards': 0x26903a5a198D571422b2b4EA08b56a37cbD68c89n,
			'Proxy of instanceRegistryContract': 0xB20c66C4DE72433F3cE747b58B86830c459CA911n,
			'InstanceRegistry': 0x2573BAc39EBe2901B4389CD468F2872cF7767FAFn,
		},
		'other': {
			'Tornado.Cash Trees': 0x527653ea119f3e6a1f5bd18fbf4714081d7b31cen,
			'Tree Update Verifier': 0x653477c392c16b0765603074f157314cc4f40c32n,
			'Reward Verifier': 0x88fd245fedec4a936e700f9173454d1931b4c307n,
			'Withdraw Verifier': 0x09193888b3f38c82dedfda55259a82c0e7de875en,
			'Reward Swap': 0x5cab7692d4e94096462119ab7bf57319726eed2an,
			'Echoer': 0x756c4628e57f7e7f8a459ec2752968360cf4d1aan,
			'Proxy': 0x722122df12d4e14e13ac3b6895a86e84145b6967n,
			'Mixer 1': 0x94a1b5cdb22c43faab4abeb5c74999895464ddafn,
			'Mixer 2':0xb541fc07bc7619fd4062a54d96268525cbc6ffefn,
			'Poseidon 2': 0x94c92f096437ab9958fc0a37f09348f30389ae79n,
			'Poseidon 3': 0xd82ed8786d7c69dc7e052f7a542ab047971e73d2n,
			'Gitcoin Grants': 0xdd4c48c0b24039969fc16d1cdf626eab821d3384n,
		}
	}
} as const
/*
* Arbitrum

 Contract Address
 -------- --------------------------------------------------------------------------------------------------------------------
 0.1 ETH [0x84443CFd09A48AF6eF360C6976C5392aC5023a1F](https://arbiscan.io/address/0x84443CFd09A48AF6eF360C6976C5392aC5023a1F)
 1 ETH [0xd47438C816c9E7f2E2888E060936a499Af9582b3](https://arbiscan.io/address/0xd47438C816c9E7f2E2888E060936a499Af9582b3)
 10 ETH [0x330bdFADE01eE9bF63C209Ee33102DD334618e0a](https://arbiscan.io/address/0x330bdFADE01eE9bF63C209Ee33102DD334618e0a)
 100 ETH [0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD](https://arbiscan.io/address/0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD)

* Optimism

 Contract Address
 -------- --------------------------------------------------------------------------------------------------------------------------------
 0.1 ETH [0x84443CFd09A48AF6eF360C6976C5392aC5023a1F](https://optimistic.etherscan.io/address/0x84443CFd09A48AF6eF360C6976C5392aC5023a1F)
 1 ETH [0xd47438C816c9E7f2E2888E060936a499Af9582b3](https://optimistic.etherscan.io/address/0xd47438C816c9E7f2E2888E060936a499Af9582b3)
 10 ETH [0x330bdFADE01eE9bF63C209Ee33102DD334618e0a](https://optimistic.etherscan.io/address/0x330bdFADE01eE9bF63C209Ee33102DD334618e0a)
 100 ETH [0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD](https://optimistic.etherscan.io/address/0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD)

* BSC

 Contract Address
 -------- --------------------------------------------------------------------------------------------------------------------
 0.1 BNB [0x84443CFd09A48AF6eF360C6976C5392aC5023a1F](https://bscscan.com/address/0x84443CFd09A48AF6eF360C6976C5392aC5023a1F)
 1 BNB [0xd47438C816c9E7f2E2888E060936a499Af9582b3](https://bscscan.com/address/0xd47438C816c9E7f2E2888E060936a499Af9582b3)
 10 BNB [0x330bdFADE01eE9bF63C209Ee33102DD334618e0a](https://bscscan.com/address/0x330bdFADE01eE9bF63C209Ee33102DD334618e0a)
 100 BNB [0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD](https://bscscan.com/address/0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD)

* xDAI

 Contract Address
 ------------ -------------------------------------------------------------------------------------------------------------------------------------------------
 100 xDAI [0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD](https://blockscout.com/xdai/mainnet/address/0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD/transactions)
 1,000 xDAI [0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178](https://blockscout.com/xdai/mainnet/address/0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178/transactions)
 10,000 xDAI [0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040](https://blockscout.com/xdai/mainnet/address/0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040/transactions)
 100,000 xDAI [0xa5C2254e4253490C54cef0a4347fddb8f75A4998](https://blockscout.com/xdai/mainnet/address/0xa5C2254e4253490C54cef0a4347fddb8f75A4998/transactions)

* MATIC

 Contract Address
 ------------- ------------------------------------------------------------------------------------------------------------------------
 100 MATIC [0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD](https://polygonscan.com/address/0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD)
 1,000 MATIC [0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178](https://polygonscan.com/address/0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178)
 10,000 MATIC [0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040](https://polygonscan.com/address/0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040)
 100,000 MATIC [0xa5C2254e4253490C54cef0a4347fddb8f75A4998](https://polygonscan.com/address/0xa5C2254e4253490C54cef0a4347fddb8f75A4998)

* AVAX

 Contract Address
 -------- ---------------------------------------------------------------------------------------------------------------------
 10 AVAX [0x330bdFADE01eE9bF63C209Ee33102DD334618e0a](https://snowtrace.io/address/0x330bdFADE01eE9bF63C209Ee33102DD334618e0a)
 100 AVAX [0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD](https://snowtrace.io/address/0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD)
 500 AVAX [0xaf8d1839c3c67cf571aa74B5c12398d4901147B3](https://snowtrace.io/address/0xaf8d1839c3c67cf571aa74B5c12398d4901147B3)

* Goerli

 Contract Address
 -------------- ----------------------------------------------------------------------------------------------------------------------------
 0.1 ETH [0x6Bf694a291DF3FeC1f7e69701E3ab6c592435Ae7](https://goerli.etherscan.io/address/0x6Bf694a291DF3FeC1f7e69701E3ab6c592435Ae7)
 1 ETH [0x3aac1cC67c2ec5Db4eA850957b967Ba153aD6279](https://goerli.etherscan.io/address/0x3aac1cC67c2ec5Db4eA850957b967Ba153aD6279)
 10 ETH [0x723B78e67497E85279CB204544566F4dC5d2acA0](https://goerli.etherscan.io/address/0x723B78e67497E85279CB204544566F4dC5d2acA0)
 100 ETH [0x0E3A09dDA6B20aFbB34aC7cD4A6881493f3E7bf7](https://goerli.etherscan.io/address/0x0E3A09dDA6B20aFbB34aC7cD4A6881493f3E7bf7)
 100 DAI [0x76D85B4C0Fc497EeCc38902397aC608000A06607](https://goerli.etherscan.io/address/0x76D85B4C0Fc497EeCc38902397aC608000A06607)
 1,000 DAI [0xCC84179FFD19A1627E79F8648d09e095252Bc418](https://goerli.etherscan.io/address/0xCC84179FFD19A1627E79F8648d09e095252Bc418)
 10,000 DAI [0xD5d6f8D9e784d0e26222ad3834500801a68D027D](https://goerli.etherscan.io/address/0xD5d6f8D9e784d0e26222ad3834500801a68D027D)
 100,000 DAI [0x407CcEeaA7c95d2FE2250Bf9F2c105aA7AAFB512](https://goerli.etherscan.io/address/0x407CcEeaA7c95d2FE2250Bf9F2c105aA7AAFB512)
 5,000 cDAI [0x833481186f16Cece3f1Eeea1a694c42034c3a0dB](https://goerli.etherscan.io/address/0x833481186f16Cece3f1Eeea1a694c42034c3a0dB)
 50,000 cDAI [0xd8D7DE3349ccaA0Fde6298fe6D7b7d0d34586193](https://goerli.etherscan.io/address/0xd8D7DE3349ccaA0Fde6298fe6D7b7d0d34586193)
 500,000 cDAI [0x8281Aa6795aDE17C8973e1aedcA380258Bc124F9](https://goerli.etherscan.io/address/0x8281Aa6795aDE17C8973e1aedcA380258Bc124F9)
 5,000,000 cDAI [0x57b2B8c82F065de8Ef5573f9730fC1449B403C9f](https://goerli.etherscan.io/address/0x57b2B8c82F065de8Ef5573f9730fC1449B403C9f)
 100 USDC [0x05E0b5B40B7b66098C2161A5EE11C5740A3A7C45](https://goerli.etherscan.io/address/0x05E0b5B40B7b66098C2161A5EE11C5740A3A7C45)
 1,000 USDC [0x23173fE8b96A4Ad8d2E17fB83EA5dcccdCa1Ae52](https://goerli.etherscan.io/address/0x23173fE8b96A4Ad8d2E17fB83EA5dcccdCa1Ae52)
 100 USDT [0x538Ab61E8A9fc1b2f93b3dd9011d662d89bE6FE6](https://goerli.etherscan.io/address/0x538Ab61E8A9fc1b2f93b3dd9011d662d89bE6FE6)
 1,000 USDT [0x94Be88213a387E992Dd87DE56950a9aef34b9448](https://goerli.etherscan.io/address/0x94Be88213a387E992Dd87DE56950a9aef34b9448)
 0.1 WBTC [0x242654336ca2205714071898f67E254EB49ACdCe](https://goerli.etherscan.io/address/0x242654336ca2205714071898f67E254EB49ACdCe)
 1 WBTC [0x776198CCF446DFa168347089d7338879273172cF](https://goerli.etherscan.io/address/0x776198CCF446DFa168347089d7338879273172cF)
 10 WBTC [0xeDC5d01286f99A066559F60a585406f3878a033e](https://goerli.etherscan.io/address/0xeDC5d01286f99A066559F60a585406f3878a033e)
*/
