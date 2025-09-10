import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

class CriticalityScorer:
    """
    Criticality Score Calculator based on OpenSSF methodology
    Quantifies project importance for infrastructure funding decisions
    """
    
    def __init__(self):
        self.weights = {
            'created_since': 1.0,
            'updated_since': -1.0,
            'contributor_count': 2.0,
            'org_count': 1.0,
            'commit_frequency': 1.0,
            'recent_releases': 0.5,
            'closed_issues_count': 0.5,
            'updated_issues_count': 0.5,
            'new_contributors': 2.0,
            'dependents_count': 2.0,
            'subscribers_count': 1.0,
            'language_count': 0.5,
        }
        
    def load_project_data(self, file_path=None, sample_data=False):
        if sample_data or file_path is None:
            return self._generate_sample_data()
        else:
            return pd.read_csv(file_path)
    
    def _generate_sample_data(self):
        np.random.seed(42)
        projects = []
        
        project_names = [
            'critical-crypto-lib', 'data-pipeline-core', 'network-security-utils',
            'database-connector', 'logging-framework', 'config-parser',
            'http-client-lib', 'authentication-service', 'cache-manager',
            'serialization-lib', 'compression-utils', 'validation-framework'
        ]
        
        for i, name in enumerate(project_names):
            created_days_ago = np.random.randint(30, 2000)
            updated_days_ago = np.random.randint(1, 365)
            
            project = {
                'name': name,
                'url': f'https://github.com/DeepFunding/{name}',
                'created_since': created_days_ago,
                'updated_since': updated_days_ago,
                'contributor_count': np.random.randint(1, 100),
                'org_count': np.random.randint(1, 20),
                'commit_frequency': np.random.uniform(0.1, 10.0),
                'recent_releases': np.random.randint(0, 20),
                'closed_issues_count': np.random.randint(5, 500),
                'updated_issues_count': np.random.randint(1, 100),
                'new_contributors': np.random.randint(0, 30),
                'dependents_count': np.random.randint(10, 10000),
                'subscribers_count': np.random.randint(5, 1000),
                'language_count': np.random.randint(1, 8),
                'stars': np.random.randint(10, 50000),
                'forks': np.random.randint(5, 5000)
            }
            projects.append(project)
        
        return pd.DataFrame(projects)
    
    def normalize_metrics(self, df):
        normalized_df = df.copy()
        
        log_metrics = [
            'contributor_count', 'org_count', 'commit_frequency', 'recent_releases',
            'closed_issues_count', 'updated_issues_count', 'new_contributors',
            'dependents_count', 'subscribers_count'
        ]
        
        for metric in log_metrics:
            if metric in df.columns:
                log_values = np.log10(df[metric] + 1)
                normalized_df[metric] = (log_values - log_values.min()) / (log_values.max() - log_values.min()) * 10
        
        if 'created_since' in df.columns:
            normalized_df['created_since'] = (df['created_since'] / df['created_since'].max()) * 10
        
        if 'updated_since' in df.columns:
            normalized_df['updated_since'] = (1 - df['updated_since'] / df['updated_since'].max()) * 10
        
        simple_metrics = ['language_count']
        for metric in simple_metrics:
            if metric in df.columns:
                normalized_df[metric] = (df[metric] / df[metric].max()) * 10
        
        return normalized_df
    
    def calculate_criticality_score(self, df):
        normalized_df = self.normalize_metrics(df)
        scores = []
        
        for _, row in normalized_df.iterrows():
            score = 0
            for metric, weight in self.weights.items():
                if metric in row:
                    score += weight * row[metric]
            scores.append(max(0, score))  
        
        df_with_scores = df.copy()
        df_with_scores['criticality_score'] = scores
        df_with_scores['criticality_rank'] = df_with_scores['criticality_score'].rank(ascending=False, method='dense')
        
        return df_with_scores.sort_values('criticality_score', ascending=False)
    
    def get_funding_priorities(self, df_scored, top_n=10):
        return df_scored.head(top_n)[['name', 'criticality_score', 'criticality_rank', 
                                     'dependents_count', 'contributor_count', 'updated_since']]
    
    def analyze_underfunded_critical_projects(self, df_scored, threshold_percentile=75):
        """Identify critical projects that might be underfunded (high criticality, low visibility)"""
        high_criticality_threshold = np.percentile(df_scored['criticality_score'], threshold_percentile)
        low_visibility_threshold = np.percentile(df_scored['stars'], 25)  
        
        underfunded = df_scored[
            (df_scored['criticality_score'] >= high_criticality_threshold) &
            (df_scored['stars'] <= low_visibility_threshold)
        ]
        
        return underfunded[['name', 'criticality_score', 'stars', 'dependents_count', 
                          'contributor_count']].sort_values('criticality_score', ascending=False)
    
    def visualize_results(self, df_scored):
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        axes[0, 0].hist(df_scored['criticality_score'], bins=20, alpha=0.7, color='skyblue')
        axes[0, 0].set_title('Distribution of Criticality Scores')
        axes[0, 0].set_xlabel('Criticality Score')
        axes[0, 0].set_ylabel('Number of Projects')
        
        top_10 = df_scored.head(10)
        axes[0, 1].barh(range(len(top_10)), top_10['criticality_score'])
        axes[0, 1].set_yticks(range(len(top_10)))
        axes[0, 1].set_yticklabels(top_10['name'], fontsize=8)
        axes[0, 1].set_title('Top 10 Critical Projects')
        axes[0, 1].set_xlabel('Criticality Score')
        
        scatter = axes[1, 0].scatter(df_scored['dependents_count'], df_scored['criticality_score'], 
                                   alpha=0.6, c=df_scored['contributor_count'], cmap='viridis')
        axes[1, 0].set_xlabel('Number of Dependents')
        axes[1, 0].set_ylabel('Criticality Score')
        axes[1, 0].set_title('Criticality vs Dependencies (colored by contributors)')
        plt.colorbar(scatter, ax=axes[1, 0], label='Contributors')
        
        axes[1, 1].scatter(df_scored['stars'], df_scored['criticality_score'], alpha=0.6, color='coral')
        axes[1, 1].set_xlabel('Stars (Visibility Proxy)')
        axes[1, 1].set_ylabel('Criticality Score')
        axes[1, 1].set_title('Potential Funding Gap Analysis')
        
        z = np.polyfit(df_scored['stars'], df_scored['criticality_score'], 1)
        p = np.poly1d(z)
        axes[1, 1].plot(df_scored['stars'], p(df_scored['stars']), "r--", alpha=0.8)
        
        plt.tight_layout()
        return fig
    
    def generate_report(self, df_scored):
        report = {
            'summary': {
                'total_projects': len(df_scored),
                'avg_criticality_score': df_scored['criticality_score'].mean(),
                'median_criticality_score': df_scored['criticality_score'].median(),
                'std_criticality_score': df_scored['criticality_score'].std()
            },
            'top_critical_projects': self.get_funding_priorities(df_scored, 5).to_dict('records'),
            'underfunded_critical': self.analyze_underfunded_critical_projects(df_scored).head(5).to_dict('records'),
            'metrics_correlation': self._calculate_metric_correlations(df_scored)
        }
        return report
    
    def _calculate_metric_correlations(self, df_scored):
        numeric_cols = df_scored.select_dtypes(include=[np.number]).columns
        correlations = df_scored[numeric_cols].corr()['criticality_score'].drop('criticality_score')
        return correlations.sort_values(ascending=False).to_dict()

# Example usage and demonstration
def main():
    print("🔍 Deep Funding Attribution Optimizer - Criticality Scorer")
    print("=" * 60)
    
    scorer = CriticalityScorer()
    
    print("\n📊 Loading project data...")
    df = scorer.load_project_data(sample_data='sample_submission.csv')
    print(f"Loaded {len(df)} projects")
    
    print("\n🧮 Calculating criticality scores...")
    df_scored = scorer.calculate_criticality_score(df)
    
    print("\n🎯 Top Funding Priorities:")
    print(scorer.get_funding_priorities(df_scored, 5).to_string(index=False))
    
    print("\n⚠️  Potentially Underfunded Critical Projects:")
    underfunded = scorer.analyze_underfunded_critical_projects(df_scored)
    if not underfunded.empty:
        print(underfunded.to_string(index=False))
    else:
        print("No significantly underfunded critical projects identified with current thresholds.")
    
    print("\n📋 Generating comprehensive report...")
    report = scorer.generate_report(df_scored)
    
    print(f"\n📈 Summary Statistics:")
    print(f"  Total Projects: {report['summary']['total_projects']}")
    print(f"  Average Criticality Score: {report['summary']['avg_criticality_score']:.2f}")
    print(f"  Median Criticality Score: {report['summary']['median_criticality_score']:.2f}")
    
    print(f"\n🔗 Top Metric Correlations with Criticality:")
    for metric, corr in list(report['metrics_correlation'].items())[:5]:
        print(f"  {metric}: {corr:.3f}")
    
    print("\n📊 Creating visualizations...")
    fig = scorer.visualize_results(df_scored)
    plt.show()
    
    return df_scored, report

if __name__ == "__main__":
    scored_data, analysis_report = main()