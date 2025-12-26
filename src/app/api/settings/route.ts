import { NextRequest, NextResponse } from "next/server";
import { db, userSettings, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";
import { updateSettingsSchema, validateRequest } from "@/lib/validations";

const DEFAULT_USER_ID = "default";

// GET user settings
export async function GET() {
  try {
    const [settings] = await withRetry(
      () => db.select().from(userSettings).where(eq(userSettings.userId, DEFAULT_USER_ID)),
      { operationName: "fetch user settings" }
    );

    // If no settings exist, create default settings
    if (!settings) {
      const [newSettings] = await withRetry(
        () => db.insert(userSettings).values({
          userId: DEFAULT_USER_ID,
          theme: "system",
          viewDensity: "normal",
          showTooltips: true,
          reduceMotion: false,
        }).returning(),
        { operationName: "create default settings" }
      );

      return NextResponse.json(newSettings, {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

// PUT update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(updateSettingsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const { theme, viewDensity, viewMode, showTooltips, reduceMotion } = validation.data;

    // Check if settings exist
    const [existing] = await withRetry(
      () => db.select().from(userSettings).where(eq(userSettings.userId, DEFAULT_USER_ID)),
      { operationName: "check existing settings" }
    );

    if (!existing) {
      // Create new settings
      const [newSettings] = await withRetry(
        () => db.insert(userSettings).values({
          userId: DEFAULT_USER_ID,
          theme: theme ?? "system",
          viewDensity: viewDensity ?? "normal",
          viewMode: viewMode ?? "bento",
          showTooltips: showTooltips ?? true,
          reduceMotion: reduceMotion ?? false,
        }).returning(),
        { operationName: "create user settings" }
      );

      return NextResponse.json(newSettings);
    }

    // Update existing settings
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (theme !== undefined) updateData.theme = theme;
    if (viewDensity !== undefined) updateData.viewDensity = viewDensity;
    if (viewMode !== undefined) updateData.viewMode = viewMode;
    if (showTooltips !== undefined) updateData.showTooltips = showTooltips;
    if (reduceMotion !== undefined) updateData.reduceMotion = reduceMotion;

    const [updated] = await withRetry(
      () => db.update(userSettings).set(updateData).where(eq(userSettings.userId, DEFAULT_USER_ID)).returning(),
      { operationName: "update user settings" }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
