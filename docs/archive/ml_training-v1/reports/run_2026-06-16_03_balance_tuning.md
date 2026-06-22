# UGT Balance Report: 03_balance_tuning
Date: 2026-06-16

## Metrics
- **Shadowking Win Rate**: 100% (Target: 18-22%)
- **Average Rounds**: 13
- **Peak Doom Toll (Avg)**: 20

## Notes & Tweaks
Doubled banner generation and removed non-unanimous voting penalty. Game length doubled, but agent still achieved 0.00% win rate. Agent used 'end_turn' 20,872 times, possibly indicating a local minima where it avoids the -2.0 penalty for moving away from the artifact, or it struggles to navigate the full logic.

## Recommended Next Steps
- If win rate > 22%: Increase banner generation or reduce Doom Toll speed.
- If win rate < 18%: Increase Doom Toll speed or increase Shadowking lieutenant power.
