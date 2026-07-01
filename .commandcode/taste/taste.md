# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- Prioritize completing planned work over verbose reasoning; stay focused on execution. Avoid speculative parallel exploration that can fail or be interrupted. Confidence: 0.80
- When given a batch of items to fix, complete ALL of them without stopping partway — don't leave remaining items unaddressed unless explicitly asked to stop. Confidence: 0.80

# code-style
- Match the existing codebase style; don't introduce verbose "best practice" patterns that clash with what's already there. Confidence: 0.75

# communication
- Speak plainly and directly; avoid speculation, over-explaining, and AI-flavored formality. Confidence: 0.70

# docker
- When adding a new npm dependency to package.json, run `npm install` to update package-lock.json before building Docker images, or `npm ci` will fail. Confidence: 0.70

# git
- The GitHub remote for this project is `https://github.com/mikey21-web/vritual-assistant.git`, not `socialmedia-saas`. Confidence: 0.80
- On Windows, avoid heredoc syntax (`<<'EOF'`) for git commit messages; write the message to a temp file and use `git commit -F <file>` instead. Confidence: 0.75

# assessment
- When assessing project completion percentage, exclude credentials, environment setup, and configuration work — focus on what has been built (features, code, modules). Confidence: 0.70
- When asked to audit or assess a system, perform exhaustive multi-pass deep dives across multiple dimensions (reliability, security, data integrity, observability, operability, compliance, integrations) — surface-level single-pass analysis is not acceptable. Confidence: 0.75

