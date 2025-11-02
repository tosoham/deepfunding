import polars as pl
from pyvis.network import Network

df = pl.read_csv("dataset_Oct_9_2025/train.csv")

df = df.with_columns([
    pl.col("repo_a").str.strip_chars().str.strip_chars_end("/").str.to_lowercase(),
    pl.col("repo_b").str.strip_chars().str.strip_chars_end("/").str.to_lowercase(),
    pl.col("parent").str.strip_chars().str.strip_chars_end("/").str.to_lowercase()
])

df = df.filter((pl.col("repo_a") != pl.col("repo_b")) & (pl.col("multiplier") > 0))
df = df.drop_nulls(["repo_a", "repo_b", "parent"])

df = df.with_columns([
    pl.when(pl.col("repo_a") < pl.col("repo_b"))
      .then(pl.col("repo_a")).otherwise(pl.col("repo_b")).alias("source"),
    pl.when(pl.col("repo_a") < pl.col("repo_b"))
      .then(pl.col("repo_b")).otherwise(pl.col("repo_a")).alias("target")
])

edges_df = df.select([
    pl.col("source"),
    pl.col("target"),
    pl.when(pl.col("multiplier") < 0.5)
      .then(0.5)
      .when(pl.col("multiplier") > 10.0)
      .then(10.0)
      .otherwise(pl.col("multiplier"))
      .alias("weight")
]).group_by(["source", "target"]).agg(pl.col("weight").mean())

edges_df = edges_df.sort("weight", descending=True).head(1000)

net = Network(height="800px", width="100%", directed=True, bgcolor="#111", font_color="#EEE")

for row in edges_df.iter_rows(named=True):
    net.add_node(row["source"], label=row["source"].split("/")[-1])
    net.add_node(row["target"], label=row["target"].split("/")[-1])
    net.add_edge(row["source"], row["target"], value=row["weight"])

net.toggle_physics(True)
net.set_options("""
var options = {
  "physics": {
    "stabilization": { "enabled": true, "iterations": 1500 },
    "barnesHut": {
      "gravitationalConstant": -3000,
      "centralGravity": 0.3,
      "springLength": 180,
      "springConstant": 0.05,
      "damping": 0.1
    }
  },
  "edges": {
    "color": {"inherit": true},
    "smooth": false
  },
  "nodes": {
    "shape": "dot",
    "scaling": {"min": 5, "max": 25},
    "font": {"size": 14}
  }
}
""")

net.write_html("dependency_graph_october_clean.html")
print("✅ Cleaned and stable dependency graph saved as dependency_graph_october_clean.html")
