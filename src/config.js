const getBaseUrl = () => {
  return window.location.origin;
};

export const url = {
  BASE_URL: "https://odoodemo.byteloom.ai",
};
export const authUrl = {
  BASE_URL: "https://backend.techfinna.com",
};

// BASE_URL: 'https://odoodemo.byteloom.ai' ---> demo
// BASE_URL: 'https://demo.techfinna.com' ---> testing
// BASE_URL: `${getBaseUrl()}`
