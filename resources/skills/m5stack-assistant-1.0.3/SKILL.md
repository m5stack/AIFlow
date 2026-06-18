---
name: m5stack-assistant
description: 解决 M5Stack 相关问题，包括产品查询、规格参数、Arduino/UIFlow/ESP-IDF/ESPHome 编程、接口与引脚、芯片资料、选型对比和故障排除。必须优先通过 M5Stack 官方 MCP 服务检索官方文档；新接口不使用 num，默认返回前 10 条结果，旧客户端传 num 也会被服务端忽略。
---

# M5Stack Assistant Skill

用 M5Stack 官方 MCP 服务回答 M5Stack 产品、硬件、软件开发和技术支持问题。目标是少猜测、多检索、基于官方资料给出可执行答案。

## 什么时候使用

遇到以下内容时，先查 MCP，再回答：

- M5Stack 产品、模块、Unit、Hat、Base、Core、Atom、StickC、Paper、Dial、Cardputer、Capsule、Stamp 等。
- 规格参数、SKU、尺寸、重量、功耗、供电、电气特性、引脚、GPIO、I2C/SPI/UART/CAN/RS485 等接口。
- Arduino、UIFlow/UIFlow2、MicroPython、ESP-IDF、ESPHome、固件、库函数、示例代码。
- ESP32/ESP32-S3 等芯片型号、datasheet、寄存器、底层特性。
- 产品对比、选型建议、兼容性、FAQ、故障排除。

## 快速调用

命令行：

```bash
node m5-search.mjs "M5Stack CoreS3 引脚定义" --filter product
node m5-search.mjs "M5StickC Plus Arduino 按键示例" --filter arduino
node m5-search.mjs "ESP32-S3 寄存器说明" --chip
```

代码中：

```javascript
import { mcpSearch } from './scripts/mcp.mjs';

const result = await mcpSearch('M5Stack CoreS3 规格参数', {
  filter_type: 'product',
  is_chip: false,
});
```

注意：当前 MCP 工具不再包含 `num`。服务端固定返回前 10 条主检索结果；旧客户端传 `num` 不会报错，但新调用不要传。

## MCP 工具

### `knowledge_search`

从 M5Stack 官方知识库检索资料。

参数：

- `query`，必填。写清楚产品名、平台、接口、错误现象或目标功能；用户问题模糊时，结合上下文改写成可检索关键词。
- `is_chip`，可选 boolean。涉及芯片型号、datasheet、寄存器、底层电气特性时设为 `true`；普通产品/API/示例查询设为 `false`。
- `filter_type`，可选 string。可选：`product`、`product_no_eol`、`program`、`arduino`、`uiflow`、`esp-idf`、`esphome`。不确定类别时可以省略，让知识库全域检索。

推荐过滤：

| 用户问题 | 推荐 `filter_type` | `is_chip` |
| --- | --- | --- |
| 产品规格、尺寸、接口、SKU | `product` | 通常 `false` |
| 只看在售产品 | `product_no_eol` | `false` |
| Arduino API、库、示例 | `arduino` | `false` |
| UIFlow / UIFlow2 / MicroPython | `uiflow` | `false` |
| ESP-IDF 组件、示例、配置 | `esp-idf` | `false` |
| ESPHome 配置 | `esphome` | `false` |
| 芯片 datasheet、寄存器、电气底层 | 可省略或 `product` | `true` |
| 故障排除、FAQ、兼容性 | 先 `product`，必要时 `program` | 视情况 |

## 查询策略

1. 识别用户真正目标：产品咨询、规格查询、开发代码、故障排除、选型对比。
2. 提取关键实体：产品名、版本、开发环境、接口、报错、外设、供电方式。
3. 先做一次精准查询；结果不足时换角度再查，例如产品名 + 接口、产品名 + 平台、错误信息 + 产品名。
4. 对比或选型时分别查每个产品，再汇总差异；不要只靠常识填参数。
5. 编程任务必须查官方 API/示例后再写代码，并复查库名、初始化、引脚、供电、通信地址和依赖。
6. 如果 MCP 没有给出明确证据，回答时说明“官方资料中未确认”，并给出下一步验证方式。

## 回答要求

- 优先引用 MCP 返回的官方资料；不要编造规格、引脚或 API。
- 用用户的语言回答；中文用户用中文，英文用户用英文。
- 技术答案给出可操作步骤；代码答案包含依赖、初始化、关键 API 和测试建议。
- 选型答案明确适用场景、限制和风险，例如 EOL、供电、电平、接口冲突、库兼容性。
- 故障排除按“现象 → 可能原因 → 检查步骤 → 修复建议”组织。

## 失败与降级

- MCP 超时或不可用时，说明官方 MCP 暂不可用，再建议用户查看 https://docs.m5stack.com 或 M5Stack GitHub。
- 不要把第三方博客当作官方结论；非官方信息只能作为补充，并明确标注不确定性。
- 如果需要快速查常见 Arduino 库名或基础结构，可读取 `references/quick-reference.md`；具体产品仍以 MCP 查询结果为准。
