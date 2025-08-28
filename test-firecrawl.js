// Most basic call to Firecrawl API
const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/x402/search';

const searchOptions = {
  query: 'latest news today',
  limit: 2
};

console.log('Making basic call to Firecrawl...');
console.log('Endpoint:', firecrawlEndpoint);
console.log('Options:', JSON.stringify(searchOptions, null, 2));

fetch(firecrawlEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(searchOptions)
})
.then(async response => {
  console.log('\nResponse status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  const body = await response.json();
  console.log('\nResponse body:');
  console.log(JSON.stringify(body, null, 2));
  
  // Check what we got
  if (response.status === 402) {
    console.log('\n🔍 Got 402 - this is expected for x402 protocol');
    
    if (body.data && body.data.web) {
      console.log('✅ Found news data in response!');
      console.log('Articles count:', body.data.web.length);
    } else if (body.accepts) {
      console.log('💳 This is payment requirements');
      console.log('Required payment:', body.accepts[0]?.maxAmountRequired, 'units');
      console.log('Pay to address:', body.accepts[0]?.payTo);
    }
  } else if (response.ok) {
    console.log('✅ Got successful response');
  } else {
    console.log('❌ Error response');
  }
})
.catch(error => {
  console.error('❌ Request failed:', error.message);
});