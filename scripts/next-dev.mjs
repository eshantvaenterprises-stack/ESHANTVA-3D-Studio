import { spawn } from 'node:child_process';

// Keeps normal `npm run dev` behavior while translating the supervised preview's
// Vite-style host flags to the equivalent Next.js development flags.
const forwarded = process.argv.slice(2);
const args = ['dev'];
for (let index = 0; index < forwarded.length; index += 1) {
  const argument = forwarded[index];
  if (argument === '--strictPort') continue;
  if (argument === '--host') {
    args.push('--hostname');
    if (forwarded[index + 1]) args.push(forwarded[++index]);
    continue;
  }
  args.push(argument);
}

const child = spawn(process.execPath, ['./node_modules/next/dist/bin/next', ...args], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));

