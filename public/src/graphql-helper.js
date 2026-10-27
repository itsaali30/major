// GraphQL API URL
const GRAPHQL_URL = '/graphql';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true'
  },
  withCredentials: true,
  timeout: 10000
});

// Helper function for GraphQL requests using axios
async function graphqlRequest(query, variables, token) {
  const headers = { 
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true'
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
    const response = await apiClient.post(GRAPHQL_URL, {
      query: query,
      variables: variables
    }, { headers });

    const data = response.data;
    if (data.errors) throw new Error(data.errors[0].message);
    return data.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data?.errors?.[0]?.message || 'Server error');
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error - no response from server');
    } else {
      // Something else happened
      throw new Error(error.message);
    }
  }
}

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { graphqlRequest, GRAPHQL_URL, apiClient };
}
