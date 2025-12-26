"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Star,
  Github,
  Filter,
  Grid3x3,
  List,
  Heart,
  Sparkles,
  Database,
  Cloud,
  MessageSquare,
  FolderOpen,
  Globe,
  Brain,
  Monitor,
  BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Widget, MCPServer, MCPCategory } from "@/types/widget";

// Curated list of top MCP servers - 80+ servers across all categories
const MCP_SERVERS: MCPServer[] = [
  // ============================================
  // OFFICIAL REFERENCE SERVERS (Anthropic)
  // ============================================
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Secure file operations with configurable access controls",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-filesystem",
    isOfficial: true,
    features: ["File read/write", "Directory operations", "Access controls"],
  },
  {
    id: "git",
    name: "Git",
    description: "Git repository operations and version control",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-git",
    isOfficial: true,
    features: ["Clone", "Commit", "Branch", "Diff", "Log"],
  },
  {
    id: "github-official",
    name: "GitHub",
    description: "GitHub API integration for repos, issues, and PRs",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-github",
    isOfficial: true,
    features: ["Repos", "Issues", "PRs", "Actions", "Search"],
  },
  {
    id: "memory",
    name: "Memory",
    description: "Knowledge graph-based persistent memory for Claude",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-memory",
    isOfficial: true,
    features: ["Knowledge graph", "Entity storage", "Relationships"],
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Web content fetching and conversion to markdown",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-fetch",
    isOfficial: true,
    features: ["HTTP requests", "HTML to markdown", "Content extraction"],
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Browser automation and web scraping with Puppeteer",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-puppeteer",
    isOfficial: true,
    features: ["Screenshots", "Navigation", "Form filling", "Scraping"],
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    description: "Dynamic problem-solving through structured thought sequences",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-sequential-thinking",
    isOfficial: true,
    features: ["Step-by-step reasoning", "Thought chains", "Problem solving"],
  },
  {
    id: "postgres-official",
    name: "PostgreSQL",
    description: "PostgreSQL database operations with read-only mode",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-postgres",
    isOfficial: true,
    features: ["Queries", "Schema inspection", "Read-only mode"],
  },
  {
    id: "sqlite-official",
    name: "SQLite",
    description: "Local SQLite database management",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-sqlite",
    isOfficial: true,
    features: ["Local DB", "SQL queries", "Schema management"],
  },
  {
    id: "slack-official",
    name: "Slack",
    description: "Slack workspace integration for messaging",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-slack",
    isOfficial: true,
    features: ["Messages", "Channels", "Users", "Files"],
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search using Brave Search API",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-brave-search",
    isOfficial: true,
    features: ["Web search", "News", "Images"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Google Drive file management",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-gdrive",
    isOfficial: true,
    features: ["Files", "Folders", "Sharing", "Search"],
  },
  {
    id: "google-maps",
    name: "Google Maps",
    description: "Google Maps API for location services",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-google-maps",
    isOfficial: true,
    features: ["Geocoding", "Directions", "Places", "Distance"],
  },
  {
    id: "everart",
    name: "EverArt",
    description: "AI image generation with EverArt",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/everart",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-everart",
    isOfficial: true,
    features: ["Image generation", "AI art", "Style transfer"],
  },
  {
    id: "sentry-official",
    name: "Sentry",
    description: "Error tracking and performance monitoring",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers/tree/main/src/sentry",
    stars: 15000,
    category: "official",
    language: "typescript",
    installCommand: "npx -y @modelcontextprotocol/server-sentry",
    isOfficial: true,
    features: ["Error tracking", "Performance", "Releases"],
  },
  // ============================================
  // DATABASES
  // ============================================
  {
    id: "mongodb",
    name: "MongoDB",
    description: "MongoDB database operations and aggregations",
    author: "Community",
    repository: "https://github.com/kiliczsh/mcp-mongo-server",
    stars: 280,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y mcp-mongo-server",
    isOfficial: false,
    features: ["CRUD", "Aggregations", "Indexes"],
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Supabase backend-as-a-service integration",
    author: "Supabase",
    repository: "https://github.com/supabase-community/mcp-server-supabase",
    stars: 650,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @supabase/mcp-server-supabase",
    isOfficial: false,
    features: ["Database", "Auth", "Storage", "Functions"],
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "MySQL database operations",
    author: "Community",
    repository: "https://github.com/benborla/mcp-server-mysql",
    stars: 180,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @benborla/mcp-server-mysql",
    isOfficial: false,
    features: ["Queries", "Schema", "Transactions"],
  },
  {
    id: "redis",
    name: "Redis",
    description: "Redis cache and data structure operations",
    author: "Community",
    repository: "https://github.com/redis/mcp-redis",
    stars: 320,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @redis/mcp-redis",
    isOfficial: false,
    features: ["Key-value", "Pub/Sub", "Streams", "Caching"],
  },
  {
    id: "neon",
    name: "Neon",
    description: "Neon serverless PostgreSQL",
    author: "Neon",
    repository: "https://github.com/neondatabase/mcp-server-neon",
    stars: 420,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @neondatabase/mcp-server-neon",
    isOfficial: false,
    features: ["Serverless Postgres", "Branching", "Autoscaling"],
  },
  {
    id: "turso",
    name: "Turso",
    description: "Turso edge SQLite database",
    author: "Turso",
    repository: "https://github.com/tursodatabase/mcp-turso",
    stars: 380,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @tursodatabase/mcp-turso",
    isOfficial: false,
    features: ["Edge SQLite", "Replication", "Embedded"],
  },
  {
    id: "planetscale",
    name: "PlanetScale",
    description: "PlanetScale serverless MySQL",
    author: "Community",
    repository: "https://github.com/planetscale/mcp-server-planetscale",
    stars: 290,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @planetscale/mcp-server",
    isOfficial: false,
    features: ["Serverless MySQL", "Branching", "Deploy requests"],
  },
  {
    id: "fauna",
    name: "Fauna",
    description: "Fauna distributed database",
    author: "Fauna",
    repository: "https://github.com/fauna/mcp-server-fauna",
    stars: 210,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @fauna/mcp-server",
    isOfficial: false,
    features: ["Document DB", "GraphQL", "Transactions"],
  },
  {
    id: "qdrant",
    name: "Qdrant",
    description: "Qdrant vector database for AI/ML",
    author: "Qdrant",
    repository: "https://github.com/qdrant/mcp-server-qdrant",
    stars: 480,
    category: "databases",
    language: "python",
    installCommand: "uvx mcp-server-qdrant",
    isOfficial: false,
    features: ["Vector search", "Similarity", "Embeddings"],
  },
  {
    id: "pinecone",
    name: "Pinecone",
    description: "Pinecone vector database",
    author: "Pinecone",
    repository: "https://github.com/pinecone-io/mcp-server-pinecone",
    stars: 520,
    category: "databases",
    language: "typescript",
    installCommand: "npx -y @pinecone-database/mcp-server",
    isOfficial: false,
    features: ["Vector DB", "Semantic search", "RAG"],
  },
  {
    id: "chroma",
    name: "ChromaDB",
    description: "Chroma embedding database for AI",
    author: "Chroma",
    repository: "https://github.com/chroma-core/mcp-server-chroma",
    stars: 390,
    category: "databases",
    language: "python",
    installCommand: "uvx mcp-server-chroma",
    isOfficial: false,
    features: ["Embeddings", "Vector store", "Collections"],
  },
  {
    id: "weaviate",
    name: "Weaviate",
    description: "Weaviate vector search engine",
    author: "Weaviate",
    repository: "https://github.com/weaviate/mcp-server-weaviate",
    stars: 340,
    category: "databases",
    language: "python",
    installCommand: "uvx mcp-server-weaviate",
    isOfficial: false,
    features: ["Vector search", "Hybrid search", "GraphQL"],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Snowflake data warehouse",
    author: "Community",
    repository: "https://github.com/datawiz168/mcp-snowflake-service",
    stars: 180,
    category: "databases",
    language: "python",
    installCommand: "uvx mcp-snowflake",
    isOfficial: false,
    features: ["Queries", "Warehouses", "Stages"],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    description: "Google BigQuery analytics",
    author: "Community",
    repository: "https://github.com/LucasHild/mcp-server-bigquery",
    stars: 150,
    category: "databases",
    language: "python",
    installCommand: "uvx mcp-server-bigquery",
    isOfficial: false,
    features: ["SQL queries", "Datasets", "Tables"],
  },
  {
    id: "duckdb",
    name: "DuckDB",
    description: "DuckDB analytical database",
    author: "Community",
    repository: "https://github.com/hannesmuehleisen/mcp-server-duckdb",
    stars: 260,
    category: "databases",
    language: "python",
    installCommand: "uvx mcp-server-duckdb",
    isOfficial: false,
    features: ["Analytics", "Parquet", "CSV", "In-memory"],
  },
  // ============================================
  // DEVELOPER TOOLS
  // ============================================
  {
    id: "gitlab",
    name: "GitLab",
    description: "GitLab API for project management and CI/CD",
    author: "Community",
    repository: "https://github.com/baba786/gitlab-mcp-server",
    stars: 180,
    category: "developer-tools",
    language: "python",
    installCommand: "uvx mcp-gitlab",
    isOfficial: false,
    features: ["Projects", "Issues", "Merge requests", "Pipelines"],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Linear project management and issue tracking",
    author: "Community",
    repository: "https://github.com/jerhadf/linear-mcp-server",
    stars: 380,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y @linear/mcp-server",
    isOfficial: false,
    features: ["Issues", "Projects", "Teams", "Cycles"],
  },
  {
    id: "jira",
    name: "Jira",
    description: "Atlassian Jira project management",
    author: "Community",
    repository: "https://github.com/sooperset/mcp-server-jira",
    stars: 290,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y mcp-server-jira",
    isOfficial: false,
    features: ["Issues", "Projects", "Sprints", "Boards"],
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description: "Bitbucket repository management",
    author: "Community",
    repository: "https://github.com/aashari/mcp-server-atlassian-bitbucket",
    stars: 140,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y mcp-server-atlassian-bitbucket",
    isOfficial: false,
    features: ["Repos", "PRs", "Pipelines", "Snippets"],
  },
  {
    id: "circleci",
    name: "CircleCI",
    description: "CircleCI CI/CD pipelines",
    author: "Community",
    repository: "https://github.com/CircleCI-Public/mcp-server-circleci",
    stars: 170,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y @circleci/mcp-server",
    isOfficial: false,
    features: ["Pipelines", "Jobs", "Workflows", "Artifacts"],
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Vercel deployment platform",
    author: "Community",
    repository: "https://github.com/vercel/mcp-server-vercel",
    stars: 420,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y @vercel/mcp-server",
    isOfficial: false,
    features: ["Deployments", "Projects", "Domains", "Logs"],
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Netlify deployment and hosting",
    author: "Community",
    repository: "https://github.com/netlify/mcp-server-netlify",
    stars: 310,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y @netlify/mcp-server",
    isOfficial: false,
    features: ["Deployments", "Sites", "Functions", "Forms"],
  },
  {
    id: "npm",
    name: "NPM",
    description: "NPM package registry operations",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-npm",
    stars: 160,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y @nicholasgriffintn/mcp-server-npm",
    isOfficial: false,
    features: ["Package search", "Info", "Downloads", "Versions"],
  },
  {
    id: "docker",
    name: "Docker",
    description: "Docker container management",
    author: "Community",
    repository: "https://github.com/ckreiling/mcp-server-docker",
    stars: 350,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y mcp-server-docker",
    isOfficial: false,
    features: ["Containers", "Images", "Volumes", "Networks"],
  },
  {
    id: "raycast",
    name: "Raycast",
    description: "Raycast extension development",
    author: "Raycast",
    repository: "https://github.com/raycast/mcp-server-raycast",
    stars: 280,
    category: "developer-tools",
    language: "typescript",
    installCommand: "npx -y @raycast/mcp-server",
    isOfficial: false,
    features: ["Extensions", "Commands", "Quicklinks"],
  },
  // ============================================
  // CLOUD PLATFORMS
  // ============================================
  {
    id: "aws",
    name: "AWS",
    description: "Amazon Web Services integration",
    author: "AWS",
    repository: "https://github.com/aws-samples/sample-mcp-server-aws",
    stars: 680,
    category: "cloud",
    language: "typescript",
    installCommand: "npx -y @aws/mcp-server",
    isOfficial: false,
    features: ["S3", "Lambda", "EC2", "CloudWatch"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Cloudflare Workers, KV, R2, and D1",
    author: "Cloudflare",
    repository: "https://github.com/cloudflare/mcp-server-cloudflare",
    stars: 920,
    category: "cloud",
    language: "typescript",
    installCommand: "npx -y @cloudflare/mcp-server-cloudflare",
    isOfficial: false,
    features: ["Workers", "KV", "R2", "D1"],
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    description: "Kubernetes cluster management",
    author: "Community",
    repository: "https://github.com/strowk/mcp-k8s-go",
    stars: 320,
    category: "cloud",
    language: "go",
    installCommand: "go install github.com/strowk/mcp-k8s-go@latest",
    isOfficial: false,
    features: ["Pods", "Deployments", "Services", "Logs"],
  },
  {
    id: "azure",
    name: "Azure",
    description: "Microsoft Azure cloud services",
    author: "Microsoft",
    repository: "https://github.com/Azure/mcp-server-azure",
    stars: 480,
    category: "cloud",
    language: "typescript",
    installCommand: "npx -y @azure/mcp-server",
    isOfficial: false,
    features: ["Blob Storage", "Functions", "CosmosDB", "AKS"],
  },
  {
    id: "gcp",
    name: "Google Cloud",
    description: "Google Cloud Platform services",
    author: "Community",
    repository: "https://github.com/rishikavikondala/mcp-server-gcp",
    stars: 240,
    category: "cloud",
    language: "python",
    installCommand: "uvx mcp-server-gcp",
    isOfficial: false,
    features: ["GCS", "BigQuery", "Pub/Sub", "Cloud Run"],
  },
  {
    id: "terraform",
    name: "Terraform",
    description: "Terraform infrastructure as code",
    author: "Community",
    repository: "https://github.com/hashicorp/mcp-server-terraform",
    stars: 380,
    category: "cloud",
    language: "go",
    installCommand: "go install github.com/hashicorp/mcp-server-terraform@latest",
    isOfficial: false,
    features: ["Plan", "Apply", "State", "Modules"],
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    description: "DigitalOcean cloud infrastructure",
    author: "Community",
    repository: "https://github.com/digitalocean/mcp-server-digitalocean",
    stars: 190,
    category: "cloud",
    language: "typescript",
    installCommand: "npx -y @digitalocean/mcp-server",
    isOfficial: false,
    features: ["Droplets", "Spaces", "Kubernetes", "Databases"],
  },
  // ============================================
  // COMMUNICATION
  // ============================================
  {
    id: "discord",
    name: "Discord",
    description: "Discord bot integration for servers",
    author: "Community",
    repository: "https://github.com/v-3/discordmcp",
    stars: 240,
    category: "communication",
    language: "typescript",
    installCommand: "npx -y discord-mcp",
    isOfficial: false,
    features: ["Messages", "Channels", "Guilds", "Reactions"],
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Gmail API for email operations",
    author: "Community",
    repository: "https://github.com/nickshanks347/gmail-mcp",
    stars: 180,
    category: "communication",
    language: "typescript",
    installCommand: "npx -y gmail-mcp-server",
    isOfficial: false,
    features: ["Read", "Send", "Search", "Labels"],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Telegram bot and messaging",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-telegram",
    stars: 160,
    category: "communication",
    language: "typescript",
    installCommand: "npx -y mcp-server-telegram",
    isOfficial: false,
    features: ["Messages", "Groups", "Bots", "Files"],
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Twilio SMS and voice communications",
    author: "Twilio",
    repository: "https://github.com/twilio/mcp-server-twilio",
    stars: 270,
    category: "communication",
    language: "typescript",
    installCommand: "npx -y @twilio/mcp-server",
    isOfficial: false,
    features: ["SMS", "Voice", "WhatsApp", "Verify"],
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Microsoft Teams integration",
    author: "Community",
    repository: "https://github.com/sooperset/mcp-server-teams",
    stars: 190,
    category: "communication",
    language: "typescript",
    installCommand: "npx -y mcp-server-teams",
    isOfficial: false,
    features: ["Messages", "Channels", "Meetings", "Files"],
  },
  {
    id: "email-imap",
    name: "Email IMAP",
    description: "Generic IMAP email server",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-email",
    stars: 140,
    category: "communication",
    language: "typescript",
    installCommand: "npx -y mcp-server-email",
    isOfficial: false,
    features: ["IMAP", "Read", "Send", "Folders"],
  },
  // ============================================
  // SEARCH & WEB
  // ============================================
  {
    id: "exa",
    name: "Exa",
    description: "AI-powered search engine for research",
    author: "Exa",
    repository: "https://github.com/exa-labs/exa-mcp-server",
    stars: 450,
    category: "search",
    language: "typescript",
    installCommand: "npx -y exa-mcp-server",
    isOfficial: false,
    features: ["Semantic search", "Research", "Content extraction"],
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description: "Web scraping and data extraction",
    author: "Firecrawl",
    repository: "https://github.com/mendableai/firecrawl-mcp-server",
    stars: 580,
    category: "search",
    language: "typescript",
    installCommand: "npx -y firecrawl-mcp",
    isOfficial: false,
    features: ["Web scraping", "Data extraction", "Crawling"],
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "Tavily AI search API",
    author: "Tavily",
    repository: "https://github.com/tavily-ai/mcp-server-tavily",
    stars: 390,
    category: "search",
    language: "typescript",
    installCommand: "npx -y @tavily/mcp-server",
    isOfficial: false,
    features: ["AI search", "Research", "Fact-checking"],
  },
  {
    id: "serpapi",
    name: "SerpAPI",
    description: "Google search results API",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-serpapi",
    stars: 180,
    category: "search",
    language: "typescript",
    installCommand: "npx -y mcp-server-serpapi",
    isOfficial: false,
    features: ["Google search", "Images", "News", "Shopping"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Perplexity AI search",
    author: "Community",
    repository: "https://github.com/sooperset/mcp-server-perplexity",
    stars: 320,
    category: "search",
    language: "typescript",
    installCommand: "npx -y mcp-server-perplexity",
    isOfficial: false,
    features: ["AI search", "Citations", "Research"],
  },
  {
    id: "bing",
    name: "Bing Search",
    description: "Microsoft Bing search API",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-bing",
    stars: 140,
    category: "search",
    language: "typescript",
    installCommand: "npx -y mcp-server-bing",
    isOfficial: false,
    features: ["Web search", "Images", "News", "Videos"],
  },
  // ============================================
  // PRODUCTIVITY
  // ============================================
  {
    id: "notion",
    name: "Notion",
    description: "Notion workspace and database integration",
    author: "Community",
    repository: "https://github.com/suekou/mcp-notion-server",
    stars: 480,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y @notionhq/mcp-server",
    isOfficial: false,
    features: ["Pages", "Databases", "Blocks", "Search"],
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Airtable spreadsheet database operations",
    author: "Community",
    repository: "https://github.com/domdomegg/airtable-mcp-server",
    stars: 260,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y airtable-mcp-server",
    isOfficial: false,
    features: ["Tables", "Records", "Views", "Formulas"],
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Google Sheets spreadsheet operations",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-google-sheets",
    stars: 210,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-google-sheets",
    isOfficial: false,
    features: ["Read", "Write", "Formulas", "Charts"],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Google Calendar management",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-google-calendar",
    stars: 190,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-google-calendar",
    isOfficial: false,
    features: ["Events", "Calendars", "Reminders", "Scheduling"],
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Todoist task management",
    author: "Community",
    repository: "https://github.com/abhiz123/mcp-server-todoist",
    stars: 170,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-todoist",
    isOfficial: false,
    features: ["Tasks", "Projects", "Labels", "Filters"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Obsidian vault operations",
    author: "Community",
    repository: "https://github.com/MarkusMaal/mcp-server-obsidian",
    stars: 380,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-obsidian",
    isOfficial: false,
    features: ["Notes", "Links", "Tags", "Search"],
  },
  {
    id: "trello",
    name: "Trello",
    description: "Trello board management",
    author: "Community",
    repository: "https://github.com/sooperset/mcp-server-trello",
    stars: 150,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-trello",
    isOfficial: false,
    features: ["Boards", "Lists", "Cards", "Labels"],
  },
  {
    id: "asana",
    name: "Asana",
    description: "Asana project management",
    author: "Community",
    repository: "https://github.com/sooperset/mcp-server-asana",
    stars: 140,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-asana",
    isOfficial: false,
    features: ["Tasks", "Projects", "Teams", "Portfolios"],
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Apple Notes on macOS",
    author: "Community",
    repository: "https://github.com/sirmews/mcp-server-apple-notes",
    stars: 220,
    category: "productivity",
    language: "typescript",
    installCommand: "npx -y mcp-server-apple-notes",
    isOfficial: false,
    features: ["Notes", "Folders", "Search", "Attachments"],
  },
  // ============================================
  // AI/ML
  // ============================================
  {
    id: "context7",
    name: "Context7",
    description: "Up-to-date library documentation for any framework",
    author: "Context7",
    repository: "https://github.com/context7-labs/mcp-context7",
    stars: 820,
    category: "ai-ml",
    language: "typescript",
    installCommand: "npx -y @context7/mcp-server",
    isOfficial: false,
    features: ["Library docs", "Code examples", "API references"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "OpenAI API integration",
    author: "Community",
    repository: "https://github.com/mzxrai/mcp-server-openai",
    stars: 540,
    category: "ai-ml",
    language: "typescript",
    installCommand: "npx -y mcp-server-openai",
    isOfficial: false,
    features: ["GPT", "DALL-E", "Whisper", "Embeddings"],
  },
  {
    id: "langchain",
    name: "LangChain",
    description: "LangChain integration for AI chains",
    author: "LangChain",
    repository: "https://github.com/langchain-ai/mcp-server-langchain",
    stars: 480,
    category: "ai-ml",
    language: "python",
    installCommand: "uvx mcp-server-langchain",
    isOfficial: false,
    features: ["Chains", "Agents", "Tools", "Memory"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description: "Hugging Face models and datasets",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-huggingface",
    stars: 350,
    category: "ai-ml",
    language: "python",
    installCommand: "uvx mcp-server-huggingface",
    isOfficial: false,
    features: ["Models", "Datasets", "Inference", "Spaces"],
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Replicate ML model hosting",
    author: "Replicate",
    repository: "https://github.com/replicate/mcp-server-replicate",
    stars: 290,
    category: "ai-ml",
    language: "typescript",
    installCommand: "npx -y @replicate/mcp-server",
    isOfficial: false,
    features: ["Model inference", "Image gen", "Fine-tuning"],
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Ollama local LLM server",
    author: "Community",
    repository: "https://github.com/mark3labs/mcp-server-ollama",
    stars: 620,
    category: "ai-ml",
    language: "typescript",
    installCommand: "npx -y mcp-server-ollama",
    isOfficial: false,
    features: ["Local LLMs", "Llama", "Mistral", "Phi"],
  },
  // ============================================
  // BROWSER AUTOMATION
  // ============================================
  {
    id: "playwright",
    name: "Playwright",
    description: "Cross-browser automation with Playwright",
    author: "Community",
    repository: "https://github.com/executeautomation/mcp-playwright",
    stars: 680,
    category: "browser",
    language: "typescript",
    installCommand: "npx -y @executeautomation/playwright-mcp-server",
    isOfficial: false,
    features: ["Multi-browser", "Screenshots", "Testing", "Automation"],
  },
  {
    id: "browserbase",
    name: "Browserbase",
    description: "Browserbase cloud browser automation",
    author: "Browserbase",
    repository: "https://github.com/browserbase/mcp-server-browserbase",
    stars: 420,
    category: "browser",
    language: "typescript",
    installCommand: "npx -y @browserbase/mcp-server",
    isOfficial: false,
    features: ["Cloud browsers", "Sessions", "Scraping"],
  },
  {
    id: "selenium",
    name: "Selenium",
    description: "Selenium WebDriver automation",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-selenium",
    stars: 240,
    category: "browser",
    language: "typescript",
    installCommand: "npx -y mcp-server-selenium",
    isOfficial: false,
    features: ["WebDriver", "Testing", "Screenshots", "Forms"],
  },
  // ============================================
  // DATA & ANALYTICS
  // ============================================
  {
    id: "datadog",
    name: "Datadog",
    description: "Datadog monitoring and analytics",
    author: "Datadog",
    repository: "https://github.com/DataDog/mcp-server-datadog",
    stars: 380,
    category: "data",
    language: "typescript",
    installCommand: "npx -y @datadog/mcp-server",
    isOfficial: false,
    features: ["Metrics", "Logs", "Traces", "Dashboards"],
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Grafana dashboards and alerting",
    author: "Grafana",
    repository: "https://github.com/grafana/mcp-server-grafana",
    stars: 320,
    category: "data",
    language: "typescript",
    installCommand: "npx -y @grafana/mcp-server",
    isOfficial: false,
    features: ["Dashboards", "Alerts", "Queries", "Annotations"],
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Prometheus metrics and queries",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-prometheus",
    stars: 180,
    category: "data",
    language: "typescript",
    installCommand: "npx -y mcp-server-prometheus",
    isOfficial: false,
    features: ["PromQL", "Metrics", "Alerts", "Targets"],
  },
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    description: "Elasticsearch search and analytics",
    author: "Community",
    repository: "https://github.com/cr4ne89/mcp-server-elasticsearch",
    stars: 210,
    category: "data",
    language: "typescript",
    installCommand: "npx -y mcp-server-elasticsearch",
    isOfficial: false,
    features: ["Search", "Aggregations", "Indices", "Mappings"],
  },
  // ============================================
  // FILE SYSTEMS
  // ============================================
  {
    id: "s3",
    name: "AWS S3",
    description: "Amazon S3 object storage",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-s3",
    stars: 280,
    category: "file-systems",
    language: "typescript",
    installCommand: "npx -y mcp-server-s3",
    isOfficial: false,
    features: ["Buckets", "Objects", "Presigned URLs", "Versioning"],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Dropbox file storage",
    author: "Community",
    repository: "https://github.com/nicholasgriffintn/mcp-server-dropbox",
    stars: 160,
    category: "file-systems",
    language: "typescript",
    installCommand: "npx -y mcp-server-dropbox",
    isOfficial: false,
    features: ["Files", "Folders", "Sharing", "Search"],
  },
  {
    id: "box",
    name: "Box",
    description: "Box cloud content management",
    author: "Community",
    repository: "https://github.com/box/mcp-server-box",
    stars: 140,
    category: "file-systems",
    language: "typescript",
    installCommand: "npx -y @box/mcp-server",
    isOfficial: false,
    features: ["Files", "Folders", "Metadata", "Workflows"],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Microsoft OneDrive storage",
    author: "Community",
    repository: "https://github.com/sooperset/mcp-server-onedrive",
    stars: 130,
    category: "file-systems",
    language: "typescript",
    installCommand: "npx -y mcp-server-onedrive",
    isOfficial: false,
    features: ["Files", "Folders", "Sharing", "Sync"],
  },
];

// Category metadata
const CATEGORY_META: Record<MCPCategory, { label: string; icon: typeof Database; color: string }> = {
  all: { label: "Todos", icon: Grid3x3, color: "bg-gray-500" },
  official: { label: "Oficiales", icon: Sparkles, color: "bg-amber-500" },
  databases: { label: "Bases de Datos", icon: Database, color: "bg-blue-500" },
  "developer-tools": { label: "Dev Tools", icon: Github, color: "bg-purple-500" },
  cloud: { label: "Cloud", icon: Cloud, color: "bg-cyan-500" },
  communication: { label: "Comunicacion", icon: MessageSquare, color: "bg-green-500" },
  "file-systems": { label: "Archivos", icon: FolderOpen, color: "bg-orange-500" },
  search: { label: "Busqueda", icon: Globe, color: "bg-pink-500" },
  productivity: { label: "Productividad", icon: BarChart3, color: "bg-indigo-500" },
  "ai-ml": { label: "AI/ML", icon: Brain, color: "bg-red-500" },
  browser: { label: "Browser", icon: Monitor, color: "bg-teal-500" },
  data: { label: "Data", icon: BarChart3, color: "bg-emerald-500" },
};

interface MCPExplorerWidgetProps {
  widget: Widget;
  onUpdateConfig?: (config: Partial<Widget["config"]>) => void;
}

export function MCPExplorerWidget({ widget, onUpdateConfig }: MCPExplorerWidgetProps) {
  const config = widget.config || {};
  const [searchQuery, setSearchQuery] = useState((config.mcpSearchQuery as string) || "");
  const [selectedCategory, setSelectedCategory] = useState<MCPCategory>(
    (config.mcpCategory as MCPCategory) || "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (config.mcpViewMode as "grid" | "list") || "grid"
  );
  const [sortBy, setSortBy] = useState<"name" | "stars" | "category">(
    (config.mcpSortBy as "name" | "stars" | "category") || "stars"
  );
  const [favorites, setFavorites] = useState<string[]>(
    (config.mcpFavorites as string[]) || []
  );
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(
    (config.mcpShowOnlyFavorites as boolean) || false
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter and sort servers
  const filteredServers = useMemo(() => {
    let servers = [...MCP_SERVERS];

    // Filter by favorites
    if (showOnlyFavorites) {
      servers = servers.filter((s) => favorites.includes(s.id));
    }

    // Filter by category
    if (selectedCategory !== "all") {
      servers = servers.filter((s) => s.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      servers = servers.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.features.some((f) => f.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        servers.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "stars":
        servers.sort((a, b) => (b.stars || 0) - (a.stars || 0));
        break;
      case "category":
        servers.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return servers;
  }, [searchQuery, selectedCategory, sortBy, favorites, showOnlyFavorites]);

  const handleCopyCommand = async (server: MCPServer) => {
    try {
      await navigator.clipboard.writeText(server.installCommand);
      setCopiedId(server.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const toggleFavorite = (serverId: string) => {
    const newFavorites = favorites.includes(serverId)
      ? favorites.filter((id) => id !== serverId)
      : [...favorites, serverId];
    setFavorites(newFavorites);
    onUpdateConfig?.({ mcpFavorites: newFavorites } as Record<string, unknown>);
  };

  const handleCategoryChange = (value: string) => {
    const category = value as MCPCategory;
    setSelectedCategory(category);
    onUpdateConfig?.({ mcpCategory: category } as Record<string, unknown>);
  };

  const handleSortChange = (value: string) => {
    const sort = value as "name" | "stars" | "category";
    setSortBy(sort);
    onUpdateConfig?.({ mcpSortBy: sort } as Record<string, unknown>);
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    onUpdateConfig?.({ mcpViewMode: mode } as Record<string, unknown>);
  };

  const formatStars = (stars?: number) => {
    if (!stars) return "—";
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
    return stars.toString();
  };

  const languageColors: Record<string, string> = {
    typescript: "bg-blue-500",
    python: "bg-yellow-500",
    go: "bg-cyan-500",
    rust: "bg-orange-500",
    other: "bg-gray-500",
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar MCP..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onUpdateConfig?.({ mcpSearchQuery: e.target.value } as Record<string, unknown>);
            }}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[130px] h-8">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-1.5">
                  <meta.icon className="h-3 w-3" />
                  {meta.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stars">Estrellas</SelectItem>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="category">Categoria</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showOnlyFavorites ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowOnlyFavorites(!showOnlyFavorites);
                    onUpdateConfig?.({ mcpShowOnlyFavorites: !showOnlyFavorites } as Record<string, unknown>);
                  }}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      showOnlyFavorites && "fill-current"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Solo favoritos</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewModeChange("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewModeChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{filteredServers.length} servidores MCP</span>
        {favorites.length > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5">
            <Heart className="mr-1 h-3 w-3 fill-red-500 text-red-500" />
            {favorites.length}
          </Badge>
        )}
      </div>

      {/* Server List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <AnimatePresence mode="popLayout">
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
                : "flex flex-col gap-2"
            )}
          >
            {filteredServers.map((server) => (
              <motion.div
                key={server.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group relative rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50",
                  viewMode === "list" && "flex items-center gap-3"
                )}
              >
                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(server.id)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      favorites.includes(server.id)
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground hover:text-red-500"
                    )}
                  />
                </button>

                {/* Content */}
                <div className={cn("flex-1", viewMode === "list" && "flex items-center gap-3")}>
                  <div className="flex items-start gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {server.isOfficial && (
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className="font-medium text-sm">{server.name}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          languageColors[server.language]
                        )}
                        title={server.language}
                      />
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-4 px-1",
                          CATEGORY_META[server.category]?.color,
                          "text-white border-0"
                        )}
                      >
                        {CATEGORY_META[server.category]?.label}
                      </Badge>
                    </div>
                  </div>

                  {viewMode === "grid" && (
                    <>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {server.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {server.features.slice(0, 3).map((feature) => (
                          <Badge
                            key={feature}
                            variant="secondary"
                            className="text-[10px] h-4 px-1"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {formatStars(server.stars)}
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleCopyCommand(server)}
                          >
                            {copiedId === server.id ? (
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedId === server.id ? "Copiado!" : "Instalar"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <code className="text-xs">{server.installCommand}</code>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <a
                      href={server.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                    >
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {filteredServers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No se encontraron servidores MCP
            </p>
            <p className="text-xs text-muted-foreground">
              Prueba con otra busqueda o categoria
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default MCPExplorerWidget;
