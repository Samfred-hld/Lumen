import { execSync } from 'child_process';

try {
  const log = execSync('git log --oneline -10', { encoding: 'utf8' });
  console.log('Recent commits:');
  console.log(log);

  const lines = log.trim().split('\n');
  const botCommits = lines.filter(line => /\bbot\b/i.test(line));

  if (botCommits.length > 0) {
    console.log(`Found ${botCommits.length} bot commit(s):`);
    botCommits.forEach(c => console.log(`  ${c}`));
    const diff = execSync('git diff HEAD~1', { encoding: 'utf8' });
    console.log('\nMost recent commit diff:');
    console.log(diff);
  } else {
    console.log('No bot commits found in the last 10 commits.');
  }
} catch (err) {
  if (err.message?.includes('command not found') || err.message?.includes('not a git repository')) {
    console.log('Not a git repository or git not available.');
  } else {
    console.error('Error running bot-diff:', err.message);
  }
  process.exit(0);
}
