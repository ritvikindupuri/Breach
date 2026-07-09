// scripts/simulate-runner.js
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log("Usage: node scripts/simulate-runner.js <BREACH_URL> <RUNNER_ID> <BOOTSTRAP_TOKEN>");
    process.exit(1);
  }

  const [url, runnerId, token] = args;
  const endpoint = `${url.replace(/\/$/, '')}/api/public/runner/register`;
  
  console.log(`Connecting to auditor registry endpoint: ${endpoint}`);
  console.log(`Auditor ID: ${runnerId}`);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        runner_id: runnerId,
        bootstrap_token: token
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.log(`❌ Handshake failed: ${data.error || res.statusText}`);
      process.exit(1);
    }

    console.log(`\n✔ Handshake Successful!`);
    console.log(`Auditor registered as ONLINE in database.`);
    console.log(`Signing Secret: ${data.signing_secret}`);
  } catch (err) {
    console.log(`❌ Network error connecting to ${endpoint}:`, err.message);
    process.exit(1);
  }
}

main();
