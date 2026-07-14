# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- Prioritize completing planned work over verbose reasoning; stay focused on execution. Avoid speculative parallel exploration that can fail or be interrupted. Do not hallucinate or fabricate details about the codebase. Confidence: 0.82
- When given a batch of items to fix, complete ALL of them without stopping partway — don't leave remaining items unaddressed unless explicitly asked to stop. Confidence: 0.80
- When told "make it X" (a quality level/score), act immediately to close gaps rather than explaining what's holding things back. The user wants action, not justification. Confidence: 0.70

# code-style
- Match the existing codebase style; don't introduce verbose "best practice" patterns that clash with what's already there. Confidence: 0.75

# communication
- Speak plainly and directly; avoid speculation, over-explaining, and AI-flavored formality. Confidence: 0.70

# docker
- When adding a new npm dependency to package.json, run `npm install` to update package-lock.json before building Docker images, or `npm ci` will fail. Confidence: 0.70

# git
- The GitHub remote for this project is `https://github.com/mikey21-web/vritual-assistant.git`, not `socialmedia-saas`. Confidence: 0.80
- On Windows, avoid heredoc syntax (`<<'EOF'`) for git commit messages; write the message to a temp file and use `git commit -F <file>` instead. Confidence: 0.75

# realestate
- The project can serve real estate with minimal new models. Voice calling agent is the biggest gap/differentiator. Telugu + Hindi + English code-switching (STT → LLM → TTS pipeline) is the key technical challenge for Indian market. Priority: voice agent > property model/MLS > DocuSign > showing scheduler. Confidence: 0.85
- Pipeline approach preferred for voice: Deepgram STT (Telugu/Hindi/English) → existing LangGraph agent → ElevenLabs TTS (En/Hi) + Google WaveNet (Te). Confidence: 0.80

# hospitality
- Indian hospitality is WhatsApp-first, voice-centric. Most small hotels run everything through personal WhatsApp + phone. No paid tools. Events/wedding module maps well since most venues double as wedding spaces. Confidence: 0.80
- The product's deepest niche is events (wedding venues). Real estate and hospitality are secondary: reuse 90% of comms/CRM/AI, add industry-specific models. Confidence: 0.85
- Per-niche dashboard gating is critical. User wants each niche to see ONLY its relevant modules — no events/procurement/inventory for non-events niches. Feature flags per niche tightened in niche-config.ts. Confidence: 0.90
- Route-level gating added (FeatureGuard + 404 if feature disabled). Niche config moved from env-var to DB-driven (fetch from /api/business-settings on login, fallback to env var). Confidence: 0.85
- Landing page + login page now render niche-specific copy (taglines, features, pain points, stats). Color scheme matches niche config. Confidence: 0.80

# assessment
- When assessing project completion percentage, exclude credentials, environment setup, and configuration work — focus on what has been built (features, code, modules). Confidence: 0.70
- When asked to audit or assess a system, perform exhaustive multi-pass deep dives across multiple dimensions (reliability, security, data integrity, observability, operability, compliance, integrations) — surface-level single-pass analysis is not acceptable. Confidence: 0.75

