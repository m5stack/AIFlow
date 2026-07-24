## Description: <br>
M5Stack Assistant helps agents answer M5Stack product, hardware, integration, troubleshooting, and development questions by first querying the M5Stack MCP service and grounding responses in official documentation. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[yuyun2000](https://clawhub.ai/user/yuyun2000) <br>

### License/Terms of Use: <br>
MIT-0 <br>


## Use Case: <br>
Developers, engineers, and support agents use this skill to look up M5Stack specifications, pinouts, APIs, examples, compatibility notes, and troubleshooting guidance before producing actionable answers. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: Queries are sent to M5Stack's remote MCP service for documentation search. <br>
Mitigation: Do not include secrets, credentials, private logs, proprietary code, or sensitive device identifiers in search queries unless that disclosure is acceptable. <br>
Risk: The skill may be unable to confirm product details if the MCP service times out or returns insufficient evidence. <br>
Mitigation: State when official material does not confirm an answer and direct users to M5Stack documentation or GitHub for manual verification. <br>


## Reference(s): <br>
- [M5Stack Documentation](https://docs.m5stack.com) <br>
- [M5Stack GitHub](https://github.com/m5stack) <br>
- [M5Stack MCP Service](https://mcp.m5stack.com) <br>
- [M5Stack Arduino Programming Reference](references/quick-reference.md) <br>
- [ClawHub Skill Page](https://clawhub.ai/yuyun2000/m5stack-assistant) <br>
- [Publisher Profile](https://clawhub.ai/user/yuyun2000) <br>


## Skill Output: <br>
**Output Type(s):** [Guidance, Markdown, Code, Shell commands, Configuration instructions] <br>
**Output Format:** [Markdown with inline code blocks and command examples] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [Grounded in M5Stack MCP search results when the remote service is available.] <br>

## Skill Version(s): <br>
1.0.4 (source: release evidence) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
