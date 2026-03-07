"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Functional fallback components to support useTranslation hook

function ErrorBoundaryFallback({ error, onRetry, onReload }: { error: Error | null; onRetry: () => void; onReload: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t("errorBoundary.title")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("errorBoundary.description")}
        </p>
        {process.env.NODE_ENV === "development" && error && (
          <div className="mb-4 p-3 bg-muted rounded-md text-left">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("errorBoundary.retry")}
          </Button>
          <Button onClick={onReload}>
            {t("errorBoundary.reloadPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WidgetErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-card/50 rounded-lg border border-border p-4">
      <AlertTriangle className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground text-center mb-3">
        {t("errorBoundary.widgetError")}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="gap-1"
      >
        <RefreshCw className="w-3 h-3" />
        {t("errorBoundary.retry")}
      </Button>
    </div>
  );
}

/**
 * Global Error Boundary component that catches JavaScript errors
 * anywhere in their child component tree and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Report error to Sentry in production
    Sentry.withScope((scope) => {
      scope.setTag("error.boundary", "global");
      scope.setExtra("componentStack", errorInfo.componentStack);
      Sentry.captureException(error);
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI (uses functional component for i18n hook support)
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    // Ensure we never return undefined (React 19 is stricter)
    return this.props.children ?? <></>;
  }
}

/**
 * Props for WidgetErrorBoundary
 */
interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetId?: string;
  widgetType?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Widget-level Error Boundary for individual widgets.
 * Shows a compact error state that doesn't break the entire grid.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      `Widget error [${this.props.widgetType || "unknown"}]:`,
      error,
      errorInfo
    );

    // Report error to Sentry with widget context
    Sentry.withScope((scope) => {
      scope.setTag("error.boundary", "widget");
      scope.setTag("widget.type", this.props.widgetType || "unknown");
      scope.setTag("widget.id", this.props.widgetId || "unknown");
      scope.setExtra("componentStack", errorInfo.componentStack);
      Sentry.captureException(error);
    });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <WidgetErrorFallback onRetry={this.handleRetry} />;
    }

    // Ensure we never return undefined (React 19 is stricter)
    return this.props.children ?? <></>;
  }
}
