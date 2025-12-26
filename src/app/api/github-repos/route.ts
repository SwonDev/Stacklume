import { NextResponse } from "next/server";

// GitHub Search API
const GITHUB_API_URL = "https://api.github.com/search/repositories";

export interface GithubRepo {
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

export interface GithubSearchResponse {
  repos: GithubRepo[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  perPage: number;
}

// Sort options for GitHub search
type SortOption = "stars" | "forks" | "updated" | "help-wanted-issues" | "";
type OrderOption = "desc" | "asc";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = Math.min(parseInt(searchParams.get("per_page") || "30", 10), 100);
    const sort = (searchParams.get("sort") || "stars") as SortOption;
    const order = (searchParams.get("order") || "desc") as OrderOption;
    const language = searchParams.get("language") || "";

    if (!query.trim()) {
      return NextResponse.json({
        repos: [],
        totalCount: 0,
        hasMore: false,
        page: 1,
        perPage,
      });
    }

    // Build the search query
    let searchQuery = query;
    if (language) {
      searchQuery += ` language:${language}`;
    }

    // Build URL params
    const githubParams = new URLSearchParams({
      q: searchQuery,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (sort) {
      githubParams.set("sort", sort);
      githubParams.set("order", order);
    }

    const response = await fetch(`${GITHUB_API_URL}?${githubParams.toString()}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Stacklume-App",
        // Add GitHub token if available for higher rate limits
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json(
          { error: "GitHub API rate limit exceeded. Try again later.", repos: [], totalCount: 0, hasMore: false },
          { status: 429 }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repos: GithubRepo[] = data.items.map((item: Record<string, any>) => ({
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      description: item.description,
      html_url: item.html_url,
      stargazers_count: item.stargazers_count,
      forks_count: item.forks_count,
      language: item.language,
      topics: item.topics || [],
      owner: {
        login: item.owner.login,
        avatar_url: item.owner.avatar_url,
      },
      created_at: item.created_at,
      updated_at: item.updated_at,
      open_issues_count: item.open_issues_count,
      license: item.license ? { name: item.license.name } : null,
    }));

    const totalCount = Math.min(data.total_count, 1000); // GitHub limits to 1000 results
    const hasMore = page * perPage < totalCount;

    const result: GithubSearchResponse = {
      repos,
      totalCount,
      hasMore,
      page,
      perPage,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GitHub API fetch error:", error);
    return NextResponse.json(
      { error: "Failed to search GitHub repositories", repos: [], totalCount: 0, hasMore: false },
      { status: 500 }
    );
  }
}
