import { Github, ExternalLink, Heart, Download } from "lucide-react";

const links = [
  {
    label: "GitHub",
    href: "https://github.com/SwonDev/Stacklume",
    icon: Github,
  },
  {
    label: "Releases",
    href: "https://github.com/SwonDev/Stacklume/releases",
    icon: Download,
  },
  {
    label: "Demo",
    href: "https://demo.stacklume.app",
    icon: ExternalLink,
  },
  {
    label: "Ko-fi",
    href: "https://ko-fi.com/swondev",
    icon: Heart,
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/40 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <link.icon className="size-4" />
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground/50">
          Hecho con amor por SwonDev &middot; v0.4.4
        </p>
      </div>
    </footer>
  );
}
