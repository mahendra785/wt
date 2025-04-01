"use server";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repoUrl");

  if (!repoUrl) {
    return NextResponse.json(
      { error: "No repo URL provided" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoUrl}/contents`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch data from GitHub API");
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
