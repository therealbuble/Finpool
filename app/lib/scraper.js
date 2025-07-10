import fs from 'fs/promises';
import path from 'path';

export async function parseMetalData() {
  const filePath = path.join(process.cwd(), 'investing_metals.md');
  const content = await fs.readFile(filePath, 'utf8');

  const rows = content
    .split('\n')
    .filter((line) => line.includes('|') && !line.startsWith('#'));

  const metals = rows.map((line) => {
    const cols = line.split('|').map(col => col.trim());
    return {
      name: cols[1],
      date: cols[2] || null,
      current: cols[3],
      high: cols[4],
      low: cols[5],
      change: cols[6],
      percentChange: cols[7],
      time: cols[8]
    };
  });

  return metals;
}
