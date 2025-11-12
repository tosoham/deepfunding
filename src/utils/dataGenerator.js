#!/usr/bin/env node

/* CLI script to generate training data for DeepFunding analysis*/

const fs = require('fs');
const path = require('path');

// ========================================
// Constants
// ========================================

const SEED_REPOS = [
  "a16z/helios", "alloy-rs/alloy", "apeworx/ape", "chainsafe/lodestar",
  "consensys/teku", "erigontech/erigon", "eth-infinitism/account-abstraction",
  "ethereum-lists/chains", "ethereum/consensus-specs", "ethereum/eips",
  "ethereum/evmone", "ethereum/execution-apis", "argotorg/fe",
  "ethereum/go-ethereum", "ethereum/py-evm", "ethereum/remix-project",
  "argotorg/solidity", "argotorg/sourcify", "ethereum/web3.py",
  "ethers-io/ethers.js", "foundry-rs/foundry", "grandinetech/grandine",
  "hyperledger-web3j/web3j", "hyperledger/besu", "nethereum/nethereum",
  "nethermindeth/nethermind", "nomicfoundation/hardhat",
  "openzeppelin/openzeppelin-contracts", "paradigmxyz/reth",
  "prysmaticlabs/prysm", "safe-global/safe-smart-account",
  "scaffold-eth/scaffold-eth-2", "sigp/lighthouse", "status-im/nimbus-eth2",
  "vyperlang/titanoboa", "vyperlang/vyper", "wevm/viem",
  "argotorg/hevm", "ethdebug/format", "argotorg/act",
  "ethpandaops/ethereum-package", "ethpandaops/ethereum-helm-charts",
  "ethpandaops/checkpointz", "lambdaclass/lambda_ethereum_consensus",
  "erigontech/silkworm"
];

const REASONING_TEMPLATES = [
  (winner, parent) => `${winner} provides critical infrastructure dependencies to ${parent}`,
  (winner, parent) => `${winner} has more direct code contributions affecting ${parent}'s core functionality`,
  (winner, parent) => `${winner} serves as a foundational library heavily used by ${parent}`,
  (winner, parent) => `Development patterns show ${winner} influences ${parent}'s architecture more significantly`,
  (winner, parent) => `${winner} has stronger coupling with ${parent} based on dependency analysis`,
  (winner, parent) => `${winner} provides essential tooling that ${parent} relies on for development`,
  (winner, parent) => `${winner} is a critical dependency in ${parent}'s build and deployment pipeline`,
  (winner, parent) => `${winner} contributes core protocol implementations used by ${parent}`,
  (winner, parent) => `${winner} provides security-critical components for ${parent}`,
  (winner, parent) => `${winner} offers performance optimizations that ${parent} depends on`
];

// ========================================
// Utility Functions
// ========================================

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    count: 100,
    output: path.join(__dirname, '../data/training_data/training_data.csv'),
    format: 'csv',
    showStats: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
      case '-c':
        config.count = parseInt(args[++i]);
        if (isNaN(config.count) || config.count < 10 || config.count > 10000) {
          console.error('❌ Count must be between 10 and 10000');
          process.exit(1);
        }
        break;
      
      case '--output':
      case '-o':
        config.output = args[++i];
        break;
      
      case '--format':
      case '-f':
        config.format = args[++i].toLowerCase();
        if (!['csv', 'json'].includes(config.format)) {
          console.error('❌ Format must be csv or json');
          process.exit(1);
        }
        break;
      
      case '--stats':
      case '-s':
        config.showStats = true;
        break;
      
      case '--help':
      case '-h':
        config.help = true;
        break;
      
      default:
        console.error(`❌ Unknown option: ${args[i]}`);
        console.log('Use --help for usage information');
        process.exit(1);
    }
  }

  return config;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          DeepFunding Training Data Generator                  ║
╚═══════════════════════════════════════════════════════════════╝

Usage: node generateData.js [options]

Options:
  -c, --count <number>     Number of comparisons to generate (default: 100)
                          Range: 10-10000
  
  -o, --output <path>      Output file path
                          Default: ./data/training_data/training_data.csv
  
  -f, --format <format>    Output format: csv or json (default: csv)
  
  -s, --stats              Show detailed statistics after generation
  
  -h, --help               Show this help message

Examples:
  # Generate 500 comparisons
  node generateData.js --count 500
  
  # Generate 200 comparisons with custom output path
  node generateData.js -c 200 -o custom_data.csv
  
  # Generate 1000 comparisons in JSON format with statistics
  node generateData.js --count 1000 --format json --stats
  
  # Generate data in specific directory
  node generateData.js -c 300 -o ../exports/training_data.csv

Notes:
  - Each comparison includes repo_a, repo_b, parent, choice, multiplier
  - ~70% of comparisons will include reasoning text
  - Multiplier values range from 1.0 to 5.0
  - All 45 seed repositories will be used in generation
  `);
}

/**
 * Generate training data
 */
function generateTrainingData(numComparisons) {
  const data = [];
  const usedPairs = new Set();
  
  console.log(`\n🔄 Generating ${numComparisons} comparisons...\n`);
  
  const progressBar = {
    total: numComparisons,
    current: 0,
    width: 40,
    update(current) {
      this.current = current;
      const percent = Math.floor((current / this.total) * 100);
      const filled = Math.floor((current / this.total) * this.width);
      const empty = this.width - filled;
      
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      process.stdout.write(`\r  Progress: [${bar}] ${percent}% (${current}/${this.total})`);
    }
  };
  
  for (let i = 0; i < numComparisons; i++) {
    let repoA, repoB, parent;
    let pairKey;
    let attempts = 0;
    
    do {
      repoA = SEED_REPOS[Math.floor(Math.random() * SEED_REPOS.length)];
      repoB = SEED_REPOS[Math.floor(Math.random() * SEED_REPOS.length)];
      parent = SEED_REPOS[Math.floor(Math.random() * SEED_REPOS.length)];
      pairKey = `${repoA}-${repoB}-${parent}`;
      attempts++;
      
      if (attempts > 100) break; // Prevent infinite loop
    } while (repoA === repoB || usedPairs.has(pairKey));
    
    usedPairs.add(pairKey);
    
    const choice = Math.random() > 0.5 ? 1 : 2;
    const multiplier = parseFloat((Math.random() * 4 + 1).toFixed(2));
    
    const shouldHaveReasoning = Math.random() > 0.3;
    const winner = choice === 1 ? repoA : repoB;
    const reasoning = shouldHaveReasoning 
      ? REASONING_TEMPLATES[Math.floor(Math.random() * REASONING_TEMPLATES.length)](winner, parent)
      : '';
    
    data.push({
      id: i + 1,
      repo_a: repoA,
      repo_b: repoB,
      parent: parent,
      choice: choice,
      multiplier: multiplier,
      reasoning: reasoning
    });
    
    progressBar.update(i + 1);
  }
  
  console.log('\n');
  return data;
}

/**
 * Convert data to CSV format
 */
function toCSV(data) {
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Calculate statistics
 */
function calculateStatistics(data) {
  const repoFrequency = {};
  const multipliers = [];
  let totalWithReasoning = 0;
  
  data.forEach(row => {
    [row.repo_a, row.repo_b, row.parent].forEach(repo => {
      repoFrequency[repo] = (repoFrequency[repo] || 0) + 1;
    });
    
    multipliers.push(row.multiplier);
    
    if (row.reasoning) {
      totalWithReasoning++;
    }
  });
  
  const avgMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
  const maxMultiplier = Math.max(...multipliers);
  const minMultiplier = Math.min(...multipliers);
  
  const sortedByFrequency = Object.entries(repoFrequency)
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalComparisons: data.length,
    uniqueRepos: Object.keys(repoFrequency).length,
    avgMultiplier: avgMultiplier.toFixed(2),
    maxMultiplier: maxMultiplier.toFixed(2),
    minMultiplier: minMultiplier.toFixed(2),
    reasoningCoverage: ((totalWithReasoning / data.length) * 100).toFixed(1) + '%',
    mostFrequentRepo: sortedByFrequency[0],
    leastFrequentRepo: sortedByFrequency[sortedByFrequency.length - 1]
  };
}

/**
 * Display statistics
 */
function displayStatistics(stats) {
  console.log('\n📊 Statistics:\n');
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log(`  │ Total Comparisons:        ${stats.totalComparisons.toString().padEnd(20)} │`);
  console.log(`  │ Unique Repositories:      ${stats.uniqueRepos.toString().padEnd(20)} │`);
  console.log(`  │ Average Multiplier:       ${stats.avgMultiplier.padEnd(20)} │`);
  console.log(`  │ Multiplier Range:         ${stats.minMultiplier} - ${stats.maxMultiplier}`.padEnd(51) + '│');
  console.log(`  │ Reasoning Coverage:       ${stats.reasoningCoverage.padEnd(20)} │`);
  console.log('  ├─────────────────────────────────────────────────┤');
  console.log(`  │ Most Frequent:            ${stats.mostFrequentRepo[0].padEnd(20)} │`);
  console.log(`  │   (appeared ${stats.mostFrequentRepo[1]} times)`.padEnd(51) + '│');
  console.log(`  │ Least Frequent:           ${stats.leastFrequentRepo[0].padEnd(20)} │`);
  console.log(`  │   (appeared ${stats.leastFrequentRepo[1]} times)`.padEnd(51) + '│');
  console.log('  └─────────────────────────────────────────────────┘\n');
}

/**
 * Save data to file
 */
function saveData(data, outputPath, format) {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Determine final path based on format
    let finalPath = outputPath;
    if (format === 'json' && !outputPath.endsWith('.json')) {
      finalPath = outputPath.replace(/\.csv$/, '.json');
    }
    
    // Save based on format
    let content;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else {
      content = toCSV(data);
    }
    
    fs.writeFileSync(finalPath, content);
    
    const fileSize = (fs.statSync(finalPath).size / 1024).toFixed(2);
    
    console.log('✅ Successfully generated training data!\n');
    console.log('📁 Output Information:');
    console.log(`   File: ${finalPath}`);
    console.log(`   Format: ${format.toUpperCase()}`);
    console.log(`   Size: ${fileSize} KB`);
    console.log(`   Records: ${data.length}\n`);
    
    return finalPath;
    
  } catch (error) {
    console.error('❌ Error saving file:', error.message);
    process.exit(1);
  }
}

// ========================================
// Main Execution
// ========================================

function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       DeepFunding Training Data Generator v1.0.0              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const config = parseArgs();
  
  if (config.help) {
    showHelp();
    process.exit(0);
  }
  
  try {
    // Generate data
    const startTime = Date.now();
    const data = generateTrainingData(config.count);
    const endTime = Date.now();
    
    // Calculate statistics
    const stats = calculateStatistics(data);
    
    // Save data
    const outputPath = saveData(data, config.output, config.format);
    
    // Display statistics if requested
    if (config.showStats) {
      displayStatistics(stats);
    }
    
    // Display summary
    console.log(`⏱️  Generation time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`\n✨ Ready for analysis! Use this data to calculate criticality scores.\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  generateTrainingData,
  calculateStatistics
};