#!/usr/bin/env node
/**
 * M5Stack 文档检索快速工具
 * 用法: node m5-search.mjs <查询内容> [选项]
 * 选项:
 *   --filter <类型>    过滤类型: product/product_no_eol/program/arduino/uiflow/esp-idf/esphome
 *   --chip             查询芯片相关文档
 */

import { mcpSearch } from './scripts/mcp.mjs';

const FILTER_TYPES = new Set([
  'product',
  'product_no_eol',
  'program',
  'arduino',
  'uiflow',
  'esp-idf',
  'esphome',
]);

function printUsage() {
  console.log('用法: node m5-search.mjs <查询内容> [选项]');
  console.log('选项:');
  console.log('  --filter <类型>    过滤类型: product/product_no_eol/program/arduino/uiflow/esp-idf/esphome');
  console.log('  --chip             查询芯片相关文档');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  printUsage();
  process.exit(1);
}

let query = '';
let filter_type = undefined;
let is_chip = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--filter') {
    filter_type = args[++i];
    if (!FILTER_TYPES.has(filter_type)) {
      console.error(`❌ 不支持的过滤类型: ${filter_type}`);
      console.error(`可选值: ${Array.from(FILTER_TYPES).join(', ')}`);
      process.exit(1);
    }
  } else if (args[i] === '--chip') {
    is_chip = true;
  } else if (args[i].startsWith('--')) {
    console.error(`❌ 不支持的选项: ${args[i]}`);
    printUsage();
    process.exit(1);
  } else {
    query += (query ? ' ' : '') + args[i];
  }
}

if (!query.trim()) {
  console.error('❌ 缺少查询内容。');
  process.exit(1);
}

console.log(`🔍 正在查询: ${query}`);
console.log(`⚙️  参数: filter=${filter_type || 'all'}, is_chip=${is_chip}`);
console.log('='.repeat(80));

try {
  const result = await mcpSearch(query, { filter_type, is_chip });
  console.log('✅ 查询成功!');
  console.log('='.repeat(80));

  if (result && result.content && Array.isArray(result.content)) {
    result.content.forEach((item) => {
      if (item.type === 'text') {
        console.log(item.text);
      }
    });
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(0);
} catch (err) {
  console.error('❌ 查询失败:', err.message);
  process.exit(1);
}