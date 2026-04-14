import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") ?? "gpt-realtime";
  try {
    const headers = {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    };
    const payload = JSON.stringify({ model });

    let response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers,
        body: payload,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        "Realtime client_secrets rejected request, falling back to sessions:",
        errorText
      );
      response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers,
        body: payload,
      });

      if (!response.ok) {
        const fallbackErrorText = await response.text();
        console.error(
          "Error creating realtime session after fallback:",
          fallbackErrorText
        );
        return NextResponse.json(
          {
            error: "Failed to create realtime session",
            details: fallbackErrorText,
          },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
