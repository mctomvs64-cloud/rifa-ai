const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const tokenMatch = env.match(/NETLIFY_AUTH_TOKEN=\"([^\"]+)\"/);
const token = tokenMatch ? tokenMatch[1] : null;

if (!token) {
  console.log('NO TOKEN');
  process.exit(1);
}

const siteId = 'ad9e7bf3-b708-49a0-92a0-6bbe5cb3c6f5';
const siteUrl = 'https://apoie-artistas.netlify.app';
const sbUrl = env.match(/SUPABASE_URL=\"([^\"]+)\"/)?.[1];
const sbKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=\"([^\"]+)\"/)?.[1];

fetch('https://api.netlify.com/api/v1/sites/' + siteId + '/env', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    NEXTAUTH_URL: [{ value: siteUrl, context: 'all' }],
    NEXT_PUBLIC_APP_URL: [{ value: siteUrl, context: 'all' }],
    SUPABASE_URL: [{ value: sbUrl, context: 'all' }],
    SUPABASE_SERVICE_ROLE_KEY: [{ value: sbKey, context: 'all' }]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
