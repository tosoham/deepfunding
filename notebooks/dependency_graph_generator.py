import polars as pl
from pyvis.network import Network
from pathlib import Path
import networkx as nx


sep_path = Path("dataset_Sep_9_2025")
oct_path = Path("dataset_Oct_9_2025")

def load_dataset(folder):
    return {
        "train": pl.read_csv(folder / "train.csv"),
        "raw_private": pl.read_csv(folder / "raw_private.csv", ignore_errors=True) if (folder / "raw_private.csv").exists() else None,
    }

sep_data = load_dataset(sep_path)
oct_data = load_dataset(oct_path)

def combine_data(data):
    dfs = [df for df in data.values() if df is not None]
    return pl.concat(dfs, how="diagonal")

merged_df: pl.DataFrame = pl.concat([combine_data(sep_data), combine_data(oct_data)], how="diagonal")

print("Total rows:", merged_df.height)

# --- Normalize columns ---
merged_df = merged_df.with_columns([
    pl.col("repo_a").str.strip_chars().str.strip_chars_end('/').str.to_lowercase().alias("repo_a"),
    pl.col("repo_b").str.strip_chars().str.strip_chars_end('/').str.to_lowercase().alias("repo_b"),
    pl.col("parent").str.strip_chars().str.strip_chars_end('/').str.to_lowercase().alias("parent")
])

merged_df = merged_df.filter(pl.col("repo_a") != pl.col("repo_b"))
merged_df = merged_df.drop_nulls(["repo_a", "repo_b", "parent"])

# --- Create edges with weights ---
edges_df = merged_df.select([
    pl.col("repo_a").alias("source"),
    pl.col("repo_b").alias("target"),
    pl.col("multiplier")
])

# Aggregate duplicates
edges_df = edges_df.group_by(["source", "target"]).agg(
    pl.col("multiplier").mean().alias("multiplier"),
    pl.col("multiplier").count().alias("count")
)

print(f"Total unique edges: {edges_df.height}")

# --- Filter to reduce clutter (optional but recommended) ---
# Keep only edges with count >= 2 OR multiplier >= certain threshold
MIN_COUNT = 2  # Adjust this to filter more/less aggressively
edges_df = edges_df.filter(pl.col("count") >= MIN_COUNT)
print(f"Filtered edges (count >= {MIN_COUNT}): {edges_df.height}")

# --- Build NetworkX graph for better layout preprocessing ---
G = nx.DiGraph()

for row in edges_df.iter_rows(named=True):
    G.add_edge(row["source"], row["target"], weight=row["multiplier"], count=row["count"])

# --- Filter to largest connected component (optional) ---
if not nx.is_weakly_connected(G):
    largest_cc = max(nx.weakly_connected_components(G), key=len)
    G = G.subgraph(largest_cc).copy()
    print(f"Using largest connected component: {len(G.nodes())} nodes, {len(G.edges())} edges")

# --- Compute node importance (PageRank or degree) ---
pagerank = nx.pagerank(G, alpha=0.85)

# --- Initialize PyVis with better defaults ---
net = Network(
    height="900px", 
    width="100%", 
    directed=True, 
    bgcolor="#0a0a0a", 
    font_color="#ffffff",
    notebook=False
)

# --- Add nodes with size based on importance ---
for node in G.nodes():
    importance = pagerank.get(node, 0)
    node_size = 10 + (importance * 500)  # Scale size by PageRank
    
    net.add_node(
        node, 
        label=node.split("/")[-1],  # Show only repo name
        title=f"{node}\nImportance: {importance:.4f}",  # Hover info
        size=node_size,
        color="#4a9eff"
    )

# --- Add edges with width based on count ---
for source, target, data in G.edges(data=True):
    edge_width = min(data['count'] * 0.5, 5)  # Cap width at 5
    
    net.add_edge(
        source, 
        target, 
        value=edge_width,
        title=f"Count: {data['count']}, Multiplier: {data['weight']:.2f}"
    )

# --- Optimized physics settings for clean layout ---
net.set_options("""
var options = {
  "physics": {
    "enabled": true,
    "stabilization": {
      "enabled": true,
      "iterations": 1000,
      "fit": true
    },
    "barnesHut": {
      "gravitationalConstant": -8000,
      "centralGravity": 0.3,
      "springLength": 250,
      "springConstant": 0.04,
      "damping": 0.2,
      "avoidOverlap": 0.5
    },
    "maxVelocity": 50,
    "minVelocity": 0.75,
    "solver": "barnesHut",
    "timestep": 0.5
  },
  "edges": {
    "smooth": {
      "enabled": true,
      "type": "continuous",
      "roundness": 0.5
    },
    "arrows": {
      "to": {
        "enabled": true,
        "scaleFactor": 0.5
      }
    },
    "color": {
      "color": "#848484",
      "highlight": "#4a9eff",
      "hover": "#4a9eff"
    }
  },
  "nodes": {
    "shape": "dot",
    "font": {
      "size": 12,
      "face": "Arial"
    },
    "borderWidth": 2,
    "borderWidthSelected": 3
  },
  "interaction": {
    "hover": true,
    "navigationButtons": true,
    "keyboard": true,
    "tooltipDelay": 100,
    "zoomView": true,
    "dragView": true
  }
}
""")

# --- Save ---
output_file = "dependency_graph_clean.html"
net.write_html(output_file)
print(f"✅ Clean dependency graph written to {output_file}")
print(f"   Nodes: {len(G.nodes())}, Edges: {len(G.edges())}")