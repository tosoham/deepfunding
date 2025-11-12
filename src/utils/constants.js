// src/utils/constants.js

/**
 * Seed repositories for the DeepFunding project
 * These are the 45 Ethereum ecosystem repositories to be analyzed
 */
export const SEED_REPOS = [
  "a16z/helios",
  "alloy-rs/alloy",
  "apeworx/ape",
  "chainsafe/lodestar",
  "consensys/teku",
  "erigontech/erigon",
  "eth-infinitism/account-abstraction",
  "ethereum-lists/chains",
  "ethereum/consensus-specs",
  "ethereum/eips",
  "ethereum/evmone",
  "ethereum/execution-apis",
  "argotorg/fe",
  "ethereum/go-ethereum",
  "ethereum/py-evm",
  "ethereum/remix-project",
  "argotorg/solidity",
  "argotorg/sourcify",
  "ethereum/web3.py",
  "ethers-io/ethers.js",
  "foundry-rs/foundry",
  "grandinetech/grandine",
  "hyperledger-web3j/web3j",
  "hyperledger/besu",
  "nethereum/nethereum",
  "nethermindeth/nethermind",
  "nomicfoundation/hardhat",
  "openzeppelin/openzeppelin-contracts",
  "paradigmxyz/reth",
  "prysmaticlabs/prysm",
  "safe-global/safe-smart-account",
  "scaffold-eth/scaffold-eth-2",
  "sigp/lighthouse",
  "status-im/nimbus-eth2",
  "vyperlang/titanoboa",
  "vyperlang/vyper",
  "wevm/viem",
  "argotorg/hevm",
  "ethdebug/format",
  "argotorg/act",
  "ethpandaops/ethereum-package",
  "ethpandaops/ethereum-helm-charts",
  "ethpandaops/checkpointz",
  "lambdaclass/lambda_ethereum_consensus",
  "erigontech/silkworm"
];

/**
 * Reasoning templates for training data generation
 * Functions that generate reasoning strings based on winner and parent repos
 */
export const REASONING_TEMPLATES = [
  (winner, parent) => `${winner} provides critical infrastructure dependencies to ${parent}`,
  (winner, parent) => `${winner} has more direct code contributions affecting ${parent}'s core functionality`,
  (winner, parent) => `${winner} serves as a foundational library heavily used by ${parent}`,
  (winner, parent) => `Development patterns show ${winner} influences ${parent}'s architecture more significantly`,
  (winner, parent) => `${winner} has stronger coupling with ${parent} based on dependency analysis`,
  (winner, parent) => `${winner} provides essential tooling that ${parent} relies on for development`,
  (winner, parent) => `${winner} is a critical dependency in ${parent}'s build and deployment pipeline`,
  (winner, parent) => `${winner} contributes core protocol implementations used by ${parent}`,
  (winner, parent) => `${winner} provides security-critical components for ${parent}`,
  (winner, parent) => `${winner} offers performance optimizations that ${parent} depends on`,
  (winner, parent) => `Analysis shows ${winner} has higher impact on ${parent}'s reliability`,
  (winner, parent) => `${winner} maintains APIs that ${parent} extensively integrates with`,
  (winner, parent) => `${winner} provides consensus layer features essential to ${parent}`,
  (winner, parent) => `${winner} offers execution layer capabilities that ${parent} builds upon`,
  (winner, parent) => `${winner} supplies developer tools that streamline ${parent}'s workflow`
];

/**
 * Funding tier configuration
 * Defines 5 tiers based on criticality score ranges
 */
export const FUNDING_TIERS = {
  CRITICAL: {
    name: 'Critical',
    minScore: 80,
    maxScore: 100,
    level: 'High Priority',
    color: 'bg-red-600',
    description: 'Mission-critical projects essential to ecosystem functionality'
  },
  IMPORTANT: {
    name: 'Important',
    minScore: 60,
    maxScore: 80,
    level: 'Medium-High Priority',
    color: 'bg-orange-600',
    description: 'Highly important projects with significant ecosystem impact'
  },
  MODERATE: {
    name: 'Moderate',
    minScore: 40,
    maxScore: 60,
    level: 'Medium Priority',
    color: 'bg-yellow-600',
    description: 'Moderately important projects supporting key functionality'
  },
  SUPPORTING: {
    name: 'Supporting',
    minScore: 20,
    maxScore: 40,
    level: 'Low-Medium Priority',
    color: 'bg-blue-600',
    description: 'Supporting projects that enable specialized features'
  },
  PERIPHERAL: {
    name: 'Peripheral',
    minScore: 0,
    maxScore: 20,
    level: 'Low Priority',
    color: 'bg-gray-600',
    description: 'Peripheral projects with limited direct ecosystem impact'
  }
};

/**
 * Funding amount configuration
 * Min and max annual funding amounts in USD
 */
export const FUNDING_CONFIG = {
  MAX_FUNDING: 100000,  // $100,000 per year
  MIN_FUNDING: 5000,    // $5,000 per year
};

/**
 * Scoring weights for criticality calculation
 * These weights determine how different factors contribute to the final score
 */
export const SCORING_WEIGHTS = {
  WIN_MULTIPLIER: 10,      // Points awarded to winner (multiplied by comparison multiplier)
  LOSS_POINTS: 2,          // Points awarded to loser (participation)
  PARENT_BONUS: 1,         // Bonus points for being a parent (dependency)
  WIN_RATE_WEIGHT: 0.3,    // Weight for win rate in final calculation
  MULTIPLIER_WEIGHT: 0.2,  // Weight for average multiplier
};

/**
 * Data generation configuration
 */
export const DATA_GENERATION_CONFIG = {
  MIN_COMPARISONS: 10,
  MAX_COMPARISONS: 10000,
  DEFAULT_COMPARISONS: 100,
  REASONING_PROBABILITY: 0.7,  // 70% chance of including reasoning
  MIN_MULTIPLIER: 1,
  MAX_MULTIPLIER: 5,
};

/**
 * Chart color schemes for visualizations
 */
export const CHART_COLORS = {
  PRIMARY: '#a855f7',      // Purple
  SECONDARY: '#ec4899',    // Pink
  SUCCESS: '#10b981',      // Green
  WARNING: '#f59e0b',      // Amber
  INFO: '#3b82f6',         // Blue
  DANGER: '#ef4444',       // Red
};

/**
 * Export file naming patterns
 */
export const EXPORT_PATTERNS = {
  TRAINING_DATA: 'training_data',
  CRITICALITY_SCORES: 'criticality_scores',
  FUNDING_PRIORITIES: 'funding_priorities',
  FULL_REPORT: 'deepfunding_report',
};

/**
 * Repository categories for analysis
 */
export const REPO_CATEGORIES = {
  EXECUTION_CLIENTS: [
    'ethereum/go-ethereum',
    'erigontech/erigon',
    'nethermindeth/nethermind',
    'hyperledger/besu',
    'paradigmxyz/reth',
    'erigontech/silkworm'
  ],
  CONSENSUS_CLIENTS: [
    'sigp/lighthouse',
    'prysmaticlabs/prysm',
    'consensys/teku',
    'status-im/nimbus-eth2',
    'chainsafe/lodestar',
    'grandinetech/grandine',
    'lambdaclass/lambda_ethereum_consensus'
  ],
  DEVELOPMENT_TOOLS: [
    'nomicfoundation/hardhat',
    'foundry-rs/foundry',
    'ethereum/remix-project',
    'scaffold-eth/scaffold-eth-2',
    'apeworx/ape'
  ],
  LIBRARIES: [
    'ethers-io/ethers.js',
    'ethereum/web3.py',
    'wevm/viem',
    'alloy-rs/alloy',
    'nethereum/nethereum',
    'hyperledger-web3j/web3j'
  ],
  SMART_CONTRACTS: [
    'openzeppelin/openzeppelin-contracts',
    'argotorg/solidity',
    'vyperlang/vyper',
    'safe-global/safe-smart-account',
    'argotorg/fe'
  ],
  INFRASTRUCTURE: [
    'a16z/helios',
    'ethereum-lists/chains',
    'ethereum/consensus-specs',
    'ethereum/execution-apis',
    'ethpandaops/ethereum-package'
  ]
};

/**
 * Get category for a repository
 * @param {string} repo - Repository name
 * @returns {string|null} Category name or null if not categorized
 */
export const getRepoCategory = (repo) => {
  for (const [category, repos] of Object.entries(REPO_CATEGORIES)) {
    if (repos.includes(repo)) {
      return category;
    }
  }
  return null;
};

/**
 * Default export of all constants
 */
export default {
  SEED_REPOS,
  REASONING_TEMPLATES,
  FUNDING_TIERS,
  FUNDING_CONFIG,
  SCORING_WEIGHTS,
  DATA_GENERATION_CONFIG,
  CHART_COLORS,
  EXPORT_PATTERNS,
  REPO_CATEGORIES,
  getRepoCategory
};