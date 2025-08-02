#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const auditConfig = require('./audit-config');

class SecurityAuditor {
  constructor(config) {
    this.config = config;
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0
      },
      contracts: [],
      backend: [],
      frontend: [],
      general: []
    };
  }

  async runFullAudit() {
    console.log('🔒 Starting comprehensive security audit...\n');

    try {
      await this.auditSmartContracts();
      await this.auditBackendDependencies();
      await this.auditFrontendDependencies();
      await this.auditSecrets();
      await this.auditSecurityHeaders();
      await this.auditInputValidation();
      await this.generateReport();

      console.log('\n✅ Security audit completed successfully!');
      console.log(`📊 Report saved to: ${this.config.reporting.output}`);
      
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }

  async auditSmartContracts() {
    console.log('🔍 Auditing smart contracts...');
    
    try {
      // Run Hardhat tests with coverage
      console.log('  - Running contract tests with coverage...');
      execSync('npx hardhat test --verbose', { stdio: 'pipe' });
      
      // Run Slither static analysis (if available)
      try {
        console.log('  - Running Slither static analysis...');
        const slitherOutput = execSync('slither . --json -', { stdio: 'pipe' }).toString();
        const slitherResults = JSON.parse(slitherOutput);
        
        slitherResults.results?.detectors?.forEach(detector => {
          this.addFinding('contracts', {
            type: 'static-analysis',
            severity: detector.impact,
            title: detector.check,
            description: detector.description,
            file: detector.elements?.[0]?.source_mapping?.filename,
            line: detector.elements?.[0]?.source_mapping?.lines?.[0]
          });
        });
      } catch (slitherError) {
        console.log('    ⚠️  Slither not available, skipping static analysis');
      }

      // Run MythX analysis (if API key available)
      if (process.env.MYTHX_API_KEY) {
        try {
          console.log('  - Running MythX security analysis...');
          execSync('npx truffle run mythx --mode quick', { stdio: 'pipe' });
        } catch (mythxError) {
          console.log('    ⚠️  MythX analysis failed, skipping');
        }
      }

      // Check for common vulnerabilities
      this.checkContractVulnerabilities();
      
      console.log('  ✅ Smart contract audit completed');
      
    } catch (error) {
      this.addFinding('contracts', {
        type: 'compilation',
        severity: 'high',
        title: 'Contract Compilation Failed',
        description: error.message
      });
    }
  }

  checkContractVulnerabilities() {
    const contractFiles = this.getContractFiles();
    
    contractFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for reentrancy protection
      if (content.includes('external') && !content.includes('nonReentrant')) {
        this.addFinding('contracts', {
          type: 'vulnerability',
          severity: 'high',
          title: 'Potential Reentrancy Vulnerability',
          description: 'External function calls without reentrancy protection',
          file: file
        });
      }

      // Check for unchecked external calls
      if (content.includes('.call(') && !content.includes('require(')) {
        this.addFinding('contracts', {
          type: 'vulnerability',
          severity: 'moderate',
          title: 'Unchecked External Call',
          description: 'External call without checking return value',
          file: file
        });
      }

      // Check for proper access control
      if (content.includes('onlyOwner') || content.includes('onlyAdmin')) {
        if (!content.includes('AccessControl') && !content.includes('Ownable')) {
          this.addFinding('contracts', {
            type: 'vulnerability',
            severity: 'high',
            title: 'Insufficient Access Control',
            description: 'Custom access control without proper implementation',
            file: file
          });
        }
      }

      // Check for proper randomness
      if (content.includes('random') && !content.includes('VRF')) {
        this.addFinding('contracts', {
          type: 'vulnerability',
          severity: 'high',
          title: 'Weak Randomness',
          description: 'Using weak randomness source instead of VRF',
          file: file
        });
      }
    });
  }

  async auditBackendDependencies() {
    console.log('🔍 Auditing backend dependencies...');
    
    try {
      // Run npm audit for backend
      const auditOutput = execSync('cd backend && npm audit --json', { stdio: 'pipe' }).toString();
      const auditResults = JSON.parse(auditOutput);
      
      Object.values(auditResults.vulnerabilities || {}).forEach(vuln => {
        if (this.config.backend.dependencies.severity.includes(vuln.severity)) {
          this.addFinding('backend', {
            type: 'dependency',
            severity: vuln.severity,
            title: `Vulnerable dependency: ${vuln.name}`,
            description: vuln.via?.[0]?.title || 'Dependency vulnerability',
            package: vuln.name,
            version: vuln.range
          });
        }
      });
      
      console.log('  ✅ Backend dependency audit completed');
      
    } catch (error) {
      console.log('  ⚠️  Backend dependency audit failed:', error.message);
    }
  }

  async auditFrontendDependencies() {
    console.log('🔍 Auditing frontend dependencies...');
    
    try {
      // Run npm audit for frontend
      const auditOutput = execSync('npm audit --json', { stdio: 'pipe' }).toString();
      const auditResults = JSON.parse(auditOutput);
      
      Object.values(auditResults.vulnerabilities || {}).forEach(vuln => {
        if (this.config.frontend.dependencies.severity.includes(vuln.severity)) {
          this.addFinding('frontend', {
            type: 'dependency',
            severity: vuln.severity,
            title: `Vulnerable dependency: ${vuln.name}`,
            description: vuln.via?.[0]?.title || 'Dependency vulnerability',
            package: vuln.name,
            version: vuln.range
          });
        }
      });
      
      console.log('  ✅ Frontend dependency audit completed');
      
    } catch (error) {
      console.log('  ⚠️  Frontend dependency audit failed:', error.message);
    }
  }

  async auditSecrets() {
    console.log('🔍 Scanning for exposed secrets...');
    
    const patterns = this.config.general.secrets.patterns;
    const files = this.getAllFiles(['.env*', 'src/**/*.ts', 'src/**/*.tsx', 'backend/src/**/*.ts']);
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        patterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'gi');
          const matches = content.match(regex);
          
          if (matches) {
            this.addFinding('general', {
              type: 'secrets',
              severity: 'critical',
              title: 'Potential Secret Exposed',
              description: `Found pattern "${pattern}" in ${file}`,
              file: file,
              pattern: pattern
            });
          }
        });
      }
    });
    
    console.log('  ✅ Secret scanning completed');
  }

  async auditSecurityHeaders() {
    console.log('🔍 Auditing security headers configuration...');
    
    // Check backend security headers
    const backendIndexFile = 'backend/src/index.ts';
    if (fs.existsSync(backendIndexFile)) {
      const content = fs.readFileSync(backendIndexFile, 'utf8');
      
      if (!content.includes('helmet')) {
        this.addFinding('backend', {
          type: 'security-headers',
          severity: 'high',
          title: 'Missing Security Headers Middleware',
          description: 'Helmet.js middleware not configured',
          file: backendIndexFile
        });
      }
      
      if (!content.includes('cors')) {
        this.addFinding('backend', {
          type: 'security-headers',
          severity: 'moderate',
          title: 'Missing CORS Configuration',
          description: 'CORS middleware not configured',
          file: backendIndexFile
        });
      }
    }
    
    console.log('  ✅ Security headers audit completed');
  }

  async auditInputValidation() {
    console.log('🔍 Auditing input validation...');
    
    // Check backend route files
    const routeFiles = this.getBackendRouteFiles();
    
    routeFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for input validation
      if (content.includes('req.body') && !content.includes('validator')) {
        this.addFinding('backend', {
          type: 'input-validation',
          severity: 'moderate',
          title: 'Missing Input Validation',
          description: 'Route accepts request body without validation',
          file: file
        });
      }
      
      // Check for SQL injection protection
      if (content.includes('query') && !content.includes('sanitize')) {
        this.addFinding('backend', {
          type: 'input-validation',
          severity: 'high',
          title: 'Potential SQL Injection',
          description: 'Database query without input sanitization',
          file: file
        });
      }
    });
    
    console.log('  ✅ Input validation audit completed');
  }

  addFinding(category, finding) {
    this.results[category].push(finding);
    this.results.summary.total++;
    this.results.summary[finding.severity]++;
  }

  getContractFiles() {
    return this.glob('contracts/**/*.sol');
  }

  getBackendRouteFiles() {
    return this.glob('backend/src/routes/**/*.ts');
  }

  getAllFiles(patterns) {
    let files = [];
    patterns.forEach(pattern => {
      files = files.concat(this.glob(pattern));
    });
    return files;
  }

  glob(pattern) {
    // Simple glob implementation - in production, use a proper glob library
    try {
      return execSync(`find . -path "${pattern}" -type f 2>/dev/null || true`, { stdio: 'pipe' })
        .toString()
        .split('\n')
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async generateReport() {
    console.log('📊 Generating security report...');
    
    const reportPath = this.config.reporting.output;
    const reportDir = path.dirname(reportPath);
    
    // Ensure report directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Generate detailed report
    const detailedReport = {
      ...this.results,
      configuration: this.config,
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    
    // Generate summary report
    const summaryPath = reportPath.replace('.json', '-summary.txt');
    const summaryReport = this.generateSummaryReport();
    fs.writeFileSync(summaryPath, summaryReport);
    
    console.log('  ✅ Security report generated');
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.critical > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Address all critical vulnerabilities immediately before deployment',
        details: 'Critical vulnerabilities pose immediate security risks'
      });
    }
    
    if (this.results.summary.high > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Fix high-severity issues before production deployment',
        details: 'High-severity issues should be resolved in the next release cycle'
      });
    }
    
    if (this.results.contracts.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Conduct professional smart contract audit',
        details: 'Consider hiring external auditors for smart contract security review'
      });
    }
    
    return recommendations;
  }

  generateSummaryReport() {
    const { summary } = this.results;
    
    return `
SQUDY PLATFORM SECURITY AUDIT SUMMARY
=====================================

Audit Date: ${this.results.timestamp}

VULNERABILITY SUMMARY:
- Total Issues: ${summary.total}
- Critical: ${summary.critical}
- High: ${summary.high}
- Moderate: ${summary.moderate}
- Low: ${summary.low}
- Info: ${summary.info}

CATEGORY BREAKDOWN:
- Smart Contracts: ${this.results.contracts.length} issues
- Backend: ${this.results.backend.length} issues
- Frontend: ${this.results.frontend.length} issues
- General: ${this.results.general.length} issues

RECOMMENDATIONS:
${this.generateRecommendations().map(rec => `- [${rec.priority.toUpperCase()}] ${rec.action}`).join('\n')}

For detailed findings, see: ${this.config.reporting.output}
`;
  }

  printSummary() {
    const { summary } = this.results;
    
    console.log('\n📋 AUDIT SUMMARY:');
    console.log(`   Total Issues: ${summary.total}`);
    console.log(`   🔴 Critical: ${summary.critical}`);
    console.log(`   🟡 High: ${summary.high}`);
    console.log(`   🟠 Moderate: ${summary.moderate}`);
    console.log(`   🟢 Low: ${summary.low}`);
    console.log(`   ℹ️  Info: ${summary.info}`);
    
    if (summary.critical > 0) {
      console.log('\n⚠️  CRITICAL ISSUES FOUND - Address immediately!');
      process.exit(1);
    } else if (summary.high > 0) {
      console.log('\n⚠️  High-severity issues found - Review before deployment');
    } else {
      console.log('\n✅ No critical or high-severity issues found');
    }
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor(auditConfig);
  auditor.runFullAudit().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityAuditor;