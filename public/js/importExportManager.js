/**
 * 批量导入导出管理器
 * Phase 3: UI/UX优化 - 批量导入导出功能
 */

class ImportExportManager {
  constructor(options = {}) {
    this.config = {
      supportedFormats: ['json', 'csv', 'xlsx', 'txt'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      chunkSize: 1000, // 批量处理大小
      showProgress: true,
      validateData: true,
      allowPartialImport: true,
      autoDownload: true,
      compressionLevel: 6,
      ...options
    };

    this.currentOperation = null;
    this.progressCallback = null;
    this.validationRules = new Map();
    this.transformers = new Map();
    this.processors = new Map();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.registerDefaultTransformers();
    this.registerDefaultProcessors();
    this.createUI();
  }

  // ===== 事件监听器 =====
  setupEventListeners() {
    document.addEventListener('change', this.handleFileInput.bind(this));
    document.addEventListener('click', this.handleButtonClick.bind(this));
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('drop', this.handleDrop.bind(this));
  }

  handleFileInput(e) {
    if (e.target.matches('.import-file-input')) {
      const files = Array.from(e.target.files);
      this.importFiles(files);
    }
  }

  handleButtonClick(e) {
    if (e.target.matches('.btn-export')) {
      const format = e.target.dataset.format || 'json';
      const dataSource = e.target.dataset.source;
      this.exportData(dataSource, format);
    }

    if (e.target.matches('.btn-import-trigger')) {
      this.showImportDialog();
    }

    if (e.target.matches('.btn-export-trigger')) {
      this.showExportDialog();
    }
  }

  handleDragOver(e) {
    const dropZone = e.target.closest('.import-drop-zone');
    if (dropZone) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    }
  }

  handleDrop(e) {
    const dropZone = e.target.closest('.import-drop-zone');
    if (dropZone) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      this.importFiles(files);
    }
  }

  // ===== 导入功能 =====
  async importFiles(files) {
    if (!files || files.length === 0) return;

    try {
      this.showProgress('准备导入...', 0);
      
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.updateProgress(`处理文件 ${i + 1}/${files.length}: ${file.name}`, (i / files.length) * 100);
        
        const result = await this.importFile(file);
        results.push(result);
      }

      this.hideProgress();
      this.showImportResults(results);
      
    } catch (error) {
      this.hideProgress();
      this.showError('导入失败', error.message);
    }
  }

  async importFile(file) {
    // 验证文件
    this.validateFile(file);
    
    // 读取文件内容
    const content = await this.readFile(file);
    
    // 解析数据
    const format = this.detectFormat(file);
    const data = await this.parseData(content, format);
    
    // 验证数据
    if (this.config.validateData) {
      const validation = this.validateData(data, format);
      if (!validation.valid && !this.config.allowPartialImport) {
        throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
      }
    }

    // 转换数据
    const transformedData = await this.transformData(data, format);
    
    // 处理数据
    const result = await this.processImportData(transformedData, file.name);
    
    return {
      filename: file.name,
      format,
      recordCount: transformedData.length,
      success: result.success,
      errors: result.errors || [],
      data: result.data
    };
  }

  validateFile(file) {
    if (!file) {
      throw new Error('未选择文件');
    }

    if (file.size > this.config.maxFileSize) {
      throw new Error(`文件过大，最大支持 ${this.formatFileSize(this.config.maxFileSize)}`);
    }

    const extension = this.getFileExtension(file.name);
    if (!this.config.supportedFormats.includes(extension)) {
      throw new Error(`不支持的文件格式: ${extension}`);
    }
  }

  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      
      const extension = this.getFileExtension(file.name);
      if (extension === 'xlsx') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'UTF-8');
      }
    });
  }

  detectFormat(file) {
    const extension = this.getFileExtension(file.name);
    return extension || 'txt';
  }

  async parseData(content, format) {
    const parser = this.getParser(format);
    if (!parser) {
      throw new Error(`不支持的格式: ${format}`);
    }
    
    return await parser(content);
  }

  getParser(format) {
    const parsers = {
      json: this.parseJSON.bind(this),
      csv: this.parseCSV.bind(this),
      xlsx: this.parseXLSX.bind(this),
      txt: this.parseTXT.bind(this)
    };
    
    return parsers[format];
  }

  parseJSON(content) {
    try {
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      throw new Error('JSON格式错误');
    }
  }

  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index].trim();
        });
        data.push(row);
      }
    }

    return data;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++; // 跳过下一个引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  async parseXLSX(arrayBuffer) {
    // 简化的XLSX解析（实际项目中建议使用SheetJS库）
    throw new Error('XLSX格式需要额外的库支持，请使用JSON或CSV格式');
  }

  parseTXT(content) {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      line: index + 1,
      content: line.trim()
    }));
  }

  // ===== 数据验证 =====
  validateData(data, format) {
    const rules = this.validationRules.get(format) || [];
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push('数据格式错误，期望数组格式');
      return { valid: false, errors };
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      for (const rule of rules) {
        const result = rule.validate(item, i);
        if (!result.valid) {
          errors.push(`第${i + 1}行: ${result.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  addValidationRule(format, rule) {
    if (!this.validationRules.has(format)) {
      this.validationRules.set(format, []);
    }
    this.validationRules.get(format).push(rule);
  }

  // ===== 数据转换 =====
  async transformData(data, format) {
    const transformer = this.transformers.get(format);
    if (transformer) {
      return await transformer(data);
    }
    return data;
  }

  addTransformer(format, transformer) {
    this.transformers.set(format, transformer);
  }

  registerDefaultTransformers() {
    // JSON转换器
    this.addTransformer('json', (data) => {
      return data.map(item => ({
        ...item,
        imported_at: new Date().toISOString(),
        id: item.id || this.generateId()
      }));
    });

    // CSV转换器
    this.addTransformer('csv', (data) => {
      return data.map(item => ({
        ...item,
        imported_at: new Date().toISOString(),
        id: this.generateId()
      }));
    });
  }

  // ===== 数据处理 =====
  async processImportData(data, filename) {
    const processor = this.processors.get('default');
    if (processor) {
      return await processor(data, filename);
    }

    // 默认处理逻辑
    return {
      success: true,
      data: data,
      message: `成功导入 ${data.length} 条记录`
    };
  }

  addProcessor(name, processor) {
    this.processors.set(name, processor);
  }

  registerDefaultProcessors() {
    // 默认处理器
    this.addProcessor('default', async (data, filename) => {
      // 模拟API调用
      const chunks = this.chunkArray(data, this.config.chunkSize);
      const results = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        this.updateProgress(
          `导入数据块 ${i + 1}/${chunks.length}`,
          ((i + 1) / chunks.length) * 100
        );

        // 模拟API调用延迟
        await this.delay(100);
        
        results.push(...chunk);
      }

      return {
        success: true,
        data: results,
        message: `成功处理 ${results.length} 条记录`
      };
    });
  }

  // ===== 导出功能 =====
  async exportData(dataSource, format = 'json', options = {}) {
    try {
      this.showProgress('准备导出...', 0);
      
      // 获取数据
      const data = await this.getData(dataSource);
      this.updateProgress('处理数据...', 30);
      
      // 转换数据格式
      const content = await this.formatData(data, format);
      this.updateProgress('生成文件...', 70);
      
      // 生成文件名
      const filename = this.generateFilename(dataSource, format, options);
      
      // 下载文件
      if (this.config.autoDownload) {
        this.downloadFile(content, filename, format);
      }
      
      this.updateProgress('导出完成', 100);
      this.hideProgress();
      
      this.showSuccess(`成功导出 ${data.length} 条记录到 ${filename}`);
      
      return {
        success: true,
        filename,
        recordCount: data.length,
        content
      };
      
    } catch (error) {
      this.hideProgress();
      this.showError('导出失败', error.message);
      throw error;
    }
  }

  async getData(dataSource) {
    if (typeof dataSource === 'function') {
      return await dataSource();
    }
    
    if (typeof dataSource === 'string') {
      // 从DOM获取数据
      return this.extractDataFromDOM(dataSource);
    }
    
    if (Array.isArray(dataSource)) {
      return dataSource;
    }
    
    throw new Error('无效的数据源');
  }

  extractDataFromDOM(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`未找到元素: ${selector}`);
    }

    if (element.tagName === 'TABLE') {
      return this.extractTableData(element);
    }
    
    throw new Error('不支持的DOM元素类型');
  }

  extractTableData(table) {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowData = {};
      
      headers.forEach((header, index) => {
        if (cells[index]) {
          rowData[header] = cells[index].textContent.trim();
        }
      });
      
      return rowData;
    });
  }

  async formatData(data, format) {
    const formatter = this.getFormatter(format);
    if (!formatter) {
      throw new Error(`不支持的导出格式: ${format}`);
    }
    
    return await formatter(data);
  }

  getFormatter(format) {
    const formatters = {
      json: this.formatJSON.bind(this),
      csv: this.formatCSV.bind(this),
      xlsx: this.formatXLSX.bind(this),
      txt: this.formatTXT.bind(this)
    };
    
    return formatters[format];
  }

  formatJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  formatCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvLines = [];
    
    // 添加标题行
    csvLines.push(headers.map(h => this.escapeCSV(h)).join(','));
    
    // 添加数据行
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return this.escapeCSV(value.toString());
      });
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  }

  escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  formatXLSX(data) {
    throw new Error('XLSX导出需要额外的库支持，请使用JSON或CSV格式');
  }

  formatTXT(data) {
    return data.map(item => {
      if (typeof item === 'object') {
        return Object.entries(item).map(([key, value]) => `${key}: ${value}`).join('\n');
      }
      return item.toString();
    }).join('\n\n');
  }

  generateFilename(dataSource, format, options = {}) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const prefix = options.prefix || 'export';
    return `${prefix}_${timestamp}.${format}`;
  }

  downloadFile(content, filename, format) {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain'
    };
    
    const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===== UI组件 =====
  createUI() {
    this.createImportDialog();
    this.createExportDialog();
    this.createProgressDialog();
  }

  createImportDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'import-dialog';
    dialog.className = 'import-export-dialog';
    dialog.style.display = 'none';
    
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>批量导入</h3>
          <button class="dialog-close">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="import-drop-zone">
            <div class="drop-zone-content">
              <i class="icon-upload"></i>
              <p>拖拽文件到此处或点击选择文件</p>
              <input type="file" class="import-file-input" multiple accept=".json,.csv,.txt">
              <button class="btn btn-primary select-files-btn">选择文件</button>
            </div>
          </div>
          <div class="supported-formats">
            <p>支持格式: ${this.config.supportedFormats.join(', ')}</p>
            <p>最大文件大小: ${this.formatFileSize(this.config.maxFileSize)}</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    this.setupDialogEvents(dialog);
  }

  createExportDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'export-dialog';
    dialog.className = 'import-export-dialog';
    dialog.style.display = 'none';
    
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>批量导出</h3>
          <button class="dialog-close">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="export-options">
            <div class="form-group">
              <label>导出格式:</label>
              <select class="export-format">
                ${this.config.supportedFormats.map(format => 
                  `<option value="${format}">${format.toUpperCase()}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>数据源:</label>
              <select class="export-source">
                <option value="table">当前表格</option>
                <option value="all">所有数据</option>
                <option value="selected">选中项目</option>
              </select>
            </div>
            <div class="form-group">
              <label>文件名前缀:</label>
              <input type="text" class="export-prefix" value="export" placeholder="export">
            </div>
          </div>
          <div class="dialog-actions">
            <button class="btn btn-secondary cancel-btn">取消</button>
            <button class="btn btn-primary export-btn">导出</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    this.setupDialogEvents(dialog);
  }

  createProgressDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'progress-dialog';
    dialog.className = 'import-export-dialog';
    dialog.style.display = 'none';
    
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-body">
          <div class="progress-content">
            <div class="progress-message">处理中...</div>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <div class="progress-percentage">0%</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  setupDialogEvents(dialog) {
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => {
      this.hideDialog(dialog);
    });

    dialog.querySelector('.dialog-overlay')?.addEventListener('click', () => {
      this.hideDialog(dialog);
    });

    dialog.querySelector('.cancel-btn')?.addEventListener('click', () => {
      this.hideDialog(dialog);
    });

    dialog.querySelector('.select-files-btn')?.addEventListener('click', () => {
      dialog.querySelector('.import-file-input').click();
    });

    dialog.querySelector('.export-btn')?.addEventListener('click', () => {
      this.handleExportFromDialog(dialog);
    });
  }

  showImportDialog() {
    const dialog = document.getElementById('import-dialog');
    dialog.style.display = 'flex';
  }

  showExportDialog() {
    const dialog = document.getElementById('export-dialog');
    dialog.style.display = 'flex';
  }

  hideDialog(dialog) {
    dialog.style.display = 'none';
  }

  async handleExportFromDialog(dialog) {
    const format = dialog.querySelector('.export-format').value;
    const source = dialog.querySelector('.export-source').value;
    const prefix = dialog.querySelector('.export-prefix').value;

    this.hideDialog(dialog);
    
    try {
      await this.exportData(source, format, { prefix });
    } catch (error) {
      console.error('导出失败:', error);
    }
  }

  // ===== 进度显示 =====
  showProgress(message, percentage) {
    if (!this.config.showProgress) return;
    
    const dialog = document.getElementById('progress-dialog');
    const messageEl = dialog.querySelector('.progress-message');
    const fillEl = dialog.querySelector('.progress-fill');
    const percentageEl = dialog.querySelector('.progress-percentage');
    
    messageEl.textContent = message;
    fillEl.style.width = `${percentage}%`;
    percentageEl.textContent = `${Math.round(percentage)}%`;
    
    dialog.style.display = 'flex';
  }

  updateProgress(message, percentage) {
    if (!this.config.showProgress) return;
    
    const dialog = document.getElementById('progress-dialog');
    if (dialog.style.display === 'flex') {
      const messageEl = dialog.querySelector('.progress-message');
      const fillEl = dialog.querySelector('.progress-fill');
      const percentageEl = dialog.querySelector('.progress-percentage');
      
      messageEl.textContent = message;
      fillEl.style.width = `${percentage}%`;
      percentageEl.textContent = `${Math.round(percentage)}%`;
    }
  }

  hideProgress() {
    const dialog = document.getElementById('progress-dialog');
    dialog.style.display = 'none';
  }

  // ===== 结果显示 =====
  showImportResults(results) {
    const totalRecords = results.reduce((sum, result) => sum + result.recordCount, 0);
    const successfulFiles = results.filter(result => result.success).length;
    
    this.showSuccess(
      `导入完成`,
      `成功处理 ${successfulFiles}/${results.length} 个文件，共 ${totalRecords} 条记录`
    );
  }

  showSuccess(title, message) {
    if (window.showNotification) {
      window.showNotification(`${title}: ${message}`, 'success');
    } else {
      alert(`${title}: ${message}`);
    }
  }

  showError(title, message) {
    if (window.showNotification) {
      window.showNotification(`${title}: ${message}`, 'error');
    } else {
      alert(`${title}: ${message}`);
    }
  }

  // ===== 工具方法 =====
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== 清理方法 =====
  destroy() {
    document.removeEventListener('change', this.handleFileInput);
    document.removeEventListener('click', this.handleButtonClick);
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('drop', this.handleDrop);

    ['import-dialog', 'export-dialog', 'progress-dialog'].forEach(id => {
      const dialog = document.getElementById(id);
      if (dialog) dialog.remove();
    });
  }
}

// ===== CSS样式 =====
const importExportCSS = `
.import-export-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.dialog-header h3 {
  margin: 0;
  color: #333;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  background: #f1f1f1;
}

.dialog-body {
  padding: 20px;
}

.import-drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.import-drop-zone:hover,
.import-drop-zone.drag-over {
  border-color: #0066cc;
  background: rgba(0, 102, 204, 0.05);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.icon-upload {
  font-size: 48px;
  color: #999;
}

.icon-upload::before {
  content: "📁";
}

.import-file-input {
  display: none;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-primary:hover {
  background: #0052a3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.supported-formats {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
  color: #666;
  font-size: 13px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group select,
.form-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
}

.progress-content {
  text-align: center;
  padding: 20px;
}

.progress-message {
  margin-bottom: 16px;
  color: #333;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f1f1f1;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: #0066cc;
  width: 0%;
  transition: width 0.3s ease;
}

.progress-percentage {
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .dialog-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .dialog-body {
    padding: 16px;
  }
  
  .import-drop-zone {
    padding: 30px 15px;
  }
}

@media (prefers-color-scheme: dark) {
  .dialog-content {
    background: #2a2a2a;
    color: #e1e1e1;
  }
  
  .dialog-header {
    border-bottom-color: #444;
  }
  
  .dialog-header h3 {
    color: #e1e1e1;
  }
  
  .dialog-close {
    color: #ccc;
  }
  
  .dialog-close:hover {
    background: #444;
  }
  
  .import-drop-zone {
    border-color: #555;
    background: #333;
  }
  
  .import-drop-zone:hover,
  .import-drop-zone.drag-over {
    border-color: #66ccff;
    background: rgba(102, 204, 255, 0.1);
  }
  
  .supported-formats,
  .dialog-actions {
    border-top-color: #444;
  }
  
  .form-group label,
  .progress-message {
    color: #e1e1e1;
  }
  
  .form-group select,
  .form-group input {
    background: #333;
    border-color: #555;
    color: #e1e1e1;
  }
  
  .progress-bar {
    background: #444;
  }
}
`;

// 注入CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = importExportCSS;
document.head.appendChild(styleSheet);

// ===== 全局实例和便捷方法 =====
window.ImportExportManager = ImportExportManager;
window.importExportManager = new ImportExportManager();

// 便捷方法
window.importData = function(files) {
  return window.importExportManager.importFiles(files);
};

window.exportData = function(dataSource, format, options) {
  return window.importExportManager.exportData(dataSource, format, options);
};

window.showImportDialog = function() {
  return window.importExportManager.showImportDialog();
};

window.showExportDialog = function() {
  return window.importExportManager.showExportDialog();
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('批量导入导出功能已启用');
  });
} else {
  console.log('批量导入导出功能已启用');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImportExportManager;
} 