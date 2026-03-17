type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

const getEnv = (key: string, fallback = ""): string => {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return (typeof value === "string" && value.length > 0) ? value : fallback;
};

export const config = {
  firebase: {
    apiKey: getEnv("FIREBASE_API_KEY"),
    authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
    projectId: getEnv("FIREBASE_PROJECT_ID"),
    appId: getEnv("FIREBASE_APP_ID"),
    storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  } satisfies FirebaseClientConfig,
};

