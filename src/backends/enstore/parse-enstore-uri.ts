export interface EnstoreUri {
  username?: string;
  password?: string;
  pathPrefix: string;
  endpoint?: string;
}

export function parseEnstoreUri(url: `enstore://${string}`): EnstoreUri {
  // Initialize default result
  const result: EnstoreUri = {
    pathPrefix: '',
  };

  if (!url.startsWith('enstore://')) {
    throw new Error('Invalid enstore URL: must start with enstore://');
  }

  // Remove the protocol
  let remaining = url.slice('enstore://'.length);

  // Extract credentials if they exist
  if (remaining.includes('@')) {
    throw new Error('Invalid enstore URL: use : for credentials, not @');
  }

  // Handle credentials and path
  const credentialsAndPath = remaining.split('?')[0];

  if (credentialsAndPath.includes(':')) {
    const firstColonIndex = credentialsAndPath.indexOf(':');
    const potentialCredentials = credentialsAndPath.slice(0, firstColonIndex);

    // Look for the next forward slash after credentials
    const slashAfterCredentials = credentialsAndPath.indexOf(
      '/',
      firstColonIndex + 1
    );

    if (slashAfterCredentials === -1) {
      // No path component, everything up to ? or end is credentials
      const password = credentialsAndPath.slice(firstColonIndex + 1);
      result.username = decodeURIComponent(potentialCredentials);
      if (password) result.password = decodeURIComponent(password);
      result.pathPrefix = '';
    } else {
      // There is a path component
      const password = credentialsAndPath.slice(
        firstColonIndex + 1,
        slashAfterCredentials
      );
      result.username = decodeURIComponent(potentialCredentials);
      if (password) result.password = decodeURIComponent(password);
      result.pathPrefix = credentialsAndPath.slice(slashAfterCredentials);
    }
  } else {
    // No credentials, just path
    result.pathPrefix = credentialsAndPath;
  }

  // Extract query parameters
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const queryParams = new URLSearchParams(url.slice(queryIndex));
    const endpoint = queryParams.get('endpoint');
    if (endpoint) {
      result.endpoint = endpoint;
    }
  }

  // Clean up pathPrefix
  result.pathPrefix = result.pathPrefix.replace(/\/$/, ''); // Remove trailing slash

  return result;
}
