# M5Stack Assistant Skill

M5Stack 官方 MCP 检索辅助 skill。核心规则：先查官方 MCP，再基于结果回答；当前 `knowledge_search` 新接口不再使用 `num`，服务端固定返回前 10 条主检索结果。

## 包含内容

```
m5stack-assistant/
├── SKILL.md
├── m5-search.mjs
├── references/
│   └── quick-reference.md
└── scripts/
    ├── mcp.mjs
    └── mcp.js
```

## 快速查询

```bash
node m5-search.mjs "M5Stack CoreS3 引脚定义" --filter product
node m5-search.mjs "M5StickC Plus Arduino 按键示例" --filter arduino
node m5-search.mjs "ESP32-S3 寄存器说明" --chip
```

参数：

- `--filter <类型>`：可选，`product` / `product_no_eol` / `program` / `arduino` / `uiflow` / `esp-idf` / `esphome`。
- `--chip`：额外检索芯片数据手册相关内容。
- `--num`：已废弃；脚本会提示并忽略，服务端固定返回前 10 条结果。

## 代码调用

```javascript
import { mcpSearch } from './scripts/mcp.mjs';

const result = await mcpSearch('M5Stack CoreS3 规格参数', {
  filter_type: 'product',
  is_chip: false,
});
```

## MCP 工具参数

`knowledge_search`：

- `query`：必填，查询文本。
- `is_chip`：可选，涉及芯片、datasheet、寄存器、底层电气特性时设为 `true`。
- `filter_type`：可选，文档类型过滤；不确定时省略做全域检索。

## 推荐过滤策略

| 场景 | filter_type |
| --- | --- |
| 产品规格、尺寸、接口、SKU | `product` |
| 只看在售产品 | `product_no_eol` |
| Arduino 代码、API、示例 | `arduino` |
| UIFlow / UIFlow2 / MicroPython | `uiflow` |
| ESP-IDF 组件、示例、配置 | `esp-idf` |
| ESPHome 配置 | `esphome` |
| 故障排除、FAQ | `product` 或 `program` |

## 降级方案

MCP 不可用时，说明服务暂不可用，并建议查看：

- 官方文档：https://docs.m5stack.com
- 官方 GitHub：https://github.com/m5stack
