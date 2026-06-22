# UGT Balance Report: 02_spatial_awareness
Date: 2026-06-16

## Metrics
- **Shadowking Win Rate**: 100% (Target: 18-22%)
- **Average Rounds**: 15.5
- **Peak Doom Toll (Avg)**: 20

## Notes & Tweaks
Rebuilt observation space and step rewards. Agent successfully learned resource management and navigation (stopped spamming invalid actions, used end_turn when out of banners), but still lost 100% of the time. The Shadowking is mathematically overpowered.

## Recommended Next Steps
- If win rate > 22%: Increase banner generation or reduce Doom Toll speed.
- If win rate < 18%: Increase Doom Toll speed or increase Shadowking lieutenant power.
