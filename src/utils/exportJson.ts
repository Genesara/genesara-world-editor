import type { Node } from '../types';

export function downloadJson(nodes: Node[], filename = 'nodes.json'): void {
  const blob = new Blob([JSON.stringify(nodes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickJsonFile(): Promise<Node[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Expected an array of nodes');
        for (const n of parsed) {
          if (typeof n.q !== 'number' || typeof n.r !== 'number' || typeof n.terrain !== 'string') {
            throw new Error('Invalid node shape in JSON');
          }
        }
        resolve(parsed as Node[]);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
