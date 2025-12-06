# Legacy Files

These files are from the original Manus implementation and use Drizzle ORM with MySQL.

The active implementation is in `/server/` using SQLite with better-sqlite3.

## Files

| File | Description | Status |
|------|-------------|--------|
| `brailleKernel.ts` | Grade-∞ Braille encoding | Ported to `server/brailleKernel.ts` |
| `chatRouter.ts` | tRPC chat routes | Ported to `server/routers.ts` |
| `cognitiveMetrics.ts` | Swarm metrics | Ported to `server/metrics.ts` |
| `conceptConvergence.ts` | Concept merging | Not yet ported |
| `contextManager.ts` | Context window management | Not yet ported |
| `conversations.ts` | Conversation storage | Inline in `server/routers.ts` |
| `db.ts` | Drizzle MySQL connection | Replaced with SQLite |
| `metaController.ts` | Adaptive behavior | Not yet ported |
| `routers.ts` | Main tRPC router | Ported to `server/routers.ts` |
| `scheduledAutoConvergence.ts` | Auto-convergence jobs | Not yet ported |
| `schema.ts` | Drizzle schema | Replaced with SQLite inline |
| `semanticExtraction.ts` | Concept extraction | Replaced by `server/learning.ts` |
| `swarmIntelligence.ts` | Collective learning | Replaced by `server/learning.ts` |
| `tools.ts` | Search/knowledge tools | Ported to `server/tools.ts` |

## Future Porting

If you want to port additional features:

1. `metaController.ts` - Adds adaptive response styling
2. `conceptConvergence.ts` - Enables concept merging/compression
3. `contextManager.ts` - Smart context window management
4. `scheduledAutoConvergence.ts` - Background convergence jobs

These should be ported incrementally with tests.
