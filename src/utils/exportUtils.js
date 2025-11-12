// src/utils/exportUtils.js

import { EXPORT_PATTERNS } from './constants';

/**
 * Export data to CSV format
 * Handles proper escaping and formatting
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 * @param {Object} options - Export options
 */
export const exportToCSV = (data, filename, options = {}) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    alert('No data available to export');
    return;
  }
  
  const {
    includeTimestamp = false,
    customHeaders = null,
    dateFormat = 'ISO'
  } = options;
  
  // Add timestamp to filename if requested
  let finalFilename = filename;
  if (includeTimestamp) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    finalFilename = `${filename.replace('.csv', '')}_${timestamp}.csv`;
  }
  
  // Ensure .csv extension
  if (!finalFilename.endsWith('.csv')) {
    finalFilename += '.csv';
  }
  
  // Get headers
  const dataHeaders = Object.keys(data[0]);
  const headers = customHeaders || dataHeaders;
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      dataHeaders.map(header => {
        let value = row[header];
        
        // Handle different data types
        if (value === null || value === undefined) {
          return '';
        }
        
        // Format dates
        if (value instanceof Date) {
          value = dateFormat === 'ISO' ? value.toISOString() : value.toLocaleString();
        }
        
        // Convert to string
        value = String(value);
        
        // Escape values containing commas, quotes, or newlines
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // Download file
  downloadFile(csvContent, finalFilename, 'text/csv;charset=utf-8;');
  
  console.log(`Exported ${data.length} rows to ${finalFilename}`);
};

/**
 * Export data to JSON format
 * @param {Object|Array} data - Data to export
 * @param {string} filename - Name of the file to download
 * @param {Object} options - Export options
 */
export const exportToJSON = (data, filename, options = {}) => {
  if (!data) {
    console.warn('No data to export');
    alert('No data available to export');
    return;
  }
  
  const {
    pretty = true,
    includeMetadata = false
  } = options;
  
  let exportData = data;
  
  // Add metadata if requested
  if (includeMetadata) {
    exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        version: '1.0'
      },
      data: data
    };
  }
  
  // Stringify with optional formatting
  const jsonContent = pretty 
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
  
  // Ensure .json extension
  let finalFilename = filename;
  if (!finalFilename.endsWith('.json')) {
    finalFilename += '.json';
  }
  
  downloadFile(jsonContent, finalFilename, 'application/json');
  
  console.log(`Exported data to ${finalFilename}`);
};

/**
 * Download file to user's computer
 * @param {string} content - File content
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Import CSV data from file
 * @param {File} file - CSV file to import
 * @returns {Promise<Array>} Promise resolving to array of objects
 */
export const importFromCSV = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    if (!file.name.endsWith('.csv')) {
      reject(new Error('File must be a CSV'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim());
        
        if (rows.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }
        
        // Parse headers
        const headers = parseCSVRow(rows[0]);
        
        // Parse data rows
        const data = rows.slice(1).map((row, index) => {
          try {
            const values = parseCSVRow(row);
            const obj = {};
            
            headers.forEach((header, idx) => {
              let value = values[idx] || '';
              
              // Try to parse numbers
              if (value && !isNaN(value) && value.trim() !== '') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  value = numValue;
                }
              }
              
              obj[header] = value;
            });
            
            return obj;
          } catch (err) {
            console.warn(`Error parsing row ${index + 2}:`, err);
            return null;
          }
        }).filter(obj => obj !== null);
        
        console.log(`Imported ${data.length} rows from CSV`);
        resolve(data);
        
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Parse a CSV row handling quoted values and escapes
 * @param {string} row - CSV row string
 * @returns {Array} Array of values
 */
const parseCSVRow = (row) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  
  return values;
};

/**
 * Import JSON data from file
 * @param {File} file - JSON file to import
 * @returns {Promise<Object|Array>} Promise resolving to parsed data
 */
export const importFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    if (!file.name.endsWith('.json')) {
      reject(new Error('File must be a JSON file'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        console.log('Imported JSON data');
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Format data for export with custom transformations
 * @param {Array} data - Data to format
 * @param {Object} options - Formatting options
 * @returns {Array} Formatted data
 */
export const formatForExport = (data, options = {}) => {
  if (!data || data.length === 0) {
    return [];
  }

  const {
    includeTimestamp = false,
    roundNumbers = 2,
    customHeaders = null,
    filterColumns = null,
    sortBy = null
  } = options;
  
  let formatted = data.map(row => {
    const newRow = { ...row };
    
    // Round numeric values
    Object.keys(newRow).forEach(key => {
      if (typeof newRow[key] === 'number') {
        newRow[key] = parseFloat(newRow[key].toFixed(roundNumbers));
      }
    });
    
    // Add timestamp if requested
    if (includeTimestamp && !newRow.exportTimestamp) {
      newRow.exportTimestamp = new Date().toISOString();
    }
    
    return newRow;
  });
  
  // Filter columns if specified
  if (filterColumns && Array.isArray(filterColumns)) {
    formatted = formatted.map(row => {
      const filtered = {};
      filterColumns.forEach(col => {
        if (col in row) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
  }
  
  // Apply custom headers if provided
  if (customHeaders) {
    formatted = formatted.map(row => {
      const mapped = {};
      Object.keys(customHeaders).forEach(oldKey => {
        if (oldKey in row) {
          mapped[customHeaders[oldKey]] = row[oldKey];
        }
      });
      return mapped;
    });
  }
  
  // Sort if requested
  if (sortBy) {
    formatted.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return bVal - aVal; // Descending for numbers
      }
      
      return String(aVal).localeCompare(String(bVal));
    });
  }
  
  return formatted;
};

/**
 * Generate markdown report from data
 * @param {Object} reportData - Report data with sections
 * @param {string} title - Report title
 * @returns {string} Markdown formatted report
 */
export const generateMarkdownReport = (reportData, title = 'DeepFunding Analysis Report') => {
  let markdown = `# ${title}\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `---\n\n`;
  
  // Summary section
  if (reportData.summary) {
    markdown += `## Executive Summary\n\n`;
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      markdown += `- **${label}:** ${value}\n`;
    });
    markdown += `\n`;
  }
  
  // Top projects section
  if (reportData.topProjects && reportData.topProjects.length > 0) {
    markdown += `## Top Projects\n\n`;
    markdown += `| Rank | Repository | Score | Tier | Funding |\n`;
    markdown += `|------|------------|-------|------|----------|\n`;
    reportData.topProjects.forEach(project => {
      const funding = project.recommendedFunding 
        ? `$${(project.recommendedFunding / 1000).toFixed(0)}K`
        : 'N/A';
      markdown += `| ${project.rank} | ${project.repo} | ${project.criticalityScore} | ${project.tier} | ${funding} |\n`;
    });
    markdown += `\n`;
  }
  
  // Distribution section
  if (reportData.distribution) {
    markdown += `## Funding Distribution by Tier\n\n`;
    markdown += `| Tier | Projects | Total Funding | Avg Funding | Percentage |\n`;
    markdown += `|------|----------|---------------|-------------|------------|\n`;
    Object.entries(reportData.distribution).forEach(([tier, data]) => {
      if (data.count > 0) {
        const total = `$${(data.totalFunding / 1000).toFixed(0)}K`;
        const avg = `$${(data.avgFunding / 1000).toFixed(0)}K`;
        markdown += `| ${tier} | ${data.count} | ${total} | ${avg} | ${data.percentage}% |\n`;
      }
    });
    markdown += `\n`;
  }
  
  // Recommendations section
  if (reportData.recommendations && reportData.recommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    reportData.recommendations.forEach((rec, index) => {
      markdown += `### ${index + 1}. ${rec.category}\n\n`;
      markdown += `**Priority:** ${rec.priority}\n\n`;
      markdown += `${rec.message}\n\n`;
      markdown += `**Recommended Action:** ${rec.action}\n\n`;
    });
  }
  
  // Footer
  markdown += `---\n\n`;
  markdown += `*This report was automatically generated by DeepFunding Analyzer*\n`;
  
  return markdown;
};

/**
 * Export markdown report
 * @param {Object} reportData - Report data
 * @param {string} filename - Output filename
 * @param {string} title - Report title
 */
export const exportMarkdownReport = (reportData, filename = 'report.md', title) => {
  const markdown = generateMarkdownReport(reportData, title);
  downloadFile(markdown, filename, 'text/markdown');
  console.log(`Exported markdown report to ${filename}`);
};

/**
 * Copy data to clipboard
 * @param {Array|Object} data - Data to copy
 * @param {string} format - Format: 'json', 'csv', 'text'
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (data, format = 'json') => {
  try {
    let content;
    
    switch (format) {
      case 'csv':
        const headers = Object.keys(data[0] || {});
        content = [
          headers.join(','),
          ...data.map(row => headers.map(h => row[h]).join(','))
        ].join('\n');
        break;
      
      case 'text':
        content = JSON.stringify(data, null, 2);
        break;
      
      case 'json':
      default:
        content = JSON.stringify(data, null, 2);
        break;
    }
    
    await navigator.clipboard.writeText(content);
    console.log(`Copied ${format} data to clipboard`);
    return true;
    
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Get file size estimate for data
 * @param {Array|Object} data - Data to estimate
 * @param {string} format - Format: 'json' or 'csv'
 * @returns {Object} Size information
 */
export const estimateFileSize = (data, format = 'json') => {
  let content;
  
  if (format === 'csv' && Array.isArray(data)) {
    const headers = Object.keys(data[0] || {});
    content = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
  } else {
    content = JSON.stringify(data);
  }
  
  const bytes = new Blob([content]).size;
  
  return {
    bytes: bytes,
    kilobytes: (bytes / 1024).toFixed(2),
    megabytes: (bytes / 1024 / 1024).toFixed(2),
    formatted: bytes < 1024 
      ? `${bytes} B`
      : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(2)} KB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MB`
  };
};

/**
 * Default export
 */
export default {
  exportToCSV,
  exportToJSON,
  importFromCSV,
  importFromJSON,
  formatForExport,
  generateMarkdownReport,
  exportMarkdownReport,
  copyToClipboard,
  estimateFileSize
};