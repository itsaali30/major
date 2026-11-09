// GraphQL API URL
const GRAPHQL_URL = '/graphql';

// Create axios instance safely
const apiClient = (typeof axios !== 'undefined') ? axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true',
    'ngrok-skip-browser-warning': 'true'
  },
  withCredentials: true,
  timeout: 10000
}) : null;

// Helper function for GraphQL requests using axios with fetch fallback
async function graphqlRequest(query, variables, token) {
  const headers = { 
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true',
    'ngrok-skip-browser-warning': 'true'
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    if (typeof axios !== 'undefined') {
      const client = apiClient || axios.create({ baseURL: '', withCredentials: true, timeout: 10000 });
      const response = await client.post(GRAPHQL_URL, {
        query: query,
        variables: variables
      }, { headers });

      const data = response.data;
      if (data.errors) throw new Error(data.errors[0].message);
      return data.data;
    } else {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables })
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      return data.data;
    }
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.errors?.[0]?.message || 'Server error');
    } else if (error.request) {
      throw new Error('Network error - no response from server');
    } else {
      throw new Error(error.message);
    }
  }
}

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { graphqlRequest, GRAPHQL_URL, apiClient };
}
