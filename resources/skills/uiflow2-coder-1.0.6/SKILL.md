---
name: uiflow2-coder
description: UIFlow2 MicroPython coding assistant. Use when writing, debugging, or explaining UIFlow2 MicroPython code for M5Stack devices. Provides accurate API lookup from official docs before generating any code.
---

## 核心原则

1. **API 正确性**：严禁凭经验编造代码。所有 API 调用必须先查阅 `docs/` 下的官方文档，再生成代码。
2. **性能优先**：代码不仅要能运行，还要运行良好。必须考虑性能、用户体验和资源效率。
3. **设备适配**：不同设备有不同的最佳实践。必须根据目标设备的特性进行适当的配置和优化。
4. 目录下如果有 _overview.md，先读它了解该模块的整体架构和使用注意事项，再查具体 API 文档。
---

## 完整文档文件树

所有官方文档位于本 Skill 的 `docs/` 目录。编程前必须对照此树定位目标文件路径。

```
docs/
└── advanced/
    ├── usb/
    │   ├── device/
    │   │   ├── keyboard.md
    │   │   ├── mouse.md
    │   ├── _overview.md
    ├── camera.md
    ├── code_scanner.md
    ├── dl.md
    ├── image.md
    ├── jpg.md
└── base/
    ├── atom_can.md
    ├── atom_gps.md
    ├── atom_socket.md
    ├── display.md
    ├── dtu_lorawan.md
    ├── dtu_lorawan_rui3.md
    ├── dtu_nbiot.md
    ├── dtu_nbiot2.md
    ├── dtu_nbiot2v11.md
    ├── echo.md
    ├── echo_pyramid.md
    ├── gpsv2.md
    ├── hdriver.md
    ├── motion.md
    ├── pwm.md
    ├── qrcode.md
    ├── qrcode2.md
    ├── rs232.md
    ├── rs485.md
    ├── speaker.md
    ├── stepmotor.md
    ├── tfcard.md
└── cap/
    ├── lora1262.md
    ├── lora868.md
└── chain/
    ├── angle.md
    ├── chainbus.md
    ├── encoder.md
    ├── joystick.md
    ├── key.md
    ├── tof.md
    ├── unit_bus.md
└── contribute/
    ├── template.md
└── controllers/
    ├── airq.md
    ├── atoms3-lite.md
    ├── atoms3r_cam.md
    ├── cardputer.md
    ├── coreink.md
    ├── dinmeter.md
    ├── dualkey.md
    ├── nesso-n1.md
    ├── paper.md
    ├── sticks3.md
└── get-started/
    ├── _overview.md
└── hardware/
    ├── adc.md
    ├── als.md
    ├── button.md
    ├── can.md
    ├── display.md
    ├── imu.md
    ├── ir.md
    ├── lora.md
    ├── mic.md
    ├── pin.md
    ├── plcio.digitalinput.md
    ├── plcio.md
    ├── plcio.relay.md
    ├── pwr485.md
    ├── rotary.md
    ├── scd40.md
    ├── sen55.md
    ├── sht30.md
    ├── speaker.md
    ├── touch.md
    ├── uart.md
    ├── wdt.md
└── hat/
    ├── adc.md
    ├── cardkb.md
    ├── dac.md
    ├── dac2.md
    ├── dlight.md
    ├── env.md
    ├── finger.md
    ├── heart.md
    ├── joyc.md
    ├── joystick.md
    ├── mini_encoder.md
    ├── mini_joy.md
    ├── ncir.md
    ├── neoflash.md
    ├── pir.md
    ├── servo.md
    ├── servo8.md
    ├── speaker.md
    ├── speaker2.md
    ├── thermal.md
    ├── tof.md
    ├── vibrator.md
└── iot-devices/
    ├── switchc6.md
└── m5ui/
    ├── _overview.md
    ├── arc.md
    ├── bar.md
    ├── button.md
    ├── buttonmatrix.md
    ├── calendar.md
    ├── canvas.md
    ├── chart.md
    ├── checkbox.md
    ├── dropdown.md
    ├── image.md
    ├── keyboard.md
    ├── label.md
    ├── led.md
    ├── line.md
    ├── list.md
    ├── menu.md
    ├── msgbox.md
    ├── page.md
    ├── roller.md
    ├── scale.md
    ├── slider.md
    ├── spinbox.md
    ├── spinner.md
    ├── switch.md
    ├── table.md
    ├── tabview.md
    ├── textarea.md
    ├── win.md
└── module/
    ├── 4in8out.md
    ├── ain4.md
    ├── asr.md
    ├── audio.md
    ├── bala2.md
    ├── cc1101.md
    ├── commu.md
    ├── dc_motor.md
    ├── display.md
    ├── dmx.md
    ├── dualkmeter.md
    ├── ecg.md
    ├── encoder4_motor.md
    ├── fan.md
    ├── gateway_h2.md
    ├── gnss.md
    ├── goplus2.md
    ├── gps.md
    ├── gpsv2.md
    ├── grbl.md
    ├── hmi.md
    ├── lan.md
    ├── llm.md
    ├── lora.md
    ├── lora868_v12.md
    ├── lorawan868.md
    ├── lte.md
    ├── nbiot.md
    ├── odrive.md
    ├── plus.md
    ├── pm25.md
    ├── pps.md
    ├── pwrcan.md
    ├── qrcode.md
    ├── rca.md
    ├── relay_2.md
    ├── rs232.md
    ├── servo2.md
    ├── step_motor_driver.md
    ├── usb.md
    ├── zigbee.md
└── quick-reference/
    ├── get-started.md
    ├── usb-mode.md
└── software/
    ├── easysocket.md
    ├── modbus.md
    ├── modbus.rtu.master.md
    ├── modbus.rtu.slave.md
    ├── modbus.tcp.client.md
    ├── modbus.tcp.server.md
    ├── requests2.md
    ├── tcp.client.md
    ├── tcp.server.md
    ├── udp.client.md
    ├── udp.server.md
    ├── umqtt.default.md
    ├── umqtt.md
└── stamplc/
    ├── ac.md
    ├── poe.md
└── system/
    ├── audio.md
    ├── audio.player.md
    ├── audio.recorder.md
    ├── bleuart.client.md
    ├── bleuart.md
    ├── bleuart.server.md
    ├── m5ble.md
    ├── m5espnow.md
    ├── power.md
    ├── time.md
    ├── wlan.ap.md
    ├── wlan.sta.md
└── unit/
    ├── ac_measure.md
    ├── accel.md
    ├── acssr.md
    ├── adc.md
    ├── adc_v11.md
    ├── ain4.md
    ├── angle.md
    ├── angle8.md
    ├── asr.md
    ├── audioplayer.md
    ├── bldc_driver.md
    ├── bps.md
    ├── button.md
    ├── buzzer.md
    ├── bytebutton.md
    ├── byteswitch.md
    ├── can.md
    ├── cardkb.md
    ├── cat1cn.md
    ├── catch.md
    ├── co2.md
    ├── co2l.md
    ├── color.md
    ├── dac.md
    ├── dac2.md
    ├── dcssr.md
    ├── dds.md
    ├── digi_clock.md
    ├── dlight.md
    ├── dmx.md
    ├── dualbutton.md
    ├── earth.md
    ├── encoder.md
    ├── encoder8.md
    ├── env.md
    ├── envpro.md
    ├── extencoder.md
    ├── extio.md
    ├── extio2.md
    ├── fader.md
    ├── finger.md
    ├── fingerprint2.md
    ├── flash_light.md
    ├── gateway_h2.md
    ├── glass.md
    ├── glass2.md
    ├── gps_v11.md
    ├── grove2grove.md
    ├── hall_effect.md
    ├── hbridge.md
    ├── heart.md
    ├── id.md
    ├── imu.md
    ├── imupro.md
    ├── ina226.md
    ├── ir.md
    ├── joystick.md
    ├── joystick2.md
    ├── key.md
    ├── kmeter.md
    ├── kmeter_iso.md
    ├── laser_rx.md
    ├── laser_tx.md
    ├── lcd.md
    ├── light.md
    ├── limit.md
    ├── lora_e220.md
    ├── lora_e220_433.md
    ├── lorawan_rui3.md
    ├── midi.md
    ├── minioled.md
    ├── miniscale.md
    ├── mq.md
    ├── mqtt.md
    ├── mqttpoe.md
    ├── nbiot.md
    ├── nbiot2.md
    ├── ncir.md
    ├── ncir2.md
    ├── neco.md
    ├── oled.md
    ├── op180.md
    ├── op90.md
    ├── pdm.md
    ├── pir.md
    ├── puzzle.md
    ├── qrcode.md
    ├── rca.md
    ├── reflective_ir.md
    ├── relay.md
    ├── relay2.md
    ├── relay4.md
    ├── rf433r.md
    ├── rf433t.md
    ├── rfid.md
    ├── rgb.md
    ├── roller485.md
    ├── rollercan.md
    ├── rtc.md
    ├── scales.md
    ├── scroll.md
    ├── servo180.md
    ├── servo360.md
    ├── servos8.md
    ├── ssr.md
    ├── step16.md
    ├── synth.md
    ├── thermal.md
    ├── timerpwr.md
    ├── tmos.md
    ├── tof.md
    ├── tof4m.md
    ├── tof90.md
    ├── tube_pressure.md
    ├── tvoc.md
    ├── uhf_rfid.md
    ├── ultrasonic.md
    ├── ultrasonic_io.md
    ├── uwb.md
    ├── vibrator.md
    ├── watering.md
    ├── weight.md
    ├── weight_i2c.md
    ├── zigbee.md
└── widgets/
    ├── _overview.md
    ├── circle.md
    ├── image+.md
    ├── image.md
    ├── label+.md
    ├── label.md
└── COPYRIGHT.md
```

不确定路径时，用脚本搜索：
```bash
./scripts/find_doc.sh <关键词>
```

---

## 编程流程（强制执行）

### 第 1 步：分析需求，定位文档
- 提取关键硬件/功能名称
- 在上方文件树中锁定目标路径
- 如不确定，运行 `./scripts/find_doc.sh <关键词>`

### 第 2 步：读取原始 API（强制）
```bash
read docs/unit/env.md       # 示例
```
从中提取：构造函数签名、方法参数、官方示例代码。

### 第 3 步：生成代码

**导入规范：**
```python
import M5
from M5 import *          # 必须，初始化设备
# 按需引入，仅导入实际用到的：
from hardware import *    # 硬件抽象：Pin、I2C、UART、ADC 等
from unit import *        # Unit 系列
from module import *      # Module 系列
from base import *        # Base 系列
import m5ui               # LVGL UI 控件
import lvgl as lv         # LVGL 底层（如需直接操作）
```
- ❌ `from m5stack import *`（UIFlow1 旧写法，UIFlow2 不用）
- ❌ 根据文档路径推断导入（`docs/hardware/speaker.md` ≠ `from hardware import Speaker`）
- ✅ **必须查看文档示例代码中的实际 import 语句**（Speaker/Mic 通过 `from M5 import *` 导入，详见 `docs/hardware/speaker.md` 和 `docs/hardware/mic.md`）
- 禁止在代码头部添加版权注释，直接从 `import` 开始

**主循环规范：**
```python
while True:
    M5.update()        # 必须，否则触摸/按键事件无响应
    # 业务逻辑...
    time.sleep_ms(50)  # 用 sleep_ms() 替代 sleep()
```

**内置设备 vs 外接模块（强制区分，否则系统崩溃）：**

| 设备类型 | 判断依据 | 访问方式 | 禁止操作 |
|---------|---------|---------|---------|
| 内置设备（IMU/触摸/电源/音频/显示） | 集成在主板上 | `M5.Imu.*` / `M5.Touch.*` / `Power.*` / `Speaker.*` | 禁止初始化 I2C/SPI（系统已占用） |
| 外接模块（Unit/HAT/Module） | Grove/I2C/SPI 连接 | 初始化 I2C + 创建设备对象 | - |

- **判断流程**：查设备文档 → 检查 `docs/system/` 和 `docs/hardware/` 是否有系统 API → 有则用 `M5.*`，无则按 Unit/HAT/Module 文档初始化
- **详细说明和示例**见 `docs/system/power.md`（Power API 与内置电源监测芯片的关系）
- **调试提示**：`I2C.scan()` 返回 `[]`、SDIO 错误、`ETIMEDOUT` → 检查是否触碰了系统总线

**m5ui 控件规范：**
- ✅ 所有控件必须传 `parent=page0`，否则 `screen_load()` 后黑屏（详见 `docs/m5ui/page.md`）
- ❌ 禁止假设参数通用：每个控件必须先读 `docs/m5ui/[widget].md` 验证构造函数参数（如 M5Label 不支持 `w/h`，详见 `docs/m5ui/label.md`）
- ❌ 禁止凭感觉选 LVGL 常量（字体、颜色等），只使用文档示例中出现的值

**API 返回值验证：**
- 检查文档 `:returns:` 标记 → `tuple` 必须解包或索引访问，禁止写 `result.x`
- 触摸 API 详细返回值和坐标转换规则见 `docs/hardware/touch.md`
- 单点触控用 `getX()/getY()`（已自动旋转），多点触控用 `getTouchPointRaw(i)` + 手动坐标转换

**LCD 渲染规范：**
- ❌ 禁止在 `loop()` 中 `Lcd.clear()` 或 `fillScreen()`（全屏闪烁，详见 `docs/hardware/display.md`）
- ✅ 静态背景只在 `setup()` 绘制一次，动态内容用 `fillRect()` 局部擦除+重绘
- ⚠️ 分层重绘：重绘底层后必须重绘被覆盖的上层元素（如钢琴黑键叠在白键上）
- 代码生成后检查所有函数调用是否有对应定义，确保无 `NameError`

**MicroPython 性能优化（数据处理/高频刷新场景强制）：**

| 优化点 | ❌ 错误模式 | ✅ 正确做法 |
|--------|-----------|-----------|
| 批量解包 | 循环逐个 `struct.unpack_from()` | 单次 `struct.unpack('<hh'*N, buf)` |
| 缓冲区复用 | `loop()` 中反复创建 `bytearray`/列表 | `setup()` 预分配，`loop()` 复用 |
| 零拷贝 | `buf[start:end]` 切片拷贝 | `memoryview(buf)[start:end]` |
| 图表刷新 | `set_series_values()` 全量替换 | `set_next_value()` + `SHIFT` 模式（详见 `docs/m5ui/chart.md`） |
| Mic DMA | 短缓冲频繁 `Mic.record()` | 加大缓冲至 50-100ms 降低启停开销 |

### 第 4 步：质量检查清单

| 检查项 | 问题模式 | 正确做法 |
|--------|---------|---------|
| 显示性能 | 循环中 `fillScreen()` 全屏重绘 | `fillRect()` 局部更新 |
| 屏幕旋转 | 横屏应用未设置旋转 | `Lcd.setRotation(1)` 或 `setRotation(3)` |
| 资源管理 | 循环中重复 `Speaker.begin()` | `setup()` 中初始化一次 |
| 算法效率 | 循环中 `item in list` 查找 | 改用字典/集合 |
| 用户体验 | 操作无即时视觉反馈 | 操作后立即更新 UI |

---

## 禁止行为

1. **禁止凭空编造 API**：未读文档前不得生成复杂 API 调用
2. **禁止主循环缺少 `M5.update()`**
3. **禁止使用 `from m5stack import *`**（UIFlow1 旧写法）
4. **禁止根据文档路径推断导入路径**：必须查看文档示例代码
5. **禁止为非 CoreS3 设备生成摄像头代码**：UIFlow2 摄像头 API 仅支持 CoreS3
6. **禁止假设控件参数通用**：每个 m5ui 控件必须单独验证参数
7. **禁止凭感觉选 LVGL 常量**：只用文档示例中出现的值
8. **禁止假设 API 返回对象**：检查 `:returns: tuple` 标记
9. **禁止在循环中全屏重绘**：用 `fillRect()` 局部更新
11. **禁止在循环中重复初始化硬件**
12. **禁止分层重绘时遗漏上层元素**
