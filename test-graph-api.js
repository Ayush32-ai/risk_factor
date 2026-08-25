// Simple test script to check the graph API endpoint
async function testGraphAPI() {
  try {
    const response = await fetch('http://localhost:4000/api/graph/network', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Graph API Response:');
    console.log('Nodes:', data.nodes?.length || 0);
    console.log('Edges:', data.edges?.length || 0);
    console.log('Sample node:', data.nodes?.[0]);
    console.log('Sample edge:', data.edges?.[0]);
    
    return data;
  } catch (error) {
    console.error('Error testing graph API:', error);
    throw error;
  }
}

// Run the test (for Node.js environment with node-fetch or similar)
if (typeof fetch !== 'undefined') {
  testGraphAPI().catch(console.error);
} else {
  console.log('This script needs to be run in a browser console or with node-fetch');
}