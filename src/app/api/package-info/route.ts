import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/package-info
 * Obtiene info de un paquete desde el registro correspondiente (npm, PyPI, crates.io, etc.)
 * Body: { packageName: string, manager: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageName, manager } = body as { packageName: string; manager: string };

    if (!packageName || !manager) {
      return NextResponse.json({ error: "packageName y manager requeridos" }, { status: 400 });
    }

    let title = packageName;
    let description = "";
    let homepage = "";
    let keywords: string[] = [];

    switch (manager) {
      case "npm":
      case "pnpm":
      case "yarn":
      case "bun": {
        // API del registro de npm — devuelve JSON directamente
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = await res.json();
          title = data.name || packageName;
          description = data.description || "";
          homepage = data.homepage || data.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") || "";
          keywords = data.keywords || [];
        }
        break;
      }

      case "pip": {
        // API de PyPI
        const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = await res.json();
          title = data.info?.name || packageName;
          description = data.info?.summary || "";
          homepage = data.info?.home_page || data.info?.project_urls?.Homepage || "";
          keywords = data.info?.keywords?.split(/[,\s]+/).filter(Boolean) || [];
        }
        break;
      }

      case "cargo": {
        // API de crates.io
        const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(packageName)}`, {
          headers: { "User-Agent": "Stacklume/0.3 (https://stacklume.app)" },
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = await res.json();
          title = data.crate?.name || packageName;
          description = data.crate?.description || "";
          homepage = data.crate?.homepage || data.crate?.repository || "";
          keywords = data.crate?.keywords || [];
        }
        break;
      }

      case "gem": {
        // API de RubyGems
        const res = await fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(packageName)}.json`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = await res.json();
          title = data.name || packageName;
          description = data.info || "";
          homepage = data.homepage_uri || data.source_code_uri || "";
        }
        break;
      }

      default:
        // Para brew, go, composer, dotnet — usar el nombre del paquete como título
        title = packageName;
        description = `Paquete ${manager}`;
        break;
    }

    return NextResponse.json({
      title,
      description: description.slice(0, 300),
      homepage,
      keywords: keywords.slice(0, 10),
    });
  } catch (err) {
    console.error("[package-info]", err);
    return NextResponse.json({ error: "Error al obtener info del paquete" }, { status: 500 });
  }
}
