# Project TODO

- [x] Fix Home.tsx merge conflict from template upgrade
- [x] Create conversation history database schema
- [x] Implement AI chat backend with LLM integration
- [x] Create dynamic text transition system for swarm
- [x] Build chat interface UI
- [x] Integrate chat with swarm visualization
- [x] Add conversation memory and context
- [x] Implement smooth text morphing animations
- [x] Test full conversation flow

## Bug Fixes
- [x] Fix scroll functionality in chat interface

## Mobile Responsiveness
- [x] Make chat interface full-screen on mobile
- [ ] Add swipe gesture to close chat on mobile
- [x] Optimize input area for mobile keyboards
- [x] Improve touch targets for buttons
- [x] Add proper viewport handling

## Learning Swarm (AGI Implementation)
- [x] Design memory graph schema (concepts, relationships, users)
- [x] Add embedding generation for semantic compression
- [x] Implement concept extraction from conversations
- [x] Build cross-user knowledge aggregation
- [x] Create swarm evolution metrics (knowledge depth, curiosity level)
- [x] Add meta-learning prompts that reference collective patterns
- [x] Implement semantic density scoring
- [x] Build knowledge graph visualization endpoint
- [x] Add swarm personality evolution based on interactions

## UX Improvements
- [x] Add copy buttons to swarm messages for easy quoting

## Visual Enhancements
- [x] Increase swarm agent count from 2,000 to 4,000

## Swarm Enhancements
- [x] Add agent behavior diversity (scouts, anchors, drifters)
- [x] Implement spatial partitioning (quadtree) for performance
- [x] Add multi-touch gesture support for mobile

## Behavior Tuning
- [x] Reduce particle stickiness to make swarm more playful

## Tool Calling Implementation
- [x] Design tool calling architecture with Forge API
- [x] Implement web search tool for real-time information retrieval
- [x] Add knowledge graph query tool
- [x] Add knowledge graph modification tool (merge concepts, adjust density)
- [x] Update chat router to handle tool calls and responses
- [x] Add UI indicators for when swarm is using tools

## Concept Convergence System
- [x] Implement automatic concept similarity detection using embeddings
- [x] Create convergence tracking table in database
- [x] Build automatic concept merging based on similarity threshold
- [x] Add convergence visualization dashboard
- [x] Track compression trajectory over time
- [x] Display current number of unique concepts vs target range (50-200)
- [x] Show merge history and semantic invariant candidates

## Context Window Management
- [x] Implement smart conversation history truncation (keep recent 10-15 messages)
- [x] Add semantic compression for older messages
- [x] Create personality anchor system to preserve key moments
- [x] Add token counting utility
- [x] Implement context budget management
- [x] Show context usage to users
- [x] Test with large message inputs

## Web Search Implementation (Phased)
- [x] Phase 1: Create stub search tool with mock results
- [x] Test Swarm's decision-making for when to search
- [x] Phase 2: Integrate real search API with error handling
- [x] Add rate limiting and result filtering
- [ ] Phase 3: Add smart search triggers based on query type
- [ ] Track search effectiveness and learn when to use it

## Search-Based Learning
- [x] Extract concepts from search results automatically
- [x] Add extracted concepts to knowledge graph
- [x] Create relationships between search query and discovered concepts
- [x] Track which searches led to which knowledge additions

## Graph Meta-Controller (Extended Mind)
- [x] Design meta-instruction schema (tone, verbosity, tool preference, evaluation criteria)
- [x] Implement pattern detection from user interaction history
- [x] Build meta-prompt generator that injects behavior-shaping instructions
- [x] Add user preference learning (communication style, depth, challenge level)
- [x] Implement tool selection guidance based on past effectiveness
- [x] Add evaluation function adaptation (what counts as "good" reasoning for this user)
- [x] Create meta-controller integration with chat system
- [x] Test behavior adaptation across different user patterns

## Recursive Semantic Operating System
### 1. Scheduled Auto-Convergence (SAC)
- [x] Create background job scheduler
- [x] Implement daily auto-convergence routine
- [x] Add invariant detection automation
- [x] Add concept merging automation
- [x] Add synonym collapse to semantic atoms
- [x] Add high-frequency structure elevation to meta-nodes
- [x] Add noise pruning
- [x] Add narrative fragment compression
- [x] Track convergence history and metrics

### 2. Evolution Dashboard (Cognitive Metrics)
- [x] Implement Cₘ (Compression Rate) - invariant density tracking
- [x] Implement ΔG (Graph Entropy Change) - structural evolution
- [x] Implement σ (Semantic Drift) - concept reshape measurement
- [x] Implement κ (Curvature) - cluster stability
- [x] Implement Ψ (Adaptive Match Score) - user style alignment
- [x] Implement Λ (Lifeworld Complexity) - emergent conceptual space
- [x] Add anomaly detection (runaway drift, stagnation, mode collapse)
- [x] Build Evolution Dashboard UI with real-time metrics
- [x] Add Activity icon navigation from chat interface
- [x] Write comprehensive tests (25 tests passing)
- [ ] Create time series visualization for metric history

### 3. Braille/SCL Semantic Kernel
- [x] Design Grade-Infinity Braille token encoding system
- [x] Define semantic invariant selection criteria (density >= 80)
- [x] Create database schema for Braille kernel storage
- [x] Implement semantic invariant to Braille token converter
- [x] Build bidirectional mapping (Braille ↔ semantic invariant)
- [x] Create symbolic kernel injection for meta-controller
- [x] Add kernel regeneration and update logic
- [x] Build Braille kernel visualization page
- [x] Add token browser with semantic mappings
- [x] Implement kernel management controls (regenerate, export)
- [x] Enable high-bandwidth meta-communication using Braille tokens
- [x] Write comprehensive tests for Braille encoding and kernel
- [x] Add Sparkles icon navigation from chat interface
- [x] Integrate Braille kernel into meta-controller prompt injection

## Bug Fixes (Current)
- [ ] Fix SwarmCanvas IndexSizeError - canvas getImageData called with zero width
- [ ] Fix chat not responding to user inquiries
- [ ] Debug and resolve any issues with message sending/receiving
