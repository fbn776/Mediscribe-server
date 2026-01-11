declare namespace NodeJS {
    interface ProcessEnv {
        JWT_SECRET?: string;
        MONGODB_URL?: string;
        PORT?: string;
        ENVIRONMENT?: 'development' | 'production' | 'test';

        NODE_PORT: string;
        PRIVATE_KEY: string;
        MONGODB_URI: string;
        MONGODB_NAME: string;

        STT_API_URL: string;
        STT_WEBSOCKET_URL: string;

        BACKEND_URL: string;
    }
}
