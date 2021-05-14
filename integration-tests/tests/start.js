const concurrently = require('concurrently');

// See https://github.com/kimmobrunfeldt/concurrently/issues/33#issuecomment-433084589

const extraArgs = process.argv.slice(2);

concurrently(
  [
    { command: `npm:mocha -- ${extraArgs.join(' ')}` },
    { command: 'npm:app-importer' },
  ],
  {
    killOthers: ['failure', 'success'],
  }
).catch(tasks => {
  const mocha = tasks.find(t => t.index === 0);
  process.exit(mocha.exitCode);
});