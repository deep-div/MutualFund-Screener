type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

const getEnv = (key: string): string => {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  if (!value || typeof value !== "string") {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const config = {
  firebase: {
    apiKey: getEnv("VITE_FIREBASE_API_KEY"),
    authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
    appId: getEnv("VITE_FIREBASE_APP_ID"),
    storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  } satisfies FirebaseClientConfig,
};
