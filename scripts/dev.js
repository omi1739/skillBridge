const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🌉 Starting SkillBridge Development Environment...');
console.log('====================================================\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Automatically free ports 4000 and 3000 if occupied
function freePort(port) {
  try {
    if (isWin) {
      const output = execSync('netstat -ano').toString();
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            console.log(`[Dev Runner] Freeing port ${port} (PID ${pid})...`);
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          }
        }
      }
    }
  } catch (err) {
    // Port was already free
  }
}

freePort(4000);
freePort(3000);

// @skillbridge/types is consumed by both workspaces through its compiled
// dist/ output (gitignored), so ensure it is built before either dev server
// boots. Do it here once instead of letting both predev hooks race on dist/.
try {
  execSync(`${npmCmd} run build --workspace=@skillbridge/types`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: isWin
  });
} catch (err) {
  console.error('[Dev Runner] Failed to build @skillbridge/types. Aborting.');
  process.exit(1);
}

// 1. Start Backend API Server
const apiProcess = spawn(npmCmd, ['run', 'dev', '--workspace=backend'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: isWin
});

// 2. Start Frontend Web Server
const webProcess = spawn(npmCmd, ['run', 'dev', '--workspace=frontend'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: isWin
});

function cleanup() {
  console.log('\n[SkillBridge] Shutting down services...');
  apiProcess.kill();
  webProcess.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
