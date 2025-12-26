"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Github,
  RefreshCw,
  ExternalLink,
  Plus,
  Search,
  X,
  Star,
  GitFork,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Code2,
  CircleDot,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface GithubSearchWidgetProps {
  widget: Widget;
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  open_issues_count: number;
  license: {
    name: string;
  } | null;
}

interface SearchState {
  repos: GithubRepo[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  page: number;
}

const ITEMS_PER_PAGE = 30;

// Sort options
type SortKey = "stars" | "forks" | "updated" | "best-match";

interface SortOption {
  key: SortKey;
  label: string;
  shortLabel: string;
  icon: "up" | "down" | "default";
  apiSort: string;
  apiOrder: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "best-match", label: "Mejor coincidencia", shortLabel: "Mejor", icon: "default", apiSort: "", apiOrder: "desc" },
  { key: "stars", label: "Más estrellas", shortLabel: "Estrellas", icon: "down", apiSort: "stars", apiOrder: "desc" },
  { key: "forks", label: "Más forks", shortLabel: "Forks", icon: "down", apiSort: "forks", apiOrder: "desc" },
  { key: "updated", label: "Recién actualizado", shortLabel: "Actualiz.", icon: "down", apiSort: "updated", apiOrder: "desc" },
];

// Popular language filters
const LANGUAGE_FILTERS = [
  { key: "", label: "Todos" },
  { key: "javascript", label: "JavaScript" },
  { key: "typescript", label: "TypeScript" },
  { key: "python", label: "Python" },
  { key: "java", label: "Java" },
  { key: "go", label: "Go" },
  { key: "rust", label: "Rust" },
  { key: "c++", label: "C++" },
  { key: "c#", label: "C#" },
  { key: "php", label: "PHP" },
  { key: "ruby", label: "Ruby" },
];

// Language colors (subset of GitHub's language colors)
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Vue: "#41b883",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Lua: "#000080",
};

// Format number with K/M suffix
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

// Format relative date
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

export function GithubSearchWidget({ widget: _widget }: GithubSearchWidgetProps) {
  const { openAddLinkModal } = useLinksStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("stars");
  const [languageFilter, setLanguageFilter] = useState("");
  const [searchResults, setSearchResults] = useState<SearchState>({
    repos: [],
    totalCount: 0,
    hasMore: false,
    loading: false,
    page: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search fetch function
  const fetchSearch = useCallback(async (term: string, page: number, sort: SortKey, language: string) => {
    if (!term.trim()) {
      setSearchResults({
        repos: [],
        totalCount: 0,
        hasMore: false,
        loading: false,
        page: 1,
      });
      return;
    }

    setSearchResults(prev => ({ ...prev, loading: true }));
    setError(null);

    try {
      const sortOption = SORT_OPTIONS.find(o => o.key === sort) || SORT_OPTIONS[1];
      const params = new URLSearchParams({
        q: term,
        page: page.toString(),
        per_page: ITEMS_PER_PAGE.toString(),
        sort: sortOption.apiSort,
        order: sortOption.apiOrder,
      });

      if (language) {
        params.set("language", language);
      }

      const response = await fetch(`/api/github-repos?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();

      setSearchResults(prev => {
        const existingRepos = page > 1 ? prev.repos : [];
        const existingIds = new Set(existingRepos.map(r => r.id));
        const newRepos = data.repos.filter((r: GithubRepo) => !existingIds.has(r.id));

        return {
          repos: [...existingRepos, ...newRepos],
          totalCount: data.totalCount,
          hasMore: data.hasMore,
          loading: false,
          page: page,
        };
      });
    } catch (err) {
      console.error("GitHub search error:", err);
      setError(err instanceof Error ? err.message : "Error al buscar repositorios");
      setSearchResults(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Trigger search when debounced term, sort, or language changes
  useEffect(() => {
    if (debouncedSearch) {
      fetchSearch(debouncedSearch, 1, sortBy, languageFilter);
    }
  }, [debouncedSearch, sortBy, languageFilter, fetchSearch]);

  // Handle load more
  const handleLoadMore = () => {
    if (debouncedSearch && searchResults.hasMore && !searchResults.loading) {
      fetchSearch(debouncedSearch, searchResults.page + 1, sortBy, languageFilter);
    }
  };

  // Quick add link to Stacklume
  const handleQuickAdd = (repo: GithubRepo) => {
    openAddLinkModal({
      url: repo.html_url,
      title: repo.full_name,
      description: repo.description || `${repo.language || "Repository"} - ${formatNumber(repo.stargazers_count)} stars`,
    });
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSearchResults({
      repos: [],
      totalCount: 0,
      hasMore: false,
      loading: false,
      page: 1,
    });
    searchInputRef.current?.focus();
  };

  return (
    <div className="@container flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-2 @[200px]:px-3 @[300px]:px-4 py-2 @[200px]:py-3">
        <div className="flex items-center gap-1.5 @[200px]:gap-2">
          <div className={cn(
            "flex items-center justify-center rounded-lg bg-gradient-to-br from-gray-700/20 to-gray-900/20 dark:from-gray-300/20 dark:to-gray-100/20",
            "w-6 h-6 @[200px]:w-7 @[200px]:h-7 @[300px]:w-8 @[300px]:h-8"
          )}>
            <Github className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 @[300px]:h-4 @[300px]:w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs @[200px]:text-sm">GitHub Search</h3>
            <p className="text-[10px] @[200px]:text-xs text-muted-foreground hidden @[250px]:block">
              {searchResults.totalCount > 0
                ? `${searchResults.totalCount.toLocaleString()} repos`
                : "Busca repositorios"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Language Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 @[200px]:h-7 @[300px]:h-8 px-1.5 @[200px]:px-2 gap-1"
              >
                <Code2 className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                <span className="hidden @[400px]:inline text-[10px] @[450px]:text-xs truncate max-w-[60px]">
                  {languageFilter || "Todos"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 max-h-64 overflow-y-auto">
              {LANGUAGE_FILTERS.map((lang) => (
                <DropdownMenuItem
                  key={lang.key}
                  onClick={() => setLanguageFilter(lang.key)}
                  className={cn(
                    "text-xs gap-2",
                    languageFilter === lang.key && "bg-accent"
                  )}
                >
                  {lang.key && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: LANGUAGE_COLORS[lang.label] || "#8b949e" }}
                    />
                  )}
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 @[200px]:h-7 @[300px]:h-8 px-1.5 @[200px]:px-2 gap-1"
              >
                {sortBy === "best-match" ? (
                  <ArrowUpDown className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                ) : (
                  <ArrowDown className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                )}
                <span className="hidden @[350px]:inline text-[10px] @[400px]:text-xs">
                  {SORT_OPTIONS.find(o => o.key === sortBy)?.shortLabel || "Ordenar"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => setSortBy(option.key)}
                  className={cn(
                    "text-xs gap-2",
                    sortBy === option.key && "bg-accent"
                  )}
                >
                  {option.icon === "up" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : option.icon === "down" ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-2 @[200px]:px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar repositorios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 @[200px]:h-8 pl-7 @[200px]:pl-8 pr-7 text-xs @[200px]:text-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {searchResults.loading && searchResults.repos.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Buscando...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center p-4">
              <Github className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          ) : !debouncedSearch ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center p-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Escribe para buscar repositorios en GitHub</p>
            </div>
          ) : searchResults.repos.length === 0 && !searchResults.loading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center p-4">
              <Github className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No se encontraron repositorios para &quot;{debouncedSearch}&quot;</p>
            </div>
          ) : (
            <>
              {/* Results List */}
              <div className="p-2 @[200px]:p-3 space-y-2">
                {searchResults.repos.map((repo) => (
                  <div
                    key={repo.id}
                    className="group rounded-lg border bg-card p-2 @[200px]:p-3 transition-all hover:border-primary/50 hover:shadow-sm"
                  >
                    {/* Repo Header */}
                    <div className="flex items-start gap-2">
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="w-6 h-6 @[200px]:w-8 @[200px]:h-8 rounded-full"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-xs @[200px]:text-sm text-primary hover:underline truncate max-w-[200px]"
                          >
                            {repo.full_name}
                          </a>
                        </div>
                        {repo.description && (
                          <p className="text-[10px] @[200px]:text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {repo.description}
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuickAdd(repo)}
                          title="Añadir a Stacklume"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md hover:bg-accent h-6 w-6"
                          title="Abrir en GitHub"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    {/* Repo Stats */}
                    <div className="flex items-center gap-2 @[200px]:gap-3 mt-2 flex-wrap">
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#8b949e" }}
                          />
                          <span className="text-[9px] @[200px]:text-[10px] text-muted-foreground">
                            {repo.language}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 text-[9px] @[200px]:text-[10px] text-muted-foreground">
                        <Star className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
                        {formatNumber(repo.stargazers_count)}
                      </div>
                      <div className="flex items-center gap-0.5 text-[9px] @[200px]:text-[10px] text-muted-foreground">
                        <GitFork className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
                        {formatNumber(repo.forks_count)}
                      </div>
                      {repo.open_issues_count > 0 && (
                        <div className="flex items-center gap-0.5 text-[9px] @[200px]:text-[10px] text-muted-foreground hidden @[300px]:flex">
                          <CircleDot className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
                          {formatNumber(repo.open_issues_count)}
                        </div>
                      )}
                      {repo.license && (
                        <div className="flex items-center gap-0.5 text-[9px] @[200px]:text-[10px] text-muted-foreground hidden @[350px]:flex">
                          <Scale className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
                          <span className="truncate max-w-[60px]">{repo.license.name}</span>
                        </div>
                      )}
                      <span className="text-[8px] @[200px]:text-[9px] text-muted-foreground/70 ml-auto">
                        {formatRelativeDate(repo.updated_at)}
                      </span>
                    </div>

                    {/* Topics */}
                    {repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {repo.topics.slice(0, 4).map((topic) => (
                          <Badge
                            key={topic}
                            variant="secondary"
                            className="text-[8px] @[200px]:text-[9px] h-4 px-1.5"
                          >
                            {topic}
                          </Badge>
                        ))}
                        {repo.topics.length > 4 && (
                          <Badge
                            variant="outline"
                            className="text-[8px] @[200px]:text-[9px] h-4 px-1.5"
                          >
                            +{repo.topics.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {searchResults.hasMore && (
                <div className="flex justify-center px-3 pb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={searchResults.loading}
                    className="h-7 @[200px]:h-8 text-[10px] @[200px]:text-xs gap-1 w-full max-w-xs"
                  >
                    {searchResults.loading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    Cargar más ({(searchResults.totalCount - searchResults.repos.length).toLocaleString()} restantes)
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </div>

      {/* Footer */}
      {searchResults.repos.length > 0 && (
        <div className={cn(
          "border-t flex items-center justify-between text-muted-foreground",
          "px-2 @[200px]:px-3 py-1 @[200px]:py-1.5",
          "text-[8px] @[200px]:text-[9px] @[300px]:text-[10px]"
        )}>
          <span>
            {searchResults.repos.length.toLocaleString()}/{searchResults.totalCount.toLocaleString()} repos
          </span>
          <span className="hidden @[200px]:inline">Página {searchResults.page}</span>
        </div>
      )}
    </div>
  );
}
