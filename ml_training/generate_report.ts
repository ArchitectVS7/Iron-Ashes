import * as fs from 'fs';
import * as path from 'path';

// Usage: npx ts-node generate_report.ts <run_name> <shadowking_win_rate> <avg_rounds> <peak_doom> <notes>
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error("Usage: ts-node generate_report.ts <run_name> <shadowking_win_rate> <avg_rounds> <peak_doom> [notes]");
  process.exit(1);
}

const [runName, winRateStr, avgRoundsStr, peakDoomStr, ...notesArr] = args;
const notes = notesArr.join(' ');
const date = new Date().toISOString().split('T')[0];
const filename = `run_${date}_${runName}.md`;
const outPath = path.join(process.cwd(), 'reports', filename);

const content = `# UGT Balance Report: ${runName}
Date: ${date}

## Metrics
- **Shadowking Win Rate**: ${winRateStr}% (Target: 18-22%)
- **Average Rounds**: ${avgRoundsStr}
- **Peak Doom Toll (Avg)**: ${peakDoomStr}

## Notes & Tweaks
${notes || 'No notes provided. Standard run.'}

## Recommended Next Steps
- If win rate > 22%: Increase banner generation or reduce Doom Toll speed.
- If win rate < 18%: Increase Doom Toll speed or increase Shadowking lieutenant power.
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(`Report generated: ${outPath}`);
