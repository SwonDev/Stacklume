import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

/**
 * POST /api/database/setup
 * Tests a database connection string and optionally saves it to .env.local
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString } = body;

    if (!connectionString) {
      return NextResponse.json(
        { success: false, error: "Connection string is required" },
        { status: 400 }
      );
    }

    // Validate connection string format
    if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
      return NextResponse.json(
        {
          success: false,
          error: "La cadena de conexion debe comenzar con postgresql:// o postgres://"
        },
        { status: 400 }
      );
    }

    // Test the connection
    try {
      const sql = neon(connectionString);

      // Run a simple query to test the connection
      const result = await sql`SELECT 1 as test, current_timestamp as time`;

      if (!result || result.length === 0) {
        throw new Error("No response from database");
      }

      // Connection successful - try to save to .env.local if running locally
      let savedToEnv = false;
      let envInstructions = "";

      try {
        // Only try to save if we're in development mode
        if (process.env.NODE_ENV === "development") {
          const envPath = path.join(process.cwd(), ".env.local");
          let envContent = "";

          // Read existing .env.local if it exists
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, "utf-8");
          }

          // Check if DATABASE_URL already exists
          if (envContent.includes("DATABASE_URL=")) {
            // Replace existing DATABASE_URL
            envContent = envContent.replace(
              /DATABASE_URL=.*/,
              `DATABASE_URL=${connectionString}`
            );
          } else {
            // Add DATABASE_URL
            envContent = envContent.trim() + `\n\nDATABASE_URL=${connectionString}\n`;
          }

          fs.writeFileSync(envPath, envContent, "utf-8");
          savedToEnv = true;
        }
      } catch (fsError) {
        console.warn("Could not save to .env.local:", fsError);
        // Not a fatal error - we can still provide instructions
        envInstructions = `
Para que la configuracion persista, agrega esta linea a tu archivo .env.local:

DATABASE_URL=${connectionString}

Luego reinicia el servidor de desarrollo.
        `.trim();
      }

      return NextResponse.json({
        success: true,
        message: "Conexion exitosa",
        savedToEnv,
        envInstructions: savedToEnv ? null : envInstructions,
        needsRestart: savedToEnv,
      });
    } catch (dbError) {
      console.error("Database connection test failed:", dbError);

      // Provide helpful error messages
      let errorMessage = "No se pudo conectar a la base de datos";

      if (dbError instanceof Error) {
        if (dbError.message.includes("password")) {
          errorMessage = "Contrasena incorrecta. Verifica tus credenciales.";
        } else if (dbError.message.includes("does not exist")) {
          errorMessage = "La base de datos no existe. Verifica el nombre.";
        } else if (dbError.message.includes("timeout") || dbError.message.includes("ETIMEDOUT")) {
          errorMessage = "Tiempo de espera agotado. Verifica la URL del servidor.";
        } else if (dbError.message.includes("SSL") || dbError.message.includes("certificate")) {
          errorMessage = "Error de SSL. Asegurate de incluir ?sslmode=require";
        } else if (dbError.message.includes("ENOTFOUND") || dbError.message.includes("getaddrinfo")) {
          errorMessage = "No se encontro el servidor. Verifica la URL.";
        } else {
          errorMessage = dbError.message;
        }
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in database setup:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database/setup
 * Returns current database configuration status
 */
export async function GET() {
  const hasConnection = !!process.env.DATABASE_URL;

  return NextResponse.json({
    configured: hasConnection,
    type: hasConnection ? "neon" : "none",
    mode: hasConnection ? "cloud" : "local",
  });
}
