# Cursor 外部 Skills（本目录）

由 **`scripts/setup-cursor-skills.mjs`** 生成链接（不提交 vendor 与链接目录本身）。

## 一键安装 / 更新

```bash
pnpm run setup:cursor-skills
```

（`pnpm run setup:anthropic-skills` 为同一脚本的别名。）

## 包含来源

| 链接名 | 来源仓库 | 说明 |
|--------|----------|------|
| `algorithmic-art`, `pdf`, … | [anthropics/skills](https://github.com/anthropics/skills) | 官方示例技能集（`skills/<name>/SKILL.md`） |
| `gstack` | [garrytan/gstack](https://github.com/garrytan/gstack) | Garry Tan 的 Claude Code / 多角色工作流栈；根目录含 `SKILL.md`、`AGENTS.md`、`CLAUDE.md` 等。**注意**：`SKILL.md` 内部分步骤假设已安装到 `~/.claude/skills/gstack` 并带 `bin/` 工具链；在 Cursor 中主要把本链接当作**流程与规范文档**使用，若需完整自动化请按其仓库说明单独安装 gstack。 |
| `agent-skill-creator` | [FrancyJGLisboa/agent-skill-creator](https://github.com/FrancyJGLisboa/agent-skill-creator) | 把流程写成可安装到多工具的 Agent Skill；根目录 `SKILL.md` + `references/`、`scripts/` |

## 在 Cursor 里怎么用

- 对话中说明：例如「按 **gstack** 的 SKILL 做代码审查」或「用 **agent-skill-creator** 帮我写一个技能草稿」。
- 或用 **@** 指向具体文件，例如 `.cursor/skills/gstack/SKILL.md`、`.cursor/skills/agent-skill-creator/SKILL.md`。

## Git

- `.cursor/vendor/`：各仓库浅克隆，已 `.gitignore`。
- `.cursor/skills/*/`：指向 vendor 的 junction/symlink，已忽略；**本 `README.md` 可提交**。
