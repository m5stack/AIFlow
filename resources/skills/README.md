Place bundled Claude Agent SDK skills in this directory.

Example:

resources/skills/uiflow2-coder-1.0.9/SKILL.md

At runtime, the bundled skills directory is symlinked into the active project:

files/.claude/skills -> resources/skills/

The agent also receives this directory through `additionalDirectories`, so Read/Glob/Grep can follow the symlink and access skill docs without copying files into each project.
