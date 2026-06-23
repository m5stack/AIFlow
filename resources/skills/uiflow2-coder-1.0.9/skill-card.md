## Description: <br>
UIFlow2 MicroPython coding assistant. Use when writing, debugging, reviewing, or explaining UIFlow2 MicroPython code for M5Stack devices; when selecting M5Stack UIFlow2 APIs, imports, constructors, examples, display/UI patterns, hardware/unit/module drivers, or troubleshooting UIFlow2 runtime errors. Always consult the bundled official docs before generating code. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[yuyun2000](https://clawhub.ai/user/yuyun2000) <br>

### License/Terms of Use: <br>
MIT-0 <br>


## Use Case: <br>
Developers and engineers use this skill to write, debug, review, and explain UIFlow2 MicroPython for M5Stack devices while checking bundled official API documentation before producing code. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: Generated examples may perform hardware actions such as writing NFC/RFID data, sending USB keyboard or mouse input, controlling motors or relays, recording audio, logging GPS coordinates, or using radio/network credentials. <br>
Mitigation: Review generated code and require explicit user confirmation before running examples that affect devices, peripherals, stored data, credentials, or the physical environment. <br>
Risk: Bundled examples can modify hardware, tags, or biometric data without clear warnings. <br>
Mitigation: Test on non-production devices first, add visible warnings around destructive or state-changing operations, and keep backups of device or enrollment state where applicable. <br>


## Reference(s): <br>
- [ClawHub skill page](https://clawhub.ai/yuyun2000/uiflow2-coder) <br>
- [UIFlow2 Coder skill instructions](artifact/SKILL.md) <br>
- [Bundled UIFlow2 documentation index](artifact/file_tree.txt) <br>
- [Bundled UIFlow2 copyrights and licenses](artifact/docs/COPYRIGHT.md) <br>
- [M5Stack CoreS3 documentation](https://docs.m5stack.com/en/core/CoreS3) <br>
- [M5Stack Dual Button Unit documentation](https://docs.m5stack.com/en/unit/dual_button) <br>


## Skill Output: <br>
**Output Type(s):** [text, markdown, code, shell commands, guidance] <br>
**Output Format:** [Markdown responses with MicroPython code blocks and concise verification steps] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [May include searched documentation paths and hardware validation steps.] <br>

## Skill Version(s): <br>
1.0.9 (source: server release metadata) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
