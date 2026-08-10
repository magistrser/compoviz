/**
 * Service Templates for common Docker services.
 */
import type { ComposeResource, ComposeService } from "../models/composeTypes";

export interface ServiceTemplate {
    name: string;
    config: ComposeService;
    suggestedVolume?: { name: string; config: ComposeResource };
}

export const serviceTemplates: Record<string, ServiceTemplate> = {
    redis: {
        name: "redis",
        config: {
            image: "redis:alpine",
            ports: ["6379:6379"],
            volumes: ["redis_data:/data"],
            environment: {},
            healthcheck: {
                test: ["CMD", "redis-cli", "ping"],
                interval: "10s",
                timeout: "5s",
                retries: 5,
            },
            restart: "unless-stopped",
        },
        suggestedVolume: { name: "redis_data", config: { driver: "local" } },
    },
    postgres: {
        name: "postgres",
        config: {
            image: "postgres:16-alpine",
            ports: ["5432:5432"],
            volumes: ["postgres_data:/var/lib/postgresql/data"],
            environment: {
                POSTGRES_USER: "app",
                POSTGRES_PASSWORD: "changeme",
                POSTGRES_DB: "app_db",
            },
            healthcheck: {
                test: ["CMD-SHELL", "pg_isready -U app"],
                interval: "10s",
                timeout: "5s",
                retries: 5,
            },
            restart: "unless-stopped",
        },
        suggestedVolume: { name: "postgres_data", config: { driver: "local" } },
    },
    mysql: {
        name: "mysql",
        config: {
            image: "mysql:8",
            ports: ["3306:3306"],
            volumes: ["mysql_data:/var/lib/mysql"],
            environment: {
                MYSQL_ROOT_PASSWORD: "rootpassword",
                MYSQL_DATABASE: "app_db",
                MYSQL_USER: "app",
                MYSQL_PASSWORD: "changeme",
            },
            healthcheck: {
                test: ["CMD", "mysqladmin", "ping", "-h", "localhost"],
                interval: "10s",
                timeout: "5s",
                retries: 5,
            },
            restart: "unless-stopped",
        },
        suggestedVolume: { name: "mysql_data", config: { driver: "local" } },
    },
    mongodb: {
        name: "mongodb",
        config: {
            image: "mongo:7",
            ports: ["27017:27017"],
            volumes: ["mongo_data:/data/db"],
            environment: {
                MONGO_INITDB_ROOT_USERNAME: "root",
                MONGO_INITDB_ROOT_PASSWORD: "changeme",
            },
            restart: "unless-stopped",
        },
        suggestedVolume: { name: "mongo_data", config: { driver: "local" } },
    },
    nginx: {
        name: "nginx",
        config: {
            image: "nginx:alpine",
            ports: ["80:80", "443:443"],
            volumes: [],
            environment: {},
            healthcheck: {
                test: ["CMD", "curl", "-f", "http://localhost/"],
                interval: "30s",
                timeout: "10s",
                retries: 3,
            },
            restart: "unless-stopped",
        },
    },
    node: {
        name: "node-app",
        config: {
            build: {
                context: ".",
                dockerfile: "Dockerfile",
            },
            ports: ["3000:3000"],
            volumes: [".:/app", "/app/node_modules"],
            environment: {
                NODE_ENV: "development",
            },
            restart: "unless-stopped",
        },
    },
    python: {
        name: "python-app",
        config: {
            build: {
                context: ".",
                dockerfile: "Dockerfile",
            },
            ports: ["8000:8000"],
            volumes: [".:/app"],
            environment: {
                PYTHONUNBUFFERED: "1",
            },
            restart: "unless-stopped",
        },
    },
    rabbitmq: {
        name: "rabbitmq",
        config: {
            image: "rabbitmq:3-management-alpine",
            ports: ["5672:5672", "15672:15672"],
            volumes: ["rabbitmq_data:/var/lib/rabbitmq"],
            environment: {
                RABBITMQ_DEFAULT_USER: "guest",
                RABBITMQ_DEFAULT_PASS: "guest",
            },
            restart: "unless-stopped",
        },
        suggestedVolume: { name: "rabbitmq_data", config: { driver: "local" } },
    },
    go: {
        name: "go-app",
        config: {
            build: { context: ".", dockerfile: "Dockerfile" },
            ports: ["8080:8080"],
            restart: "unless-stopped",
        },
    },
    php: {
        name: "php-app",
        config: {
            image: "php:8.2-fpm-alpine",
            ports: ["9000:9000"],
            volumes: [".:/var/www/html"],
            restart: "unless-stopped",
        },
    },
    apache: {
        name: "apache",
        config: {
            image: "httpd:alpine",
            ports: ["80:80"],
            volumes: [".:/usr/local/apache2/htdocs"],
            restart: "unless-stopped",
        },
    },
    rust: {
        name: "rust-app",
        config: {
            build: { context: ".", dockerfile: "Dockerfile" },
            ports: ["8080:8080"],
            restart: "unless-stopped",
        },
    },
    docker: {
        name: "docker-in-docker",
        config: {
            image: "docker:dind",
            privileged: true,
            environment: { DOCKER_TLS_CERTDIR: "/certs" },
            volumes: ["docker-certs:/certs"],
            restart: "unless-stopped",
        },
        suggestedVolume: { name: "docker-certs", config: { driver: "local" } },
    },
};

/**
 * Get all template names for display.
 * @returns {string[]} Array of template keys.
 */
export const getTemplateNames = (): string[] => Object.keys(serviceTemplates);

/**
 * Get a specific template by name.
 * @param {string} name - The template name.
 * @returns {object|null} The template object or null.
 */
export const getTemplate = (name: string): ServiceTemplate | null => serviceTemplates[name] ?? null;
