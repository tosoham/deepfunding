import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Download, Upload, Play, FileText, TrendingUp, GitBranch, Network } from 'lucide-react';

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

const DeepFundingAnalyzer = () => {
  const [trainingData, setTrainingData] = useState([]);
  const [criticalityScores, setCriticalityScores] = useState([]);
  const [fundingPriorities, setFundingPriorities] = useState([]);
  const [activeTab, setActiveTab] = useState('generate');
  const [numComparisons, setNumComparisons] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [dataMode, setDataMode] = useState('generate');
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [minEdgeCount, setMinEdgeCount] = useState(2);
  const canvasRef = useRef(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const animationFrameRef = useRef(null);
  const nodesRef = useRef([]);

  // -------------------- Upload Handler --------------------
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.trim().split('\n').filter(row => row.trim().length > 0);
      
      const parseCSVRow = (row) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVRow(rows[0]);
      const data = [];
      
      for (let i = 1; i < rows.length; i++) {
        const values = parseCSVRow(rows[i]);
        
        // Skip rows that don't have enough columns or are empty
        if (values.length < headers.length || values.every(v => !v)) {
          continue;
        }
        
        const obj = { id: data.length + 1 };
        
        headers.forEach((h, idx) => {
          let value = values[idx] || '';
          
          // Extract repo name from URL if it's a GitHub URL
          if ((h === 'repo_a' || h === 'repo_b') && value.includes('github.com/')) {
            const match = value.match(/github\.com\/([^/]+\/[^/\s"?#]+)/);
            obj[h] = match ? match[1].trim() : value;
          } else {
            // Clean up the value - remove extra quotes and whitespace
            value = value.replace(/^["']|["']$/g, '').trim();
            obj[h] = value;
          }
        });
        
        // Only add if we have the required fields
        if (obj.repo_a && obj.repo_b && obj.choice && obj.multiplier) {
          data.push(obj);
        }
      }
      
      console.log('Parsed data:', data.slice(0, 5)); // Debug
      setTrainingData(data);
    };
    reader.readAsText(file);
  };

  // -------------------- Generate Data --------------------
  const generateTrainingData = () => {
    setGenerating(true);
    const data = [];
    const usedPairs = new Set();
    
    const jurors = ['L1Juror1', 'L1Juror10', 'L1Juror11', 'L1Juror13', 'L1Juror14', 'L1Juror15'];
    
    for (let i = 0; i < numComparisons; i++) {
      let repoA, repoB, parent;
      let pairKey;
      do {
        repoA = SEED_REPOS[Math.floor(Math.random() * SEED_REPOS.length)];
        repoB = SEED_REPOS[Math.floor(Math.random() * SEED_REPOS.length)];
        parent = SEED_REPOS[Math.floor(Math.random() * SEED_REPOS.length)];
        pairKey = `${repoA}-${repoB}-${parent}`;
      } while (repoA === repoB || usedPairs.has(pairKey));
      usedPairs.add(pairKey);
      
      const choice = Math.random() > 0.5 ? 1 : 2;
      const multiplier = parseFloat((Math.random() * 49 + 1).toFixed(2));
      const juror = jurors[Math.floor(Math.random() * jurors.length)];
      
      const shouldHaveReasoning = Math.random() > 0.2;
      const winner = choice === 1 ? repoA : repoB;
      const reasoningTemplates = [
        `${winner} provides critical infrastructure dependencies to ${parent}`,
        `${winner} has more direct code contributions affecting ${parent}'s core functionality`,
        `${winner} serves as a foundational library heavily used by ${parent}`,
        `Development patterns show ${winner} influences ${parent}'s architecture more significantly`,
        `${winner} has stronger coupling with ${parent} based on dependency analysis`,
        `${winner} is essential for ${parent}'s execution layer`,
        `${winner} has significant market share affecting ${parent}`,
        `${winner} contributes to ${parent}'s infrastructure scalability`,
        `${winner} is a core component of ${parent}'s consensus mechanism`,
        `${winner} directly enables ${parent}'s functionality`
      ];
      const reasoning = shouldHaveReasoning
        ? reasoningTemplates[Math.floor(Math.random() * reasoningTemplates.length)]
        : '';
      
      const date = new Date(2025, 0, Math.floor(Math.random() * 31) + 1, 
                           Math.floor(Math.random() * 24), 
                           Math.floor(Math.random() * 60),
                           Math.floor(Math.random() * 60));
      const timestamp = date.toISOString().replace('T', ' ').split('.')[0] + 'Z';
      
      data.push({
        id: i + 1,
        timestamp: timestamp,
        juror: juror,
        repo_a: repoA,
        repo_b: repoB,
        parent: parent,
        choice: choice,
        multiplier: multiplier,
        reasoning: reasoning
      });
    }
    setTrainingData(data);
    setGenerating(false);
  };

  // -------------------- Calculate Scores --------------------
  const calculateCriticalityScores = () => {
    if (trainingData.length === 0) {
      alert('Please upload or generate training data first');
      return;
    }
    const scores = {};
    const contributions = {};
    SEED_REPOS.forEach(repo => {
      scores[repo] = 0;
      contributions[repo] = { wins: 0, total: 0, totalMultiplier: 0 };
    });

    trainingData.forEach(row => {
      const winner = row.choice === 1 || row.choice === "1" ? row.repo_a : row.repo_b;
      const loser = row.choice === 1 || row.choice === "1" ? row.repo_b : row.repo_a;

      if (!winner || !loser) return;

      if (!(winner in scores)) {
        scores[winner] = 0;
        contributions[winner] = { wins: 0, total: 0, totalMultiplier: 0 };
      }
      if (!(loser in scores)) {
        scores[loser] = 0;
        contributions[loser] = { wins: 0, total: 0, totalMultiplier: 0 };
      }

      const mult = parseFloat(row.multiplier);
      const multiplier = Number.isFinite(mult) ? mult : 1;

      contributions[winner].wins += 1;
      contributions[winner].total += 1;
      contributions[winner].totalMultiplier += multiplier;
      contributions[loser].total += 1;

      scores[winner] += multiplier * 10;
      scores[loser] += 2;
    });

    const scoreValues = Object.values(scores);
    const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 1;
    const scoredRepos = Object.entries(scores).map(([repo, score]) => {
      const contrib = contributions[repo];
      const winRate = contrib.total > 0 ? contrib.wins / contrib.total : 0;
      const avgMultiplier = contrib.wins > 0 ? contrib.totalMultiplier / contrib.wins : 0;
      return {
        repo: repo,
        rawScore: score,
        normalizedScore: (score / maxScore * 100).toFixed(2),
        winRate: (winRate * 100).toFixed(1),
        avgMultiplier: avgMultiplier.toFixed(2),
        totalComparisons: contrib.total,
        wins: contrib.wins
      };
    }).sort((a, b) => b.rawScore - a.rawScore);
    setCriticalityScores(scoredRepos);
    calculateFundingPriorities(scoredRepos);
  };

  const calculateFundingPriorities = (scores) => {
    const priorities = scores.map((item, index) => {
      let tier, fundingLevel;
      const normalized = parseFloat(item.normalizedScore);
      if (normalized >= 80) {
        tier = 'Critical'; fundingLevel = 'High Priority';
      } else if (normalized >= 60) {
        tier = 'Important'; fundingLevel = 'Medium-High Priority';
      } else if (normalized >= 40) {
        tier = 'Moderate'; fundingLevel = 'Medium Priority';
      } else if (normalized >= 20) {
        tier = 'Supporting'; fundingLevel = 'Low-Medium Priority';
      } else {
        tier = 'Peripheral'; fundingLevel = 'Low Priority';
      }
      return {
        rank: index + 1,
        repo: item.repo,
        criticalityScore: normalized,
        tier: tier,
        fundingLevel: fundingLevel,
        winRate: item.winRate,
        avgMultiplier: item.avgMultiplier,
        recommendedFunding: calculateFundingAmount(normalized)
      };
    });
    setFundingPriorities(priorities);
  };

  const calculateFundingAmount = (score) => {
    const maxFunding = 100000;
    const minFunding = 5000;
    return Math.round((score / 100) * (maxFunding - minFunding) + minFunding);
  };

  // -------------------- Build Graph --------------------
  const buildDependencyGraph = () => {
    if (trainingData.length === 0) {
      alert('Please upload or generate training data first');
      return;
    }

    // Aggregate edges
    const edgeMap = new Map();
    trainingData.forEach(row => {
      const source = row.repo_a;
      const target = row.repo_b;
      if (!source || !target) return;
      
      const key = `${source}->${target}`;
      if (edgeMap.has(key)) {
        const existing = edgeMap.get(key);
        existing.count += 1;
        existing.totalMultiplier += parseFloat(row.multiplier) || 1;
      } else {
        edgeMap.set(key, {
          source,
          target,
          count: 1,
          totalMultiplier: parseFloat(row.multiplier) || 1
        });
      }
    });

    // Filter edges by count
    const edges = Array.from(edgeMap.values())
      .filter(e => e.count >= minEdgeCount)
      .map(e => ({
        ...e,
        avgMultiplier: e.totalMultiplier / e.count
      }));

    // Build nodes set
    const nodeSet = new Set();
    edges.forEach(e => {
      nodeSet.add(e.source);
      nodeSet.add(e.target);
    });

    // Calculate PageRank-like importance
    const nodeImportance = {};
    nodeSet.forEach(n => nodeImportance[n] = 0);
    edges.forEach(e => {
      nodeImportance[e.target] = (nodeImportance[e.target] || 0) + e.count;
    });

    const maxImportance = Math.max(...Object.values(nodeImportance), 1);
    const nodes = Array.from(nodeSet).map(n => ({
      id: n,
      label: n.split('/')[1] || n,
      importance: nodeImportance[n] / maxImportance,
      size: 10 + (nodeImportance[n] / maxImportance) * 30
    }));

    setGraphData({ nodes, edges });
  };

  // -------------------- Render Graph --------------------
  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize nodes with 3D coordinates
    const nodes = graphData.nodes.map(n => ({
      ...n,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      z: (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      vz: 0,
      fixed: false
    }));

    nodesRef.current = nodes;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    let localRotation = { x: 0, y: 0 };
    let isMouseDown = false;
    let lastMousePos = { x: 0, y: 0 };

    // 3D projection
    const project = (x, y, z) => {
      const scale = 800 / (800 + z);
      return {
        x: centerX + x * scale,
        y: centerY + y * scale,
        scale: scale
      };
    };

    // Rotate point in 3D
    const rotate3D = (x, y, z, rx, ry) => {
      // Rotate around Y axis
      let cosY = Math.cos(ry);
      let sinY = Math.sin(ry);
      let x1 = x * cosY - z * sinY;
      let z1 = x * sinY + z * cosY;
      
      // Rotate around X axis
      let cosX = Math.cos(rx);
      let sinX = Math.sin(rx);
      let y1 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;
      
      return { x: x1, y: y1, z: z2 };
    };

    // Mouse handlers
    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const findNodeAtPosition = (mx, my) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const rotated = rotate3D(n.x, n.y, n.z, localRotation.x, localRotation.y);
        const proj = project(rotated.x, rotated.y, rotated.z);
        const screenRadius = n.size * proj.scale;
        const dx = proj.x - mx;
        const dy = proj.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < screenRadius) {
          return n;
        }
      }
      return null;
    };

    const handleMouseDown = (e) => {
      const pos = getMousePos(e);
      const node = findNodeAtPosition(pos.x, pos.y);
      
      if (node) {
        isMouseDown = false;
        node.fixed = true;
        setDraggedNode(node);
      } else {
        isMouseDown = true;
        lastMousePos = pos;
      }
    };

    const handleMouseMove = (e) => {
      const pos = getMousePos(e);
      
      if (draggedNode && !isMouseDown) {
        // Drag node
        const rotated = rotate3D(draggedNode.x, draggedNode.y, draggedNode.z, localRotation.x, localRotation.y);
        const proj = project(rotated.x, rotated.y, rotated.z);
        
        const dx = (pos.x - centerX) / proj.scale - rotated.x;
        const dy = (pos.y - centerY) / proj.scale - rotated.y;
        
        // Rotate back to original space
        const invRotated = rotate3D(
          rotated.x + dx,
          rotated.y + dy,
          rotated.z,
          -localRotation.x,
          -localRotation.y
        );
        
        draggedNode.x = invRotated.x;
        draggedNode.y = invRotated.y;
        draggedNode.z = invRotated.z;
        draggedNode.vx = draggedNode.vy = draggedNode.vz = 0;
      } else if (isMouseDown) {
        // Rotate view
        const dx = pos.x - lastMousePos.x;
        const dy = pos.y - lastMousePos.y;
        localRotation.y += dx * 0.01;
        localRotation.x += dy * 0.01;
        lastMousePos = pos;
      } else {
        // Hover detection
        const node = findNodeAtPosition(pos.x, pos.y);
        setHoveredNode(node);
        canvas.style.cursor = node ? 'grab' : 'default';
      }
    };

    const handleMouseUp = () => {
      if (draggedNode) {
        draggedNode.fixed = false;
        setDraggedNode(null);
      }
      isMouseDown = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Animation loop
    let frame = 0;
    const animate = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Physics (only for first 300 frames)
      if (frame < 300) {
        nodes.forEach(n => {
          if (n.fixed) return;

          // 3D Repulsion
          nodes.forEach(m => {
            if (n === m) return;
            const dx = n.x - m.x;
            const dy = n.y - m.y;
            const dz = n.z - m.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1;
            const force = 1200 / (dist * dist);
            n.vx += (dx / dist) * force;
            n.vy += (dy / dist) * force;
            n.vz += (dz / dist) * force;
          });

          // Center gravity
          n.vx += -n.x * 0.005;
          n.vy += -n.y * 0.005;
          n.vz += -n.z * 0.005;

          // Damping
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.vz *= 0.85;

          n.x += n.vx;
          n.y += n.vy;
          n.z += n.vz;
        });

        // 3D Attraction from edges
        graphData.edges.forEach(e => {
          const source = nodeMap.get(e.source);
          const target = nodeMap.get(e.target);
          if (!source || !target) return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dz = target.z - source.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1;
          const force = (dist - 180) * 0.02;

          if (!source.fixed) {
            source.vx += (dx / dist) * force;
            source.vy += (dy / dist) * force;
            source.vz += (dz / dist) * force;
          }
          if (!target.fixed) {
            target.vx -= (dx / dist) * force;
            target.vy -= (dy / dist) * force;
            target.vz -= (dz / dist) * force;
          }
        });
      }

      // Sort nodes by Z for proper depth
      const sortedNodes = [...nodes].sort((a, b) => {
        const ra = rotate3D(a.x, a.y, a.z, localRotation.x, localRotation.y);
        const rb = rotate3D(b.x, b.y, b.z, localRotation.x, localRotation.y);
        return ra.z - rb.z;
      });

      // Draw edges
      graphData.edges.forEach(e => {
        const source = nodeMap.get(e.source);
        const target = nodeMap.get(e.target);
        if (!source || !target) return;

        const rs = rotate3D(source.x, source.y, source.z, localRotation.x, localRotation.y);
        const rt = rotate3D(target.x, target.y, target.z, localRotation.x, localRotation.y);
        const ps = project(rs.x, rs.y, rs.z);
        const pt = project(rt.x, rt.y, rt.z);

        // Depth-based opacity
        const avgZ = (rs.z + rt.z) / 2;
        const opacity = 0.3 + (avgZ + 200) / 600 * 0.4;

        ctx.strokeStyle = `rgba(74, 158, 255, ${opacity})`;
        ctx.lineWidth = Math.min(e.count * 0.3, 3) * Math.min(ps.scale, pt.scale);
        ctx.beginPath();
        ctx.moveTo(ps.x, ps.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();

        // Arrow
        const angle = Math.atan2(pt.y - ps.y, pt.x - ps.x);
        const arrowSize = 8 * pt.scale;
        const arrowDist = target.size * pt.scale + 5;
        const arrowX = pt.x - Math.cos(angle) * arrowDist;
        const arrowY = pt.y - Math.sin(angle) * arrowDist;
        
        ctx.fillStyle = `rgba(132, 132, 132, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle - 0.4), arrowY - arrowSize * Math.sin(angle - 0.4));
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle + 0.4), arrowY - arrowSize * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      });

      // Draw nodes
      sortedNodes.forEach(n => {
        const rotated = rotate3D(n.x, n.y, n.z, localRotation.x, localRotation.y);
        const proj = project(rotated.x, rotated.y, rotated.z);
        const screenRadius = n.size * proj.scale;

        const isHovered = hoveredNode === n;
        const isDragged = draggedNode === n;

        // Depth-based brightness
        const brightness = 0.6 + (rotated.z + 200) / 600 * 0.4;

        // Glow
        if (isHovered || isDragged) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#4a9eff';
        } else {
          ctx.shadowBlur = 12 * proj.scale;
          ctx.shadowColor = `rgba(74, 158, 255, ${brightness * 0.4})`;
        }

        // Node
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, screenRadius, 0, 2 * Math.PI);
        
        const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, screenRadius);
        const alpha = (0.5 + n.importance * 0.5) * brightness;
        gradient.addColorStop(0, `rgba(74, 158, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(168, 85, 247, ${alpha})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = isHovered || isDragged ? '#ffffff' : `rgba(74, 158, 255, ${brightness})`;
        ctx.lineWidth = (isHovered || isDragged ? 3 : 2) * proj.scale;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Label - show repo name only
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
        ctx.font = `${Math.max(9, 10 * proj.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, proj.x, proj.y - screenRadius - 8);
      });

      frame++;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [graphData, draggedNode, hoveredNode]);

  useEffect(() => {
    if (activeTab === 'graph' && graphData.nodes.length > 0) {
      const cleanup = renderGraph();
      return cleanup;
    }
  }, [activeTab, graphData, renderGraph]);

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h] || '';
        if (String(value).includes(',') || String(value).includes('\n') || String(value).includes('"')) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const exportTrainingData = () => exportToCSV(trainingData, 'training_data.csv');
  const exportCriticalityScores = () => exportToCSV(criticalityScores, 'criticality_scores.csv');
  const exportFundingPriorities = () => exportToCSV(fundingPriorities, 'funding_priorities.csv');

  // -------------------- Chart Helpers --------------------
  const getTopRepos = () => {
    return criticalityScores
      .slice(0, 15)
      .map(repo => ({
        name: repo.repo.split('/')[1],
        score: parseFloat(repo.normalizedScore),
        winRate: parseFloat(repo.winRate)
      }));
  };

  const getTierDistribution = () => {
    const counts = fundingPriorities.reduce((acc, proj) => {
      acc[proj.tier] = (acc[proj.tier] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const order = ['Critical', 'Important', 'Moderate', 'Supporting', 'Peripheral'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  };

  const getFundingByTier = () => {
    const funding = fundingPriorities.reduce((acc, proj) => {
      acc[proj.tier] = (acc[proj.tier] || 0) + proj.recommendedFunding;
      return acc;
    }, {});
    return Object.entries(funding)
      .map(([name, value]) => ({ name, funding: value / 1000 }))
      .sort((a, b) => {
        const order = ['Critical', 'Important', 'Moderate', 'Supporting', 'Peripheral'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  };

  // -------------------- UI --------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="text-purple-400" size={32} />
            <h1 className="text-3xl font-bold text-white">DeepFunding Project Analyzer</h1>
          </div>
          <p className="text-purple-200">Generate training data, calculate criticality scores, and analyze funding priorities for Ethereum ecosystem projects</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['generate', 'scores', 'funding', 'visualizations', 'graph'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              {tab === 'graph' && <Network className="inline mr-2" size={16} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Upload / Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-6 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setDataMode('upload')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  dataMode === 'upload'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                }`}
              >
                <Upload size={20} /> Upload Dataset
              </button>

              <button
                onClick={() => setDataMode('generate')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  dataMode === 'generate'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                }`}
              >
                <Play size={20} /> Generate Dataset
              </button>
            </div>

            {dataMode === 'upload' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Upload Training Dataset (CSV)</h2>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-white border border-white/20 rounded-lg p-2 bg-white/10"
                />
                {trainingData.length > 0 && (
                  <div className="text-purple-300 mt-3">
                    ✅ Loaded {trainingData.length} records from CSV
                  </div>
                )}
              </div>
            )}

            {dataMode === 'generate' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-3">Generate Synthetic Data</h2>
                <label className="block text-purple-200 mb-2">Number of Comparisons</label>
                <input
                  type="number"
                  value={numComparisons}
                  onChange={(e) => setNumComparisons(parseInt(e.target.value))}
                  min="10"
                  max="1000"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
                <button
                  onClick={generateTrainingData}
                  disabled={generating}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
                >
                  <Play size={20} />
                  {generating ? 'Generating...' : 'Generate Training Data'}
                </button>
              </div>
            )}

            {trainingData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-3">
                  Loaded {trainingData.length} Comparisons
                </h3>
                <div className="bg-black/30 rounded-lg p-4 mb-4 max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-purple-300 border-b border-white/20 sticky top-0 bg-slate-900">
                      <tr>
                        <th className="p-2 text-left">Timestamp</th>
                        <th className="p-2 text-left">Juror</th>
                        <th className="p-2 text-left">Repo A</th>
                        <th className="p-2 text-left">Repo B</th>
                        <th className="p-2 text-left">Parent</th>
                        <th className="p-2 text-left">Choice</th>
                        <th className="p-2 text-left">Mult</th>
                        <th className="p-2 text-left">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      {trainingData.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="border-b border-white/10">
                          <td className="p-2">{row.timestamp || '-'}</td>
                          <td className="p-2">{row.juror || '-'}</td>
                          <td className="p-2">{row.repo_a}</td>
                          <td className="p-2">{row.repo_b}</td>
                          <td className="p-2">{row.parent}</td>
                          <td className="p-2 text-center">{row.choice}</td>
                          <td className="p-2 text-center">{row.multiplier}</td>
                          <td className="p-2 text-xs">{row.reasoning ? row.reasoning.substring(0, 50) + '...' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trainingData.length > 50 && (
                    <div className="text-purple-300 text-center mt-2">
                      Showing first 50 of {trainingData.length} records
                    </div>
                  )}
                </div>
                <button
                  onClick={exportTrainingData}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
                >
                  <Download size={20} /> Export CSV
                </button>
              </div>
            )}
          </div>
        )}

        {/* Criticality Scores Tab */}
        {activeTab === 'scores' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Criticality Scores</h2>
              
              <button
                onClick={calculateCriticalityScores}
                disabled={trainingData.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 disabled:opacity-50 mb-6 transition-all"
              >
                <TrendingUp size={20} />
                Calculate Scores
              </button>

              {criticalityScores.length > 0 && (
                <>
                  <button
                    onClick={exportCriticalityScores}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 mb-6 transition-all"
                  >
                    <Download size={20} />
                    Export Scores
                  </button>

                  <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-purple-300 border-b border-white/20">
                        <tr>
                          <th className="p-2 text-left">Rank</th>
                          <th className="p-2 text-left">Repository</th>
                          <th className="p-2 text-left">Score</th>
                          <th className="p-2 text-left">Win Rate</th>
                          <th className="p-2 text-left">Avg Multiplier</th>
                          <th className="p-2 text-left">Comparisons</th>
                        </tr>
                      </thead>
                      <tbody className="text-white">
                        {criticalityScores.map((row, idx) => (
                          <tr key={idx} className="border-b border-white/10">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 text-xs">{row.repo}</td>
                            <td className="p-2">
                              <span className="font-semibold text-purple-400">
                                {row.normalizedScore}
                              </span>
                            </td>
                            <td className="p-2">{row.winRate}%</td>
                            <td className="p-2">{row.avgMultiplier}</td>
                            <td className="p-2">{row.totalComparisons}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Funding Priorities Tab */}
        {activeTab === 'funding' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Funding Priorities</h2>
              
              {fundingPriorities.length > 0 && (
                <>
                  <button
                    onClick={exportFundingPriorities}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 mb-6 transition-all"
                  >
                    <Download size={20} />
                    Export Priorities
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4">
                      <div className="text-purple-200 text-sm">Critical Projects</div>
                      <div className="text-3xl font-bold text-white">
                        {fundingPriorities.filter(p => p.tier === 'Critical').length}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4">
                      <div className="text-blue-200 text-sm">Total Funding</div>
                      <div className="text-3xl font-bold text-white">
                        ${(fundingPriorities.reduce((sum, p) => sum + p.recommendedFunding, 0) / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-4">
                      <div className="text-green-200 text-sm">Avg Win Rate</div>
                      <div className="text-3xl font-bold text-white">
                        {(fundingPriorities.reduce((sum, p) => sum + parseFloat(p.winRate), 0) / fundingPriorities.length).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-600 to-pink-800 rounded-lg p-4">
                      <div className="text-pink-200 text-sm">Projects Analyzed</div>
                      <div className="text-3xl font-bold text-white">
                        {fundingPriorities.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-purple-300 border-b border-white/20">
                        <tr>
                          <th className="p-2 text-left">Rank</th>
                          <th className="p-2 text-left">Repository</th>
                          <th className="p-2 text-left">Tier</th>
                          <th className="p-2 text-left">Score</th>
                          <th className="p-2 text-left">Funding Level</th>
                          <th className="p-2 text-left">Recommended $</th>
                        </tr>
                      </thead>
                      <tbody className="text-white">
                        {fundingPriorities.map((row) => (
                          <tr key={row.rank} className="border-b border-white/10">
                            <td className="p-2">{row.rank}</td>
                            <td className="p-2 text-xs">{row.repo}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                row.tier === 'Critical' ? 'bg-red-600' :
                                row.tier === 'Important' ? 'bg-orange-600' :
                                row.tier === 'Moderate' ? 'bg-yellow-600' :
                                row.tier === 'Supporting' ? 'bg-blue-600' :
                                'bg-gray-600'
                              }`}>
                                {row.tier}
                              </span>
                            </td>
                            <td className="p-2 font-semibold text-purple-400">{row.criticalityScore}</td>
                            <td className="p-2 text-xs">{row.fundingLevel}</td>
                            <td className="p-2 font-semibold text-green-400">
                              ${(row.recommendedFunding / 1000).toFixed(0)}K
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {fundingPriorities.length === 0 && (
                <div className="text-center text-purple-300 py-12">
                  Calculate criticality scores first to see funding priorities
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visualizations Tab */}
        {activeTab === 'visualizations' && (
          <div className="space-y-6">
            {criticalityScores.length > 0 ? (
              <>
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">Top 15 Repositories by Criticality Score</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getTopRepos()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #ffffff20', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="score" fill="#a855f7" name="Criticality Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">Criticality Score vs Win Rate</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="score" name="Score" stroke="#fff" />
                      <YAxis dataKey="winRate" name="Win Rate" stroke="#fff" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #ffffff20', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Scatter data={getTopRepos()} fill="#ec4899" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">Project Distribution by Tier</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getTierDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="name" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #ffffff20', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">Funding Allocation by Tier (K$)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getFundingByTier()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="name" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #ffffff20', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="funding" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
                <FileText className="mx-auto mb-4 text-purple-400" size={64} />
                <h3 className="text-2xl font-bold text-white mb-2">No Data to Visualize</h3>
                <p className="text-purple-300">Generate training data and calculate criticality scores first</p>
              </div>
            )}
          </div>
        )}

        {/* Dependency Graph Tab */}
        {activeTab === 'graph' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Dependency Graph</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={buildDependencyGraph}
                  disabled={trainingData.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                >
                  <Network size={20} />
                  Build Graph
                </button>

                <div className="flex items-center gap-2">
                  <label className="text-purple-200 text-sm">Min Edge Count:</label>
                  <input
                    type="number"
                    value={minEdgeCount}
                    onChange={(e) => setMinEdgeCount(parseInt(e.target.value))}
                    min="1"
                    max="10"
                    className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  />
                </div>

                {graphData.nodes.length > 0 && (
                  <div className="text-purple-300 text-sm">
                    {graphData.nodes.length} nodes, {graphData.edges.length} edges
                  </div>
                )}
              </div>

              {graphData.nodes.length > 0 ? (
                <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                  <canvas 
                    ref={canvasRef} 
                    className="w-full rounded-lg"
                    style={{ height: '700px', cursor: 'grab' }}
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-purple-900/30 rounded-lg p-3">
                      <div className="text-purple-300 text-xs mb-1">🖱️ Drag Nodes</div>
                      <div className="text-white text-sm">Click and drag individual nodes</div>
                    </div>
                    <div className="bg-blue-900/30 rounded-lg p-3">
                      <div className="text-blue-300 text-xs mb-1">🔄 Rotate View</div>
                      <div className="text-white text-sm">Drag background to rotate 3D space</div>
                    </div>
                    <div className="bg-cyan-900/30 rounded-lg p-3">
                      <div className="text-cyan-300 text-xs mb-1">📊 Visual Cues</div>
                      <div className="text-white text-sm">Size = importance, brightness = depth</div>
                    </div>
                    <div className="bg-green-900/30 rounded-lg p-3">
                      <div className="text-green-300 text-xs mb-1">🎨 Clean Design</div>
                      <div className="text-white text-sm">Pure nodes and edges visualization</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/30 rounded-lg p-12 border border-white/10 text-center">
                  <Network className="mx-auto mb-4 text-purple-400" size={64} />
                  <h3 className="text-2xl font-bold text-white mb-2">No Graph Data</h3>
                  <p className="text-purple-300">Load training data and click "Build Graph"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepFundingAnalyzer;