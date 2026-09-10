export type RuntimeConfig = {
  apiBaseUrl: string;
  devProxyTarget?: string;
};

const defaultConfig: RuntimeConfig = {
  apiBaseUrl: '/api',
};

let runtimeConfig: RuntimeConfig = defaultConfig;

function normalizeConfig(payload: unknown): RuntimeConfig {
  if (!payload || typeof payload !== 'object') return defaultConfig;
  const config = payload as Partial<RuntimeConfig>;
  const apiBaseUrl = import.meta.env.DEV
    ? defaultConfig.apiBaseUrl
    : typeof config.apiBaseUrl === 'string' && config.apiBaseUrl.trim()
      ? config.apiBaseUrl.trim()
      : defaultConfig.apiBaseUrl;

  return {
    apiBaseUrl,
    devProxyTarget: typeof config.devProxyTarget === 'string' && config.devProxyTarget.trim() ? config.devProxyTarget.trim() : undefined,
  };
}

export async function loadRuntimeConfig() {
  try {
    const response = await fetch('/app-config.json', { cache: 'no-store' });
    if (!response.ok) return runtimeConfig;
    runtimeConfig = normalizeConfig(await response.json());
  } catch {
    runtimeConfig = defaultConfig;
  }
  return runtimeConfig;
}

export function getRuntimeConfig() {
  return runtimeConfig;
}
