const EventEmitter = require('events');

class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.alerts = [];
    this.alertRules = new Map();
    this.suppressedAlerts = new Set();
  }

  // 添加告警规则
  addRule(name, rule) {
    this.alertRules.set(name, {
      ...rule,
      name,
      lastTriggered: null,
      count: 0
    });
  }

  // 检查并触发告警
  check(stats) {
    const now = Date.now();
    
    for (const [name, rule] of this.alertRules) {
      const shouldAlert = this.evaluateRule(rule, stats);
      
      if (shouldAlert) {
        // 检查是否在静默期
        if (rule.cooldown && rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) {
          continue;
        }
        
        // 检查是否被抑制
        if (this.suppressedAlerts.has(name)) {
          continue;
        }
        
        // 触发告警
        const alert = {
          id: `${name}-${Date.now()}`,
          name,
          level: rule.level,
          message: rule.message,
          value: rule.currentValue,
          threshold: rule.threshold,
          timestamp: new Date().toISOString(),
          resolved: false
        };
        
        this.alerts.push(alert);
        rule.lastTriggered = now;
        rule.count++;
        
        // 发送告警事件
        this.emit('alert', alert);
        
        // 记录到日志
        this.logAlert(alert);
        
        // 如果是严重告警，发送通知
        if (rule.level === 'critical') {
          this.sendNotification(alert);
        }
      }
    }
  }

  // 评估告警规则
  evaluateRule(rule, stats) {
    let value;
    
    switch (rule.metric) {
      case 'memory':
        value = stats.memory.percentage;
        break;
      case 'responseTime':
        value = stats.responseTime.avg;
        break;
      case 'errorRate':
        value = stats.requests.total > 0 
          ? (stats.requests.error / stats.requests.total) * 100 
          : 0;
        break;
      case 'uptime':
        value = stats.uptime;
        break;
      default:
        return false;
    }
    
    rule.currentValue = value;
    
    switch (rule.operator) {
      case '>':
        return value > rule.threshold;
      case '<':
        return value < rule.threshold;
      case '>=':
        return value >= rule.threshold;
      case '<=':
        return value <= rule.threshold;
      default:
        return false;
    }
  }

  // 记录告警日志
  logAlert(alert) {
    const timestamp = new Date(alert.timestamp).toLocaleString();
    const logMessage = `[${timestamp}] ${alert.level.toUpperCase()}: ${alert.message} (值: ${alert.value})`;
    
    if (alert.level === 'critical') {
      console.error(logMessage);
    } else if (alert.level === 'warning') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  // 发送通知（这里可以实现邮件、短信、Webhook等）
  sendNotification(alert) {
    // TODO: 实现通知系统
    console.log(`📧 发送告警通知: ${alert.message}`);
  }

  // 获取活跃告警
  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // 获取告警历史
  getAlertHistory(limit = 100) {
    return this.alerts.slice(-limit);
  }

  // 解决告警
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.emit('resolved', alert);
    }
  }

  // 抑制告警
  suppressAlert(name, duration = 3600000) { // 默认1小时
    this.suppressedAlerts.add(name);
    setTimeout(() => {
      this.suppressedAlerts.delete(name);
    }, duration);
  }

  // 清理已解决的告警
  cleanup() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => {
      return !alert.resolved || (alert.resolvedAt && new Date(alert.resolvedAt).getTime() > oneDayAgo);
    });
  }
}

// 创建全局告警管理器实例
const alertManager = new AlertManager();

// 添加默认告警规则
alertManager.addRule('high-memory', {
  metric: 'memory',
  operator: '>',
  threshold: 85,
  level: 'warning',
  message: '内存使用率过高',
  cooldown: 300000 // 5分钟
});

alertManager.addRule('critical-memory', {
  metric: 'memory',
  operator: '>',
  threshold: 95,
  level: 'critical',
  message: '内存使用率达到危险水平',
  cooldown: 60000 // 1分钟
});

alertManager.addRule('slow-response', {
  metric: 'responseTime',
  operator: '>',
  threshold: 2000,
  level: 'warning',
  message: '平均响应时间过长',
  cooldown: 300000 // 5分钟
});

alertManager.addRule('high-error-rate', {
  metric: 'errorRate',
  operator: '>',
  threshold: 10, // 10%
  level: 'warning',
  message: '错误率过高',
  cooldown: 300000 // 5分钟
});

alertManager.addRule('service-restart', {
  metric: 'uptime',
  operator: '<',
  threshold: 300, // 5分钟
  level: 'info',
  message: '服务刚刚重启',
  cooldown: 600000 // 10分钟
});

module.exports = alertManager;